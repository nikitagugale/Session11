// The model: a rule-based stand-in for the Claude API, so the lab needs no key and no network, and behaves the same every time.
// Lab fixture: please leave it alone. In production this file is one call to the real API (messages in, text out).
//
// How the stand-in behaves, so that you can predict it. It reads the prompt the way a careful but literal assistant would:
//
//  1. It sees two parts: `system` (the rules) and `user` (the context and the question).
//  2. If the system prompt does NOT tell it to use ONLY the context, it answers from "general knowledge": fluent, confident and
//     invented. That is the hallucination from milestone 1. It never cites anything, because nothing was given to cite.
//  3. If the system prompt says to answer ONLY from the CONTEXT, it answers only from the chunks it was given. The user message
//     must hold a line "CONTEXT:" with each chunk written as a line "[chunk_id: <id>]" followed by the chunk's text, then a line
//     "QUESTION:" followed by the question.
//  4. If the answer is not in those chunks, it replies with the "not found" sentence, which it takes from the quoted sentence in
//     your system prompt (the one that follows words like "respond exactly"). If your prompt has none, it only says "I'm not sure."
//  5. It cites a chunk only if your system prompt asks for citations, and it uses the format of your example, for example
//     "[chunk_id: plan-07]" (without an example, it uses "[chunk_id: <id>]").
//
// It is a good reader for short factual questions (a price, what a plan includes). It cannot compare plans or do arithmetic.
// It also answers about the plan whose name it finds in the question: if the question names a plan that does not exist but starts
// like one that does ("Unlimited Ultra"), it answers for the one that exists. No wording of the prompt changes that.
import { fnv1a, tokens } from './lib/text.js';

export const MODEL_NAME = 'stand-in model (rule-based, offline)';

const INVENTED_PRICES = [24.99, 27.49, 44.99, 49.99, 64.99, 74.99];
const INVENTED_GB = [8, 12, 25, 40, 60];

// Words that say what KIND of question it is, not WHAT it is about. They never count as evidence that a chunk is on topic.
const GENERIC = new Set(['plan', 'plans', 'price', 'cost', 'much', 'many', 'month', 'monthly', 'per', 'include', 'included', 'includes', 'offer', 'get', 'have', 'charge', 'charged', 'why', 'day', 'daily', 'whats', 'there', 'want', 'need', 'use', 'new', 'extra']);

const normalise = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const pick = (list, text) => list[fnv1a(normalise(text)) % list.length];
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The name of what a chunk is about: its markdown heading. */
export function headingOf(text = '') {
  return /^#{1,3}\s+(.+)$/m.exec(text)?.[1]?.trim() ?? null;
}

function parseUser(user) {
  const q = /^QUESTION:[ \t]*([\s\S]*)$/im.exec(user);
  const question = (q ? q[1] : user).trim();
  const c = /^CONTEXT:[ \t]*\n?([\s\S]*?)(?=^QUESTION:|$(?![\s\S]))/im.exec(user);
  const block = c ? c[1].trim() : '';
  const chunks = [];
  const re = /^\[chunk_id:\s*([^\]\n]+?)\s*\][ \t]*\n?([\s\S]*?)(?=^\[chunk_id:|$(?![\s\S]))/gim;
  for (const m of block.matchAll(re)) chunks.push({ id: m[1].trim(), text: m[2].trim() });
  if (!chunks.length && block) chunks.push({ id: null, text: block });
  return { question, chunks };
}

// ---------------------------------------------------------------------------------------------------------------------
// Open mode: no instruction to stay inside the context, so it fills the gap plausibly.
function openAnswer(question) {
  const named = /(?:^|\s)(?:the\s+)?((?:[A-Z][A-Za-z]*\s+)*[A-Z][A-Za-z]*)\s+plan\b/.exec(question)?.[1];
  const plan = named ? `The ${named} plan` : 'That plan';
  if (/price|cost|how much|per month|monthly|\bpay\b/i.test(question)) return `${plan} costs $${pick(INVENTED_PRICES, question)} per month.`;
  if (/\bgb\b|data|allowance/i.test(question)) return `${plan} includes ${pick(INVENTED_GB, question)} GB of data per month.`;
  return 'Yes, that is included in most of our plans, and you can change plans at any time.';
}

// ---------------------------------------------------------------------------------------------------------------------
// Grounded mode: only what is in the context.
function notFoundSentence(system) {
  const found = [...system.matchAll(/["“]([^"”]{8,}?)["”]/g)];
  for (const m of found) if (/exactly|respond|reply|say|answer|state/i.test(system.slice(Math.max(0, m.index - 90), m.index))) return m[1];
  return "I'm not sure.";
}

function citeWith(system) {
  const example = /\[\s*(chunk[_ ]?id)\s*:\s*[^\]]*\]/i.exec(system);
  if (example) return id => `[${example[1]}: ${id}]`;
  if (/cit(e|es|ed|ation|ations)\b|source|reference/i.test(system)) return id => `[chunk_id: ${id}]`;
  return null;
}

function chooseChunk(question, chunks) {
  const q = question.toLowerCase();
  // 1. A chunk whose heading is named in the question wins (the longest name, if several are named).
  const named = chunks
    .map(c => ({ c, name: headingOf(c.text) }))
    .filter(x => x.name && new RegExp(`\\b${escapeRe(x.name.toLowerCase())}\\b`).test(q))
    .sort((a, b) => b.name.length - a.name.length);
  if (named.length) return named[0].c;
  // 2. Otherwise a chunk that shares at least two specific words with the question (ties go to the first chunk, as read).
  const want = new Set(tokens(question).filter(w => !GENERIC.has(w)));
  let best = null;
  let bestScore = Math.min(2, want.size) - 1; // two shared specific words, or one if the question only has one
  for (const c of chunks) {
    const have = new Set(tokens(c.text));
    const score = [...want].filter(w => have.has(w)).length;
    if (score > bestScore) { best = c; bestScore = score; }
  }
  return best;
}

// "The Unlimited Plus plan", but "The Family Data Plan" (not "plan plan"), and "The Zone C policy".
const label = name => (/^Zone\b/i.test(name) ? `The ${name} policy` : /\bplan$/i.test(name) ? `The ${name}` : `The ${name} plan`);

function compose(question, chunk) {
  const name = headingOf(chunk.text) ?? 'that';
  const lines = chunk.text.split('\n').map(l => l.trim());
  const priced = lines.map(l => /^(Price|Daily pass|Pass price):\s*(.+)$/i.exec(l)).find(Boolean);
  // The details of a chunk: its bullets, and its "Name: value" lines (such as "Countries: ..."), but not the price line.
  const bullets = lines
    .filter(l => l.startsWith('- ') || (/^[A-Z][A-Za-z ]*:\s*\S/.test(l) && !/^(Price|Daily pass|Pass price):/i.test(l)))
    .map(l => (l.startsWith('- ') ? l.slice(2).trim() : l));
  const priceQuestion = /price|cost|how much|per month|monthly|\bpay\b/i.test(question);
  if (priceQuestion) {
    if (!priced) return null; // the price is not in this chunk
    return /^Price$/i.test(priced[1]) ? `${label(name)} costs ${priced[2]}.` : `For ${name}, the daily pass costs ${priced[2]}.`;
  }
  // The words of the plan's own name say which plan, not which detail, so they do not pick out a bullet.
  const nameWords = new Set(tokens(name));
  const want = new Set(tokens(question).filter(w => !GENERIC.has(w) && !nameWords.has(w)));
  const related = bullets.filter(b => tokens(b).some(w => want.has(w)));
  const use = (related.length ? related : bullets).slice(0, 4);
  if (!use.length) return null;
  return `${label(name)} includes: ${use.join('; ')}.`;
}

function groundedAnswer(system, question, chunks) {
  const none = notFoundSentence(system);
  const cite = citeWith(system);
  const chunk = chunks.length ? chooseChunk(question, chunks) : null;
  if (!chunk) return none;
  const body = compose(question, chunk);
  if (!body) return none;
  return cite && chunk.id ? `${body} ${cite(chunk.id)}` : body;
}

// ---------------------------------------------------------------------------------------------------------------------
/** Like a chat completion: rules in `system`, the context and the question in `user`. Returns { text }. */
export async function generate({ system = '', user = '' } = {}) {
  const { question, chunks } = parseUser(String(user));
  const groundedByRule = /\bonly\b/i.test(system) && /\bcontext\b/i.test(system);
  const text = groundedByRule ? groundedAnswer(String(system), question, chunks) : openAnswer(question);
  return { text, model: MODEL_NAME };
}

/**
 * Stands in for "one model call with a strict rubric": how well does this chunk answer the question about THIS plan?
 * Returns 0 to 10. It compares the words in the question with the words in the chunk's name (its heading), because a
 * chunk can share plenty of words with a question without being about the same plan.
 */
export function judgeRelevance(query, chunk) {
  const name = chunk.planName ?? headingOf(chunk.text) ?? '';
  const nameWords = new Set(tokens(name).filter(w => !GENERIC.has(w)));
  const queryWords = new Set(tokens(query).filter(w => !GENERIC.has(w)));
  if (!nameWords.size) return 0;
  const shared = [...nameWords].filter(w => queryWords.has(w)).length;
  const all = new Set([...nameWords, ...queryWords]).size;
  return Math.round((10 * shared) / all * 10) / 10;
}

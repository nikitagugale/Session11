// Milestone 5: the grounded prompt. Calls YOUR buildPrompt() with fixed chunks (read from the plan sheet by the check itself, not by
// your chunker), sends the result to the stand-in model, and looks at what comes back. A prompt is only as good as what the model does.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load, sheet } from '../../../checks/lib/helpers.mjs';

const { byId } = sheet();
const asChunk = id => ({ chunkId: id, planName: byId[id].name, text: byId[id].section });
const PRICE_QUESTION = "what's the price of the Unlimited Plus plan?";
let buildPrompt;
let generate;
let notFound;

const ask = async (chunks, question) => {
  const prompt = buildPrompt({ chunks, question });
  assert.ok(prompt && typeof prompt.system === 'string' && typeof prompt.user === 'string', 'buildPrompt must return { system, user }, both text');
  return (await generate({ system: prompt.system, user: prompt.user })).text;
};

test('src/prompt.js exports buildPrompt({ chunks, question }) returning { system, user }', async () => {
  ({ buildPrompt } = await load('src/prompt.js'));
  ({ generate } = await load('src/model.js'));
  ({ config: { notFound } } = await load('src/config.js'));
  assert.equal(typeof buildPrompt, 'function', 'src/prompt.js must export a function called buildPrompt');
  const p = buildPrompt({ chunks: [asChunk('plan-basic')], question: 'q?' });
  assert.equal(typeof p.system, 'string');
  assert.equal(typeof p.user, 'string');
});

test('the user message has a CONTEXT: line, every chunk behind its [chunk_id: ...] line, and a QUESTION: line', () => {
  const chunks = ['plan-unlimited-plus', 'plan-unlimited'].map(asChunk);
  const { user } = buildPrompt({ chunks, question: PRICE_QUESTION });
  assert.match(user, /^CONTEXT:/m, 'the user message needs a line that starts with CONTEXT:');
  assert.match(user, /^QUESTION:/m, 'the user message needs a line that starts with QUESTION:');
  for (const c of chunks) {
    assert.ok(user.includes(`[chunk_id: ${c.chunkId}]`), `the context must show each chunk behind a line like [chunk_id: ${c.chunkId}]`);
    assert.ok(user.includes(c.text), `the context is missing the text of ${c.chunkId}`);
  }
  assert.ok(user.includes(PRICE_QUESTION), 'the question must appear in the user message exactly as it was asked');
});

test('with the answer in the context, the model answers from it and cites the chunk', async () => {
  const text = await ask(['plan-unlimited-plus', 'plan-unlimited', 'plan-unlimited-max'].map(asChunk), PRICE_QUESTION);
  assert.ok(text.includes('$39.99'), `with the right chunk in the context the answer should say the price. It said: ${text}`);
  assert.ok(!text.includes('$29.99') && !text.includes('$54.99'), `the answer mixes in the price of a different plan: ${text}`);
  assert.match(text, /\[[^\]]*plan-unlimited-plus[^\]]*\]/, `the answer should cite the chunk it used, in brackets, with its chunk id. It said: ${text}`);
  assert.ok(!/plan-unlimited-max|plan-unlimited\]/.test(text.replace(/plan-unlimited-plus/g, '')), `the answer cites a chunk it did not use: ${text}`);
});

test('with the answer NOT in the context, it says the exact not-found sentence', async () => {
  const text = await ask(['plan-basic', 'plan-standard', 'plan-unlimited'].map(asChunk), 'what does the platinum max plan cost?');
  assert.equal(text, notFound, `the answer is not in the context, so the bot must say the not-found sentence exactly (it is on the card). It said: ${text}`);
});

test('with an empty context it does not make something up', async () => {
  const text = await ask([], PRICE_QUESTION);
  assert.equal(text, notFound, `with nothing in the context, the model still answered: ${text}. Does your system prompt tell it to use ONLY the context?`);
});

test('a question about something the plan sheet never covers gets the not-found sentence', async () => {
  const text = await ask(['plan-family-data-plan', 'plan-standard', 'plan-basic'].map(asChunk), 'why was I charged $40 extra this month');
  assert.equal(text, notFound, `an account question is outside the plan sheet, but the bot said: ${text}`);
});

test('it works for a different plan too, so it is not tuned to one question', async () => {
  const text = await ask(['plan-prepaid-daily-pass', 'plan-basic'].map(asChunk), 'what does the Prepaid Daily Pass cost?');
  assert.ok(text.includes('$1.99'), `the answer should say the daily price. It said: ${text}`);
  assert.match(text, /\[[^\]]*plan-prepaid-daily-pass[^\]]*\]/, `the answer should cite plan-prepaid-daily-pass. It said: ${text}`);
});

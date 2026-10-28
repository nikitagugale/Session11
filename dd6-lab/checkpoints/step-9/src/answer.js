// Reference solution, milestone 6: a grounded answer.
//   question -> retrieve -> prompt -> model -> the answer, with checkable citations.
// A citation is kept only if that chunk really was retrieved: an id the model made up is dropped, not passed on.
import { config } from './config.js';
import { generate } from './model.js';
import { buildPrompt } from './prompt.js';
import { retrieve } from './retrieve.js';

export async function answer(pg, question, { model = { generate }, k = config.defaultK } = {}) {
  const retrieved = await retrieve(pg, question, { k });
  const { system, user } = buildPrompt({ chunks: retrieved, question });
  const { text } = await model.generate({ system, user });

  const known = new Map(retrieved.map(c => [c.chunkId, c]));
  const cited = [...text.matchAll(/\[chunk_id:\s*([^\]\s]+)\s*\]/g)].map(m => m[1]);
  const citations = [...new Set(cited)].filter(id => known.has(id));
  const sources = citations.map(id => ({ chunkId: id, snippet: known.get(id).text }));
  return { answer: text, citations, sources, retrieved };
}

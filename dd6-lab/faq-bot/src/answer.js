// answer(pg, question, { model, k }) retrieves the best chunks, asks the model to answer only from them, and returns
// { answer, citations, sources, retrieved }:
//   answer     the text the customer sees
//   citations  the chunk ids the answer relies on, only ids that were really retrieved
//   sources    for each citation, { chunkId, snippet }: what a person needs to check it
//   retrieved  the chunks that were retrieved
import { config } from './config.js';
import { generate } from './model.js';
import { buildPrompt } from './prompt.js';
import { retrieve } from './retrieve.js';

export async function answer(pg, question, { model = { generate }, k = config.defaultK } = {}) {
  const retrieved = await retrieve(pg, question, { k });
  const { text } = await model.generate(buildPrompt({ chunks: retrieved, question }));

  // Trust only ids that were really given to the model, once each, in the order they were cited.
  const byId = new Map(retrieved.map(c => [c.chunkId, c]));
  const cited = [...text.matchAll(/\[chunk_id:\s*([^\]\s]+)\s*\]/g)].map(m => m[1]);
  const citations = text.trim() === config.notFound ? [] : [...new Set(cited)].filter(id => byId.has(id));
  const sources = citations.map(id => ({ chunkId: id, snippet: byId.get(id).text }));
  return { answer: text, citations, sources, retrieved };
}

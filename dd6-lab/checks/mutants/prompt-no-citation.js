// A deliberately broken prompt for the milestone 7 check: it stays inside the context and has a not-found sentence, but it never asks
// for a citation, so no answer can be checked against the plan sheet. Same file name and exports as src/prompt.js.
import { config } from './config.js';

export function buildPrompt({ chunks, question }) {
  const context = chunks.map(c => `[chunk_id: ${c.chunkId}]\n${c.text}`).join('\n\n');
  return {
    system: `Answer the customer's question using ONLY the CONTEXT below. If the answer is not in the CONTEXT, respond exactly: "${config.notFound}"`,
    user: `CONTEXT:\n${context}\n\nQUESTION: ${question}`,
  };
}

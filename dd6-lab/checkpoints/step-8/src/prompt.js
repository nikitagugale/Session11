// Reference solution, milestone 5: the grounded prompt.
//
// Three rules, in the system prompt: use ONLY the context, cite the chunk id for every fact, and say one fixed sentence when the
// answer is not there. The context lists every chunk behind its id, so the model can cite what it used.
import { config } from './config.js';

export const SYSTEM_PROMPT = `Answer the customer's question using ONLY the CONTEXT below. Cite the chunk_id of every plan you rely on, in brackets, for example [chunk_id: plan-07]. If the answer is not in the CONTEXT, respond exactly: "${config.notFound}"`;

export function buildPrompt({ chunks, question }) {
  const context = chunks.map(c => `[chunk_id: ${c.chunkId}]\n${c.text}`).join('\n\n');
  return { system: SYSTEM_PROMPT, user: `CONTEXT:\n${context}\n\nQUESTION: ${question}` };
}

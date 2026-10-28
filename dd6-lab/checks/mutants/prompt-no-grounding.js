// A deliberately broken prompt for the milestone 7 check: it shows the model the context, but never says to use ONLY the context.
// So the model "helps" from general knowledge whenever it likes. Same file name and exports as src/prompt.js.
export function buildPrompt({ chunks, question }) {
  const context = chunks.map(c => `[chunk_id: ${c.chunkId}]\n${c.text}`).join('\n\n');
  return {
    system: 'You are a helpful assistant for a mobile phone company. Use the context to help answer the customer.',
    user: `CONTEXT:\n${context}\n\nQUESTION: ${question}`,
  };
}

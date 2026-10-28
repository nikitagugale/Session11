// A deliberately broken chunker for the milestone 7 check: fixed-size pieces of 90 characters, so almost every plan is cut in two.
// Same file name and export as src/chunk.js, so it can be swapped in. Plan ids are made up from the position, as a naive chunker would.
export function chunkPlans(markdown) {
  const chunks = [];
  for (let start = 0, n = 1; start < markdown.length; start += 90, n += 1) {
    const text = markdown.slice(start, start + 90).trim();
    if (text) chunks.push({ chunkId: `chunk-${String(n).padStart(2, '0')}`, planName: 'unknown', text });
  }
  return chunks;
}

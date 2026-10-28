// STARTER CODE. It runs, and it is not good enough: run `npm run chunks` to see what it does to the plan sheet.
// Milestone 2 asks you to replace it. Keep the file name and the export, because the lab's checks and your later milestones use them.
//
// chunkPlans(markdown) takes the text of data/plan-docs.md and returns an array of { chunkId, planName, text }.

const SIZE = 250; // characters per chunk

export function chunkPlans(markdown) {
  const chunks = [];
  for (let start = 0, n = 1; start < markdown.length; start += SIZE, n += 1) {
    const text = markdown.slice(start, start + SIZE).trim();
    if (text) chunks.push({ chunkId: `chunk-${String(n).padStart(2, '0')}`, planName: 'unknown', text });
  }
  return chunks;
}

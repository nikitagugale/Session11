// The milestones, in one place: the lab runner, `npm run hint`, `npm run progress` and `npm run help` all read this.
// `hintMinutes` are the times (minutes after you start the milestone) when each hint opens. They are a nudge, not a lock.
// `targetMinutes` is the pace to aim for. Milestones 1 to 4 are one block of work, and 5 to 8 are another.
export const MILESTONES = [
  { n: 1, title: 'Reproduce the hallucination', check: 'the invented answer, kept exactly, with the facts that show it is invented', hintMinutes: [3, 5, 7], targetMinutes: 8, block: 'A' },
  { n: 2, title: 'Chunk the plan sheet', check: 'one chunk per plan, with the name, the price and the features together', hintMinutes: [4, 7, 10], targetMinutes: 10, block: 'A' },
  { n: 3, title: 'Build the ingestion pipeline', check: 'chunks, embeddings and a last-ingested time in the database, safe to run again', hintMinutes: [5, 9, 12], targetMinutes: 13, block: 'A' },
  { n: 4, title: 'Write and test retrieval', check: 'top-k chunks by cosine similarity, best first', hintMinutes: [5, 8, 11], targetMinutes: 13, block: 'A' },
  { n: 5, title: 'Write the grounded prompt', check: 'answers only from the context, cites the chunk, and says not found when it must', hintMinutes: [3, 5, 7], targetMinutes: 8, block: 'B' },
  { n: 6, title: 'Re-run the original bug', check: 'the Unlimited Plus question now returns the real price with a citation you can check', hintMinutes: [3, 5, 7], targetMinutes: 8, block: 'B' },
  { n: 7, title: 'Add fixture tests', check: 'ten question and answer pairs that really can fail', hintMinutes: [5, 9, 13], targetMinutes: 14, block: 'B' },
  { n: 8, title: 'Add a staleness check', check: 'a stale plan sheet cannot ship silently', hintMinutes: [3, 5, 7], targetMinutes: 7, block: 'B' },
  { n: 9, title: 'Homework: a second document type', check: 'the roaming policy answers questions, with citations, next to the plans', hintMinutes: [10, 20, 30], targetMinutes: 60, block: 'homework' },
];

export const titleOf = n => MILESTONES.find(m => m.n === Number(n))?.title ?? `Milestone ${n}`;

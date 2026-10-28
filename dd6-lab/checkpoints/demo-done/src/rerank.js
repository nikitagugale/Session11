// The demo's result: a lightweight rerank step after the first retrieval.
// Retrieval is fast and rough: it finds chunks that SHARE WORDS with the question. The judge looks at one thing, whether the chunk
// is about the plan the question names, and gives each candidate a score from 0 to 10. We reorder by that score. Ties keep their
// retrieval order. In production the judge is one model call per candidate with a strict rubric; here it is judgeRelevance().
import { judgeRelevance } from './model.js';

export function rerank(question, chunks) {
  return chunks
    .map((chunk, position) => ({ chunk, position, relevance: judgeRelevance(question, chunk) }))
    .sort((a, b) => b.relevance - a.relevance || a.position - b.position)
    .map(({ chunk, relevance }) => ({ ...chunk, relevance }));
}

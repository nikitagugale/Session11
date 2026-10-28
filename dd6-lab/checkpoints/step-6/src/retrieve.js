// Reference solution, milestone 4: the k chunks closest to the question, best first.
//
// `<=>` is pgvector's cosine DISTANCE (0 means identical), so the closest chunks have the smallest distance. We return the
// SIMILARITY (1 minus the distance) as the score, so that a bigger score means a better match, which is what people expect.
import { embed, toPgVector } from './lib/embed.js';

export async function retrieve(pg, question, { k = 5 } = {}) {
  const vector = toPgVector(embed(question));
  const { rows } = await pg.query(
    `SELECT chunk_id, plan_name, text, 1 - (embedding <=> $1::vector) AS score
       FROM plan_chunks
      ORDER BY embedding <=> $1::vector
      LIMIT $2`,
    [vector, k],
  );
  return rows.map(r => ({ chunkId: r.chunk_id, planName: r.plan_name, text: r.text, score: Number(r.score) }));
}

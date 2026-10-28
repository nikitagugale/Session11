// retrieve(pg, question, { k }) returns the k chunks closest to the question, best first.
import { embed, toPgVector } from './lib/embed.js';

export async function retrieve(pg, question, { k = 5 } = {}) {
  const { rows } = await pg.query(
    `SELECT chunk_id, plan_name, text, 1 - (embedding <=> $1::vector) AS score
     FROM plan_chunks
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [toPgVector(embed(String(question))), k],
  );
  return rows.map(r => ({ chunkId: r.chunk_id, planName: r.plan_name, text: r.text, score: Number(r.score) }));
}

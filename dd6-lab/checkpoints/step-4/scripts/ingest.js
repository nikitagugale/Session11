// Reference solution, milestone 3: fill the database from the plan sheet.
//   plan sheet -> chunkPlans -> embed -> plan_chunks (upsert), remove chunks of plans that are gone, record the time.
// Safe to run again: a changed plan is updated, a removed plan is deleted, nothing is duplicated.
import { readFileSync } from 'node:fs';
import { chunkPlans } from '../src/chunk.js';
import { config } from '../src/config.js';
import { openDb } from '../src/db.js';
import { embed, toPgVector } from '../src/lib/embed.js';

const chunks = chunkPlans(readFileSync(config.planDocs, 'utf8'));
const { pg, close } = await openDb();
try {
  for (const c of chunks) {
    await pg.query(
      `INSERT INTO plan_chunks (chunk_id, plan_name, text, embedding) VALUES ($1, $2, $3, $4::vector)
       ON CONFLICT (chunk_id) DO UPDATE SET plan_name = EXCLUDED.plan_name, text = EXCLUDED.text, embedding = EXCLUDED.embedding`,
      [c.chunkId, c.planName, c.text, toPgVector(embed(c.text))],
    );
  }
  await pg.query('DELETE FROM plan_chunks WHERE chunk_id <> ALL($1::text[])', [chunks.map(c => c.chunkId)]);
  await pg.query(
    `INSERT INTO ingest_meta (key, value) VALUES ('last_ingested_at', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [new Date().toISOString()],
  );
  console.log(`Ingested ${chunks.length} chunks from ${config.planDocs}`);
} finally {
  await close();
}

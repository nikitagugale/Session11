// Reference solution, milestone 9: ingest every document type in one run.
// Plans and roaming zones go into the same table. The clean-up step removes chunks that are no longer in ANY document, so
// ingesting the roaming policy cannot delete the plans, and the other way round.
import { existsSync, readFileSync } from 'node:fs';
import { chunkPlans } from '../src/chunk.js';
import { config } from '../src/config.js';
import { openDb } from '../src/db.js';
import { embed, toPgVector } from '../src/lib/embed.js';
import { chunkSections } from '../src/sections.js';

const chunks = chunkPlans(readFileSync(config.planDocs, 'utf8'));
if (existsSync(config.roamingDocs)) chunks.push(...chunkSections(readFileSync(config.roamingDocs, 'utf8'), 'roaming'));

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
  console.log(`Ingested ${chunks.length} chunks.`);
} finally {
  await close();
}

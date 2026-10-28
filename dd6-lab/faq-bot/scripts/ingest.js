// `npm run ingest` reads the plan sheet, chunks it, embeds every chunk and syncs the database to match:
// new plans are added, changed plans are updated (with a new embedding), removed plans are deleted. Safe to run again and again.
import { readFileSync } from 'node:fs';
import { config } from '../src/config.js';
import { openDb } from '../src/db.js';
import { chunkPlans } from '../src/chunk.js';
import { embed, toPgVector } from '../src/lib/embed.js';

const { pg, close } = await openDb();
try {
  const chunks = chunkPlans(readFileSync(config.planDocs, 'utf8'));
  const existing = new Map((await pg.query('SELECT chunk_id, text FROM plan_chunks')).rows.map(r => [r.chunk_id, r.text]));

  let added = 0;
  let updated = 0;
  await pg.query('BEGIN');
  try {
    for (const c of chunks) {
      if (existing.get(c.chunkId) === c.text) continue; // unchanged: keep the row and its embedding
      await pg.query(
        `INSERT INTO plan_chunks (chunk_id, plan_name, text, embedding) VALUES ($1, $2, $3, $4::vector)
         ON CONFLICT (chunk_id) DO UPDATE SET plan_name = EXCLUDED.plan_name, text = EXCLUDED.text, embedding = EXCLUDED.embedding`,
        [c.chunkId, c.planName, c.text, toPgVector(embed(c.text))],
      );
      if (existing.has(c.chunkId)) updated += 1;
      else added += 1;
    }
    const keep = chunks.map(c => c.chunkId);
    const removed = (await pg.query('DELETE FROM plan_chunks WHERE NOT (chunk_id = ANY($1::text[])) RETURNING chunk_id', [keep])).rows.length;
    await pg.query(
      `INSERT INTO ingest_meta (key, value) VALUES ('last_ingested_at', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [new Date().toISOString()],
    );
    await pg.query('COMMIT');
    console.log(`Ingested ${chunks.length} chunks: ${added} added, ${updated} updated, ${removed} removed.`);
  } catch (e) {
    await pg.query('ROLLBACK');
    throw e;
  }
} catch (e) {
  console.error(`Ingest failed: ${e.message}`);
  process.exitCode = 1;
} finally {
  await close();
}

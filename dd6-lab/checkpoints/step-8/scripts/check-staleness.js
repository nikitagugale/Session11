// Reference solution, milestone 8: has the plan sheet changed since it was last ingested?
//   node scripts/check-staleness.js     (wired as `predeploy`, so `npm run deploy` stops here if the corpus is stale)
// It compares the sheet's modified time with the last_ingested_at row that ingest writes. Exit 0 means fresh, 1 means stale.
import { statSync } from 'node:fs';
import { config } from '../src/config.js';
import { openDb } from '../src/db.js';

const { pg, close } = await openDb();
try {
  const row = (await pg.query("SELECT value FROM ingest_meta WHERE key = 'last_ingested_at'")).rows[0];
  if (!row) {
    console.error('STALE: nothing has been ingested yet. Run: npm run ingest');
    process.exitCode = 1;
  } else {
    const ingestedAt = Date.parse(row.value);
    const modifiedAt = statSync(config.planDocs).mtimeMs;
    if (modifiedAt > ingestedAt) {
      console.error(`STALE: the plan sheet changed at ${new Date(modifiedAt).toISOString()}, after the last ingest at ${row.value}. Run: npm run ingest`);
      process.exitCode = 1;
    } else {
      console.log(`OK: the plan sheet has not changed since the last ingest (${row.value}).`);
    }
  }
} catch (e) {
  console.error(`STALE: could not read when the corpus was last ingested (${e.message}). Run: npm run ingest`);
  process.exitCode = 1;
} finally {
  await close();
}

// Reference solution, milestone 9: has ANY document changed since it was last ingested?
//   node scripts/check-staleness.js     (wired as `predeploy`, so `npm run deploy` stops here if the corpus is stale)
// Same check as milestone 8, now for both documents: the plan sheet and the roaming policy. The newest of the two is compared with
// the last_ingested_at row that ingest writes. Exit 0 means fresh, 1 means stale.
import { existsSync, statSync } from 'node:fs';
import { config } from '../src/config.js';
import { openDb } from '../src/db.js';

const documents = [config.planDocs, config.roamingDocs].filter(file => existsSync(file));

const { pg, close } = await openDb();
try {
  const row = (await pg.query("SELECT value FROM ingest_meta WHERE key = 'last_ingested_at'")).rows[0];
  if (!row) {
    console.error('STALE: nothing has been ingested yet. Run: npm run ingest');
    process.exitCode = 1;
  } else {
    const ingestedAt = Date.parse(row.value);
    const changed = documents.map(file => ({ file, modifiedAt: statSync(file).mtimeMs })).filter(d => d.modifiedAt > ingestedAt);
    if (changed.length) {
      const names = changed.map(d => d.file.split(/[\\/]/).pop()).join(' and ');
      console.error(`STALE: ${names} changed after the last ingest at ${row.value}. The bot would answer from old text. Run: npm run ingest`);
      process.exitCode = 1;
    } else {
      console.log(`OK: no document has changed since the last ingest (${row.value}).`);
    }
  }
} catch (e) {
  console.error(`STALE: could not read when the corpus was last ingested (${e.message}). Run: npm run ingest`);
  process.exitCode = 1;
} finally {
  await close();
}

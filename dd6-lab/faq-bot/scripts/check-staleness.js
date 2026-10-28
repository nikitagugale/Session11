// `npm run predeploy` / `node scripts/check-staleness.js`: fails when the plan sheet is newer than the last ingest.
// Read-only: it only compares two times.
import { statSync } from 'node:fs';
import { config } from '../src/config.js';
import { withDb } from '../src/db.js';

const sheetModified = statSync(config.planDocs).mtime;

const lastIngested = await withDb(async pg => {
  try {
    const { rows } = await pg.query("SELECT value FROM ingest_meta WHERE key = 'last_ingested_at'");
    return rows[0] ? new Date(rows[0].value) : null;
  } catch {
    return null; // the table does not exist yet: nothing has been ingested
  }
});

if (!lastIngested || Number.isNaN(lastIngested.getTime())) {
  console.error('STALE: nothing has been ingested yet. Run  npm run ingest  and try again.');
  process.exitCode = 1;
} else if (sheetModified > lastIngested) {
  console.error(`STALE: the plan sheet changed (${sheetModified.toISOString()}) after the last ingest (${lastIngested.toISOString()}). Run  npm run ingest  and try again.`);
  process.exitCode = 1;
} else {
  console.log(`OK: the corpus is current (last ingest ${lastIngested.toISOString()}, plan sheet last changed ${sheetModified.toISOString()}).`);
}

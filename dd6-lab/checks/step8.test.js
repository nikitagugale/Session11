// Milestone 8: the staleness check. Runs YOUR scripts/check-staleness.js against a scratch database and a scratch copy of the plan
// sheet, in four situations: freshly ingested, changed since, ingested again, and never ingested. Then it runs `npm run deploy`
// to see whether a stale corpus really cannot ship.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, readFileSync, utimesSync } from 'node:fs';
import path from 'node:path';
import { APP, cleanup, ingest, npmRun, run, scratch, withDb } from '../../../checks/lib/helpers.mjs';

const dir = scratch();
const dataDir = path.join(dir, 'pg');
const sheetCopy = path.join(dir, 'plans.md');
copyFileSync(path.join(APP, 'data', 'plan-docs.md'), sheetCopy);
const env = { FAQ_DATA_DIR: dataDir, PLAN_DOCS: sheetCopy };
after(cleanup);

const check = (e = env) => run('scripts/check-staleness.js', { env: e });
const lastIngest = () => withDb(dataDir, pg => pg.query("SELECT value FROM ingest_meta WHERE key = 'last_ingested_at'").then(r => Date.parse(r.rows[0].value)));
const setSheetTime = ms => utimesSync(sheetCopy, new Date(ms), new Date(ms));

test('right after an ingest, the check passes (exit 0) and says so', async () => {
  const first = ingest(env);
  assert.equal(first.status, 0, `ingest failed, so the check could not run (milestone 3):\n${first.out.split('\n').filter(Boolean).slice(-4).join('\n')}`);
  setSheetTime(Date.now() - 60000); // the sheet was last edited a minute ago, before the ingest
  const r = check();
  assert.ok(!r.timedOut, 'scripts/check-staleness.js did not finish');
  assert.equal(r.status, 0, `the sheet has not changed since the ingest, but the check exits ${r.status}:\n${r.out.trim().slice(0, 400)}`);
  assert.ok(r.out.trim().length > 0, 'the check should print a short message even when everything is fine');
});

test('when the sheet changes after the ingest, the check fails (non-zero) with a clear message that says what to do', async () => {
  const ingested = await lastIngest();
  setSheetTime(ingested + 30000); // edited after the last ingest
  const r = check();
  assert.notEqual(r.status, 0, 'the sheet is newer than the last ingest, but the check exits 0. It must exit non-zero.');
  assert.match(r.out, /stale|out of date|changed|newer/i, `the message should say the corpus is stale. It printed: ${r.out.trim().slice(0, 300) || 'nothing'}`);
  assert.match(r.out, /ingest/i, 'the message should say how to fix it: run the ingest again');
});

test('after the next ingest it passes again', () => {
  setSheetTime(Date.now() - 60000); // changed a minute ago...
  const again = ingest(env); // ...and now it has been ingested since
  assert.equal(again.status, 0);
  const r = check();
  assert.equal(r.status, 0, `after re-ingesting, the check should pass again, but exits ${r.status}:\n${r.out.trim().slice(0, 300)}`);
});

test('a corpus that was never ingested is stale too', () => {
  const r = check({ ...env, FAQ_DATA_DIR: path.join(dir, 'never-ingested') });
  assert.notEqual(r.status, 0, 'with nothing ingested the check should fail (exit non-zero), because there is no corpus to be fresh');
  assert.ok(r.out.trim().length > 0, 'say something useful when nothing has been ingested yet');
});

test('package.json wires it as "predeploy", so `npm run deploy` stops when the corpus is stale', async () => {
  const pkg = JSON.parse(readFileSync(path.join(APP, 'package.json'), 'utf8'));
  assert.ok(pkg.scripts?.predeploy && /check-staleness/.test(pkg.scripts.predeploy), 'add a "predeploy" script to package.json that runs scripts/check-staleness.js (npm runs predeploy before deploy, and stops if it fails)');
  assert.ok(pkg.scripts?.deploy, 'the "deploy" script from the starter is missing from package.json');

  const ingested = await lastIngest();
  setSheetTime(ingested + 30000);
  const stale = npmRun('deploy', { env });
  assert.notEqual(stale.status, 0, '`npm run deploy` still succeeded with a stale corpus. Is predeploy wired in package.json?');
  assert.ok(!/DEPLOYED/.test(stale.out), 'the deploy ran even though the corpus was stale');

  setSheetTime(Date.now() - 60000);
  assert.equal(ingest(env).status, 0);
  const fresh = npmRun('deploy', { env });
  assert.equal(fresh.status, 0, `with a fresh corpus \`npm run deploy\` should go ahead, but failed:\n${fresh.out.trim().slice(0, 300)}`);
  assert.match(fresh.out, /DEPLOYED/, 'with a fresh corpus the deploy should run');
});

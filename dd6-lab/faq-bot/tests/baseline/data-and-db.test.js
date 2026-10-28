// The plan sheet, the roaming policy and the database wrapper: the fixtures every milestone leans on.
// Do not edit: your own tests go in tests/learner/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { ROOT, config } from '../../src/config.js';
import { openDb, withDb } from '../../src/db.js';

const sheet = readFileSync(config.planDocs, 'utf8');
const roaming = readFileSync(config.roamingDocs, 'utf8');

test('the plan sheet has 12 plans, each with a price line', () => {
  const sections = sheet.split(/^(?=## )/m).filter(s => s.startsWith('## '));
  assert.equal(sections.length, 12);
  for (const s of sections) assert.match(s, /^Price: \$[\d.]+/m, `no price line in: ${s.split('\n')[0]}`);
});

test('the made-up prices the stand-in model uses are not in the plan sheet', () => {
  for (const price of ['24.99', '27.49', '44.99', '49.99', '64.99', '74.99']) assert.ok(!sheet.includes(`$${price}`), `$${price} is in the sheet, so a made-up price could be real`);
});

test('the roaming policy (for the homework) has 4 zones and a rules section', () => {
  assert.equal((roaming.match(/^## /gm) ?? []).length, 5);
  assert.equal((roaming.match(/^Daily pass: \$/gm) ?? []).length, 4);
});

test('the database starts in memory with pgvector working', async () => {
  const { pg, close } = await openDb({ dataDir: 'memory://' });
  try {
    const { rows } = await pg.query("SELECT '[1,0,0]'::vector <=> '[0,1,0]'::vector AS distance");
    assert.equal(Number(rows[0].distance), 1);
    assert.ok((await pg.query('SELECT 1 FROM schema_migrations LIMIT 1').then(() => true)));
  } finally {
    await close();
  }
});

test('closing the database keeps the exit code a script has set (PGlite would reset it to 0)', () => {
  const code = "import { openDb } from './src/db.js'; const db = await openDb({ dataDir: 'memory://' }); process.exitCode = 3; await db.close();";
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', code], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(r.status, 3, r.stderr);
});

test('withDb opens the database, runs your function, and closes it again, even after an error', async () => {
  assert.equal(await withDb(async pg => (await pg.query('SELECT 41 + 1 AS n')).rows[0].n, { dataDir: 'memory://' }), 42);
  await assert.rejects(withDb(async () => { throw new Error('boom'); }, { dataDir: 'memory://' }), /boom/);
});

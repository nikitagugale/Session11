// Milestone 4: retrieval. Fills a scratch database with YOUR ingest script, then calls YOUR retrieve() on it with real questions.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { cleanup, ingest, load, scratch, sheet } from '../../../checks/lib/helpers.mjs';

const dir = scratch();
const dataDir = path.join(dir, 'pg');
const { plans } = sheet();
let db;
let retrieve;
let total = plans.length;

before(async () => {
  const run = ingest({ FAQ_DATA_DIR: dataDir });
  assert.equal(run.status, 0, `this check fills a scratch database with your scripts/ingest.js first, and that failed (milestone 3):\n${run.out.split('\n').filter(Boolean).slice(-5).join('\n')}`);
  const { openDb } = await load('src/db.js');
  db = await openDb({ dataDir });
  // After the homework the table also holds roaming sections. They are valid results; only the plan rows are counted against the sheet.
  const n = Number((await db.pg.query("SELECT count(*)::int AS n FROM plan_chunks WHERE chunk_id NOT LIKE 'roaming-%'")).rows[0].n);
  assert.equal(n, plans.length, `after ingest the table holds ${n} plan rows, expected ${plans.length} (milestone 3)`);
  total = Number((await db.pg.query('SELECT count(*)::int AS n FROM plan_chunks')).rows[0].n);
  ({ retrieve } = await load('src/retrieve.js'));
});
after(async () => { await db?.close(); cleanup(); });

const ids = rows => rows.map(r => r.chunkId);

test('retrieve(pg, question, { k }) returns k rows, and all of them when k is bigger than the table', async () => {
  for (const [k, want] of [[undefined, 5], [3, 3], [1, 1], [50, total]]) {
    const rows = await retrieve(db.pg, 'what does the student saver include', k === undefined ? {} : { k });
    assert.ok(Array.isArray(rows), 'retrieve must return an array');
    assert.equal(rows.length, want, `retrieve returned ${rows.length} rows${k === undefined ? ' by default' : ` for k = ${k}`}, but the table holds ${total} and it should have returned ${want}. Something between your query and the table is hiding rows. (This check builds its own fresh database from your migrations/ folder, so a fix made by hand in your own database will not change this result.)`);
  }
});

test('each result is { chunkId, planName, text, score }, with the chunk\'s own text', async () => {
  const rows = await retrieve(db.pg, 'what does the student saver include', { k: 5 });
  for (const r of rows) {
    assert.equal(typeof r.chunkId, 'string', 'every result needs a chunkId (text)');
    assert.equal(typeof r.planName, 'string', 'every result needs a planName (text)');
    assert.equal(typeof r.text, 'string', 'every result needs the chunk text');
    assert.equal(typeof r.score, 'number', 'every result needs a score that is a number');
    if (/^roaming-/.test(r.chunkId)) continue; // a roaming section, from the homework: valid
    const plan = plans.find(p => p.id === r.chunkId);
    assert.ok(plan, `${r.chunkId} is not a plan in the sheet`);
    assert.ok(r.text.includes(plan.priceLine), `the text returned for ${r.chunkId} is not that plan's chunk`);
  }
});

test('best first: the scores go from high to low', async () => {
  const rows = await retrieve(db.pg, 'is there a plan for tablets', { k: 5 });
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].score >= rows[i].score, `result ${i + 1} scores higher than result ${i}: the best match must come first`);
});

test('the score is a similarity (higher is better), not a distance', async () => {
  const rows = await retrieve(db.pg, plans.find(p => p.id === 'plan-basic').section, { k: 3 });
  assert.equal(rows[0].chunkId, 'plan-basic', 'asking with a chunk\'s own text should bring that chunk back first');
  assert.ok(rows[0].score > 0.99, `the best match for a chunk's own text scores ${rows[0].score.toFixed(3)}. A perfect match should score about 1 (similarity). pgvector's <=> gives a distance, where 0 is perfect.`);
});

for (const [question, wanted, within] of [
  ["what's the price of the Unlimited Plus plan?", 'plan-unlimited-plus', 3],
  ['how many GB does the student saver include', 'plan-student-saver', 1],
  ['is there a plan for tablets', 'plan-tablet-data-plan', 1],
  ["what's included in the basic plan", 'plan-basic', 3],
  ['what does the prepaid daily pass cost', 'plan-prepaid-daily-pass', 1],
  ['family data plan', 'plan-family-data-plan', 3],
]) {
  test(`"${question}" finds ${wanted} in the top ${within}`, async () => {
    // After the homework the table also holds roaming sections. "Daily pass" is in every zone, and the rules mention Prepaid Daily Pass, so a
    // roaming chunk can fairly rank above the plan. Then the plan only has to be among the 5 chunks that answer() would retrieve. Before the
    // homework the limits are tight.
    const room = total > plans.length ? 5 : within;
    const rows = await retrieve(db.pg, question, { k: 5 });
    assert.ok(ids(rows).slice(0, room).includes(wanted), `for "${question}" the top ${room} were ${ids(rows).slice(0, room).join(', ')}. Run: npm run retrieve -- "${question}"`);
  });
}

test('retrieving does not change the table', async () => {
  const before = (await db.pg.query('SELECT count(*)::int AS n FROM plan_chunks')).rows[0].n;
  await retrieve(db.pg, 'family data plan', { k: 5 });
  assert.equal((await db.pg.query('SELECT count(*)::int AS n FROM plan_chunks')).rows[0].n, before);
});

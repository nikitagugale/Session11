// Milestone 9 (homework): a second document type. Runs YOUR `node scripts/ingest.js` on a scratch database with both documents there,
// and then asks YOUR answer() questions that need the roaming policy, and a question that needs the plan sheet, to check nothing broke.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { cleanup, ingest, load, scratch, slug } from '../../../checks/lib/helpers.mjs';

const dir = scratch();
const dataDir = path.join(dir, 'pg');
const ZONES = ['Zone A: Neighbouring countries', 'Zone B: Gulf and Middle East', 'Zone C: Asia-Pacific', 'Zone D: Europe and Americas', 'Rules for all zones'];
let db;
let answer;
let notFound;

before(async () => {
  const run = ingest({ FAQ_DATA_DIR: dataDir });
  assert.equal(run.status, 0, `ingest failed:\n${run.out.split('\n').filter(Boolean).slice(-5).join('\n')}`);
  const { openDb } = await load('src/db.js');
  db = await openDb({ dataDir });
  ({ answer } = await load('src/answer.js'));
  ({ config: { notFound } } = await load('src/config.js'));
});
after(async () => { await db?.close(); cleanup(); });

test('the table holds the 12 plans and the 5 roaming sections, each as one chunk', async () => {
  const rows = (await db.pg.query('SELECT chunk_id, text FROM plan_chunks ORDER BY chunk_id')).rows;
  assert.equal(rows.length, 17, `plan_chunks holds ${rows.length} rows: expected 12 plans and 5 roaming sections (4 zones and the rules). Does one run of ingest handle both documents?`);
  for (const heading of ZONES) {
    const id = `roaming-${slug(heading)}`;
    const row = rows.find(r => r.chunk_id === id);
    assert.ok(row, `there is no chunk with the id ${id}: roaming chunks are "roaming-" and the heading in lower case with dashes`);
    assert.ok(row.text.includes(`## ${heading}`), `the chunk ${id} has lost its heading`);
  }
  const zoneC = rows.find(r => r.chunk_id === 'roaming-zone-c-asia-pacific').text;
  assert.ok(zoneC.includes('Daily pass: $9 per day') && zoneC.includes('Japan'), 'the Asia-Pacific chunk must keep its countries and its daily pass price together');
});

test('"do you offer international roaming in Japan?" is answered from the roaming policy, with a citation', async () => {
  const r = await answer(db.pg, 'do you offer international roaming in Japan?');
  assert.notEqual(r.answer, notFound, 'this was a not-found before the homework. With the roaming policy ingested it has an answer.');
  assert.ok(r.citations.includes('roaming-zone-c-asia-pacific'), `the answer should cite roaming-zone-c-asia-pacific. Citations: ${r.citations.join(', ') || 'none'}`);
  assert.ok(/Japan/.test(r.answer), `the answer should mention Japan. It said: ${r.answer}`);
});

test('"what does a daily roaming pass cost in Germany?" gives the Europe and Americas price', async () => {
  const r = await answer(db.pg, 'what does a daily roaming pass cost in Germany?');
  assert.ok(r.answer.includes('$12'), `the daily pass for Germany is in Zone D. It said: ${r.answer}`);
  assert.ok(r.citations.includes('roaming-zone-d-europe-and-americas'), `the answer should cite roaming-zone-d-europe-and-americas. Citations: ${r.citations.join(', ') || 'none'}`);
});

test('"do I need to activate a roaming pass before I travel?" is answered from the rules', async () => {
  const r = await answer(db.pg, 'do I need to activate a roaming pass before I travel?');
  assert.ok(r.citations.includes('roaming-rules-for-all-zones'), `the answer should cite roaming-rules-for-all-zones. Citations: ${r.citations.join(', ') || 'none'}`);
});

test('the plan questions still work', async () => {
  const r = await answer(db.pg, "what's the price of the Unlimited Plus plan?");
  assert.ok(r.answer.includes('$39.99') && r.citations.includes('plan-unlimited-plus'), `adding the roaming policy must not break the plans. It said: ${r.answer}`);
});

test('a question neither document answers is still not-found', async () => {
  const r = await answer(db.pg, 'what does the platinum max plan cost?');
  assert.equal(r.answer, notFound, `it should still say the not-found sentence. It said: ${r.answer}`);
});

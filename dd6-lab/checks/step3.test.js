// Milestone 3: the ingestion pipeline. Runs YOUR `node scripts/ingest.js` against a scratch database (never yours), then looks
// inside that database. It also runs it again, and runs it on a changed copy of the plan sheet, to check it is safe to repeat.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { cleanup, ingest, load, scratch, sheet, withDb } from '../../../checks/lib/helpers.mjs';

const dir = scratch();
const dataDir = path.join(dir, 'pg');
const env = { FAQ_DATA_DIR: dataDir };
const startedAt = Date.now();
after(cleanup);

const { markdown } = sheet();
// Rows for roaming sections (milestone 9, the homework) share the table, so they are not counted here: this check is about the plan sheet.
const rows = pg => pg.query("SELECT chunk_id, plan_name, text, embedding::text AS embedding, vector_dims(embedding) AS dims FROM plan_chunks WHERE chunk_id NOT LIKE 'roaming-%' ORDER BY chunk_id").then(r => r.rows);
const meta = pg => pg.query("SELECT value FROM ingest_meta WHERE key = 'last_ingested_at'").then(r => r.rows[0]?.value);
const cosine = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

let firstRun;
let expected;
let firstMeta;

test('node scripts/ingest.js runs and exits 0', async () => {
  firstRun = ingest(env);
  assert.ok(!firstRun.timedOut, 'scripts/ingest.js did not finish within two minutes');
  assert.equal(firstRun.status, 0, `scripts/ingest.js failed:\n${firstRun.out.split('\n').filter(Boolean).slice(-6).join('\n')}`);
});

test('plan_chunks holds one row for every chunk, with the columns from the card', async () => {
  const { chunkPlans } = await load('src/chunk.js');
  expected = chunkPlans(markdown);
  assert.ok(expected.length > 0, 'chunkPlans returned nothing: do milestone 2 first');
  const found = await withDb(dataDir, rows).catch(e => assert.fail(`could not read plan_chunks: ${e.message}. The card names the table and its four columns.`));
  assert.equal(found.length, expected.length, `plan_chunks has ${found.length} rows, but the plan sheet gives ${expected.length} chunks`);
  assert.deepEqual(found.map(r => r.chunk_id).sort(), expected.map(c => c.chunkId).sort(), 'the chunk_id values in the table are not the chunk ids your chunker makes');
  for (const c of expected) {
    const r = found.find(x => x.chunk_id === c.chunkId);
    assert.equal(r.plan_name, c.planName, `plan_name for ${c.chunkId} is wrong`);
    assert.equal(r.text, c.text, `text for ${c.chunkId} is not the chunk text`);
  }
});

test('every embedding is a 1536-number vector made from the chunk text', async () => {
  const { embed } = await load('src/lib/embed.js');
  const found = await withDb(dataDir, rows);
  for (const r of found) {
    assert.equal(Number(r.dims), 1536, `the embedding for ${r.chunk_id} has ${r.dims} numbers, not 1536`);
    assert.ok(cosine(JSON.parse(r.embedding), embed(r.text)) > 0.999, `the embedding for ${r.chunk_id} was not made from that chunk's text. What did you pass to embed()?`);
  }
});

test('ingest_meta records when you last ingested, as a time', async () => {
  firstMeta = await withDb(dataDir, meta).catch(e => assert.fail(`could not read ingest_meta: ${e.message}. The card names the table, its columns and the row.`));
  assert.ok(firstMeta, 'there is no row with key last_ingested_at in ingest_meta');
  const t = Date.parse(firstMeta);
  assert.ok(Number.isFinite(t), `last_ingested_at must be a date and time that can be read back, not "${firstMeta}"`);
  assert.ok(t >= startedAt - 5000 && t <= Date.now() + 5000, 'last_ingested_at should be the time of this ingest');
});

test('running ingest again is safe: no error, no duplicates, and the time moves on', async () => {
  const again = ingest(env);
  assert.equal(again.status, 0, `the second run failed (does it insert a row that already exists?):\n${again.out.split('\n').filter(Boolean).slice(-6).join('\n')}`);
  const found = await withDb(dataDir, rows);
  assert.equal(found.length, expected.length, `after a second run plan_chunks has ${found.length} rows, expected ${expected.length}`);
  const second = await withDb(dataDir, meta);
  assert.ok(Date.parse(second) >= Date.parse(firstMeta), 'last_ingested_at went backwards or was not updated on the second run');
});

test('a changed, removed and added plan are all reflected after the next ingest', async () => {
  const changed = markdown
    .replace('Price: $9.99 per month', 'Price: $11.49 per month')
    .replace(/## Senior Basic[\s\S]*?(?=## )/, '')
    .concat('\n## Gold Test\nPrice: $59.99 per month\n- A plan that only exists in this check\n');
  const scratchSheet = path.join(dir, 'plans-changed.md');
  writeFileSync(scratchSheet, changed);
  const run = ingest({ ...env, PLAN_DOCS: scratchSheet });
  assert.equal(run.status, 0, `ingest failed on the changed sheet:\n${run.out.split('\n').filter(Boolean).slice(-6).join('\n')}`);
  const found = await withDb(dataDir, rows);
  const basic = found.find(r => r.chunk_id === 'plan-basic');
  assert.ok(basic && basic.text.includes('$11.49'), 'a plan whose price changed in the sheet still has its old text in the database: ingest must update rows that already exist');
  assert.ok(!found.some(r => r.chunk_id === 'plan-senior-basic'), 'a plan that was removed from the sheet is still in the database: ingest must delete chunks that are no longer in the sheet');
  assert.ok(found.some(r => r.chunk_id === 'plan-gold-test'), 'a plan added to the sheet was not ingested');
  const { embed } = await load('src/lib/embed.js');
  assert.ok(cosine(JSON.parse(basic.embedding), embed(basic.text)) > 0.999, 'the changed plan has its old embedding: it must be made again from the new text');
  assert.equal(found.length, expected.length, `expected ${expected.length} rows after one plan was removed and one added, found ${found.length}`);
  assert.equal(readFileSync(scratchSheet, 'utf8'), changed, 'ingest must never change the plan sheet');
});

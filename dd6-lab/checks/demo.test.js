// The demo (presenter only): a rerank step after retrieval puts the plan the question names first.
// Runs on the demo copy, which starts from checkpoint 4 (chunking, ingestion and retrieval already work).
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { cleanup, ingest, load, run, scratch } from '../../../checks/lib/helpers.mjs';

const dir = scratch();
const dataDir = path.join(dir, 'pg');
const env = { FAQ_DATA_DIR: dataDir };
let db;
let retrieve;
let rerank;

before(async () => {
  const r = ingest(env);
  assert.equal(r.status, 0, `ingest failed: ${r.out.slice(-300)}`);
  const { openDb } = await load('src/db.js');
  db = await openDb({ dataDir });
  ({ retrieve } = await load('src/retrieve.js'));
});
after(async () => { await db?.close(); cleanup(); });

test('src/rerank.js exports rerank(question, chunks), which only reorders', async () => {
  ({ rerank } = await load('src/rerank.js'));
  assert.equal(typeof rerank, 'function', 'src/rerank.js must export a function called rerank');
  const before = await retrieve(db.pg, 'family data plan', { k: 5 });
  const after = await rerank('family data plan', before);
  assert.ok(Array.isArray(after) && after.length === before.length, 'rerank must return the same number of chunks it was given');
  assert.deepEqual(after.map(c => c.chunkId).sort(), before.map(c => c.chunkId).sort(), 'rerank may only reorder: the same chunks must come back');
});

test('before the rerank the wrong plan is first; after it the right plan is', async () => {
  const before = await retrieve(db.pg, 'family data plan', { k: 5 });
  assert.equal(before[0].chunkId, 'plan-family-sms-bundle', 'the starting point of the demo is that the SMS bundle ranks above the data plan');
  const after = await rerank('family data plan', before);
  assert.equal(after[0].chunkId, 'plan-family-data-plan', `after the rerank the first chunk should be plan-family-data-plan, but it is ${after[0].chunkId}`);
});

test('a question that retrieval already gets right is left in a sensible order', async () => {
  const before = await retrieve(db.pg, "what's the price of the Unlimited Plus plan?", { k: 5 });
  const after = await rerank("what's the price of the Unlimited Plus plan?", before);
  assert.equal(after[0].chunkId, 'plan-unlimited-plus');
});

test('scripts/rerank-demo.js shows the order before and after', async () => {
  await db.close(); // the database folder can only be open in one process at a time
  const r = run('scripts/rerank-demo.js', { env, args: ['family data plan'] });
  assert.equal(r.status, 0, `scripts/rerank-demo.js failed: ${r.out.slice(-300)}`);
  assert.match(r.out, /before/i, 'the output should have a BEFORE list');
  assert.match(r.out, /after/i, 'the output should have an AFTER list');
  const [beforePart, afterPart] = r.out.split(/after/i);
  assert.ok(beforePart.indexOf('plan-family-sms-bundle') < beforePart.indexOf('plan-family-data-plan'), 'in the BEFORE list the SMS bundle should come before the data plan');
  assert.ok(afterPart.indexOf('plan-family-data-plan') < afterPart.indexOf('plan-family-sms-bundle'), 'in the AFTER list the data plan should come before the SMS bundle');
});

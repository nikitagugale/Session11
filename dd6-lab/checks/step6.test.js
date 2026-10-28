// Milestone 6: the whole pipeline. Fills a scratch database with YOUR ingest script, then calls YOUR answer() with the question that
// started it all, with questions that have no answer in the plan sheet, and with a model that lies about its sources.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { APP, cleanup, ingest, load, scratch, sheet } from '../../../checks/lib/helpers.mjs';

const dir = scratch();
const dataDir = path.join(dir, 'pg');
const { byId } = sheet();
const QUESTION = "what's the price of the Unlimited Plus plan?";
let db;
let answer;
let notFound;

before(async () => {
  const run = ingest({ FAQ_DATA_DIR: dataDir });
  assert.equal(run.status, 0, `this check fills a scratch database with your scripts/ingest.js first, and that failed (milestone 3):\n${run.out.split('\n').filter(Boolean).slice(-5).join('\n')}`);
  const { openDb } = await load('src/db.js');
  db = await openDb({ dataDir });
  ({ answer } = await load('src/answer.js'));
  ({ config: { notFound } } = await load('src/config.js'));
});
after(async () => { await db?.close(); cleanup(); });

test('answer(pg, question) returns { answer, citations, sources, retrieved }', async () => {
  assert.equal(typeof answer, 'function', 'src/answer.js must export a function called answer');
  const r = await answer(db.pg, QUESTION);
  assert.equal(typeof r.answer, 'string', 'the result needs an answer (text)');
  assert.ok(Array.isArray(r.citations), 'the result needs citations (an array of chunk ids)');
  assert.ok(Array.isArray(r.sources), 'the result needs sources (an array of { chunkId, snippet })');
  assert.ok(Array.isArray(r.retrieved), 'the result needs retrieved (the chunks that were retrieved)');
  assert.ok(r.retrieved.length > 0 && r.retrieved.length <= 5, `retrieved holds ${r.retrieved.length} chunks: it should hold the top 5 by default`);
});

test('the original bug is fixed: the real price, with a citation you can check', async () => {
  const r = await answer(db.pg, QUESTION);
  assert.ok(r.answer.includes('$39.99'), `the answer should give the price from the plan sheet. It said: ${r.answer}`);
  assert.ok(r.citations.includes('plan-unlimited-plus'), `the answer should cite plan-unlimited-plus. Citations: ${r.citations.join(', ') || 'none'}`);
  const src = r.sources.find(s => s.chunkId === 'plan-unlimited-plus');
  assert.ok(src && typeof src.snippet === 'string' && src.snippet.includes('$39.99'), 'sources must hold, for each citation, a snippet of the chunk, so a person can check the price in seconds');
});

test('the invented price from milestone 1 is gone', async () => {
  const { generate } = await load('src/model.js');
  const invented = (await generate({ system: 'You are a helpful assistant.', user: QUESTION })).text;
  const r = await answer(db.pg, QUESTION);
  assert.notEqual(r.answer.trim(), invented.trim(), 'the answer is still the made-up answer from milestone 1');
  const price = /\$[\d.]+/.exec(invented)[0];
  assert.ok(!r.answer.includes(price), `the made-up price ${price} is still in the answer`);
  const file = path.join(APP, 'docs', 'findings.json');
  if (existsSync(file)) {
    const found = JSON.parse(readFileSync(file, 'utf8'));
    if (typeof found.inventedPrice === 'number') assert.ok(!r.answer.includes(`$${found.inventedPrice}`), 'the price you recorded in docs/findings.json is still in the answer');
  }
});

// None of these is answered by the plan sheet or by the roaming policy (the homework), so they stay not-found after milestone 9.
for (const question of ['what does the platinum max plan cost?', 'why was I charged $40 extra this month', 'do you sell phone insurance?']) {
  test(`"${question}" gets the not-found sentence, and no citation`, async () => {
    const r = await answer(db.pg, question);
    assert.equal(r.answer, notFound, `the plan sheet has no answer to this, so the bot must say the not-found sentence. It said: ${r.answer}`);
    assert.deepEqual(r.citations, [], 'a not-found answer must not cite anything');
    assert.deepEqual(r.sources, [], 'a not-found answer has no sources');
  });
}

for (const [question, id, text] of [
  ['how many GB does the student saver include', 'plan-student-saver', '20 GB'],
  ['what does the Prepaid Daily Pass cost?', 'plan-prepaid-daily-pass', '$1.99'],
  ['is there a plan for tablets', 'plan-tablet-data-plan', '30 GB'],
  ["what's the price of the Family SMS Bundle?", 'plan-family-sms-bundle', '$4.99'],
  ["what's the price of the Business Starter plan?", 'plan-business-starter', '$34.99'],
]) {
  test(`"${question}" is answerable, so it must not say not-found`, async () => {
    const r = await answer(db.pg, question);
    assert.notEqual(r.answer, notFound, 'the plan sheet does have this answer: a not-found here means retrieval or the prompt let it slip away');
    assert.ok(r.answer.includes(text), `the answer should contain "${text}". It said: ${r.answer}`);
    assert.ok(r.citations.includes(id), `the answer should cite ${id}. Citations: ${r.citations.join(', ') || 'none'}`);
  });
}

test('every citation is checkable: the chunk was retrieved, and it holds the price in the answer', async () => {
  for (const question of [QUESTION, 'what does the Prepaid Daily Pass cost?', "what's the price of the Business Starter plan?"]) {
    const r = await answer(db.pg, question);
    const retrievedIds = r.retrieved.map(c => c.chunkId);
    for (const id of r.citations) {
      assert.ok(retrievedIds.includes(id), `${id} is cited but was never retrieved`);
      const price = /\$[\d.]+/.exec(r.answer)?.[0];
      if (price) assert.ok(byId[id].section.includes(price), `the answer says ${price}, but the chunk it cites (${id}) does not contain that price`);
    }
  }
});

test('a citation the model invents is not passed on', async () => {
  const liar = { generate: async () => ({ text: 'The Unlimited Plus plan costs $1.00 per month. [chunk_id: plan-does-not-exist]' }) };
  const r = await answer(db.pg, QUESTION, { model: liar });
  assert.ok(!r.citations.includes('plan-does-not-exist'), 'the model cited a chunk that was never retrieved, and answer() passed it on as a citation. Only chunk ids that were really retrieved may be cited.');
  assert.ok(!r.sources.some(s => s.chunkId === 'plan-does-not-exist'), 'sources must not list a chunk that was never retrieved');
});

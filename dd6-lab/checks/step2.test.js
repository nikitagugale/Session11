// Milestone 2: the chunker. Runs YOUR chunkPlans() on the plan sheet, and on two changed copies of it, and checks that every plan
// comes out as one whole chunk: its name, its price and its features together, written exactly as in the sheet.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load, sheet, slug } from '../../../checks/lib/helpers.mjs';

const { markdown, plans } = sheet();
let chunkPlans;
let chunks;

test('src/chunk.js exports chunkPlans(markdown), which returns an array', async () => {
  ({ chunkPlans } = await load('src/chunk.js'));
  assert.equal(typeof chunkPlans, 'function', 'src/chunk.js must export a function called chunkPlans');
  chunks = chunkPlans(markdown);
  assert.ok(Array.isArray(chunks), 'chunkPlans must return an array of { chunkId, planName, text }');
});

test('one chunk per plan', () => {
  assert.equal(chunks.length, plans.length, `the plan sheet has ${plans.length} plans, but chunkPlans made ${chunks.length} chunks. Run npm run chunks to see them.`);
});

test('each chunk is { chunkId, planName, text }, all text', () => {
  for (const c of chunks) {
    for (const key of ['chunkId', 'planName', 'text']) assert.equal(typeof c[key], 'string', `every chunk needs a text value for "${key}"`);
  }
});

test('planName is the plan\'s heading, exactly, once each', () => {
  const names = chunks.map(c => c.planName).sort();
  assert.deepEqual(names, plans.map(p => p.name).sort(), 'the planName values must be exactly the headings in the sheet, one chunk for each');
});

test('chunkId is "plan-" and the name in lower case with dashes, and ids are unique', () => {
  for (const c of chunks) assert.equal(c.chunkId, `plan-${slug(c.planName)}`, `the chunkId for "${c.planName}" does not follow the card (plan- then the name in lower case, words joined by dashes)`);
  assert.equal(new Set(chunks.map(c => c.chunkId)).size, chunks.length, 'two chunks share a chunkId');
});

test('the text keeps the heading, the price line and every feature, as written in the sheet', () => {
  for (const p of plans) {
    const c = chunks.find(x => x.planName === p.name);
    assert.ok(c, `no chunk for the plan "${p.name}"`);
    assert.ok(c.text.includes(`## ${p.name}`), `the chunk for "${p.name}" has lost its heading`);
    assert.ok(c.text.includes(p.priceLine), `the chunk for "${p.name}" does not hold its price line, so the name and the price are not together`);
    let at = 0;
    for (const b of p.bullets) {
      const i = c.text.indexOf(`- ${b}`, at);
      assert.ok(i >= at, `the chunk for "${p.name}" is missing the feature "${b}", or has the features out of order`);
      at = i;
    }
    assert.ok(markdown.includes(c.text), `the text of the chunk for "${p.name}" is not exactly what the sheet says. The card asks for the text verbatim.`);
  }
});

test('no chunk holds two plans, and the sheet\'s title and intro are not a chunk', () => {
  for (const c of chunks) {
    const headings = c.text.match(/^## /gm) ?? [];
    assert.equal(headings.length, 1, `the chunk for "${c.planName}" holds ${headings.length} plan headings; each chunk must hold exactly one plan`);
    assert.ok(!c.text.includes('Effective 1 October 2026'), `the chunk for "${c.planName}" contains the sheet's intro, which belongs to no plan`);
  }
});

test('it still works when the sheet has Windows line endings', () => {
  const crlf = markdown.replace(/\n/g, '\r\n');
  const result = chunkPlans(crlf);
  assert.equal(result.length, plans.length, `with Windows line endings (CRLF) chunkPlans made ${result.length} chunks instead of ${plans.length}`);
  const unlimitedPlus = result.find(c => c.planName === 'Unlimited Plus');
  assert.ok(unlimitedPlus && /Price:\s*\$39\.99/.test(unlimitedPlus.text), 'with CRLF line endings the "Unlimited Plus" chunk no longer holds its price');
});

test('a new plan with a sub-heading and blank lines is still one chunk', () => {
  const extra = `${markdown.trimEnd()}\n\n## Gold Test+ (Promo)\nPrice: $59.99 per month\n\n### Notes\n- Only for new customers\n\n- Valid until December\n`;
  const result = chunkPlans(extra);
  assert.equal(result.length, plans.length + 1, `after adding one plan the sheet has ${plans.length + 1} plans, but chunkPlans made ${result.length} chunks. A "###" sub-heading or a blank line must not start a new chunk.`);
  const gold = result.find(c => c.planName === 'Gold Test+ (Promo)');
  assert.ok(gold, 'the new plan "Gold Test+ (Promo)" is not a chunk of its own');
  assert.equal(gold.chunkId, 'plan-gold-test-promo');
  for (const part of ['Price: $59.99 per month', '### Notes', '- Only for new customers', '- Valid until December']) assert.ok(gold.text.includes(part), `the new plan's chunk lost "${part}"`);
});

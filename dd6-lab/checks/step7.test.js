// Milestone 7: the fixtures. Checks the SHAPE of tests/fixtures/qa.json, runs YOUR `node scripts/fixtures.js` on your pipeline, and
// then runs it on three scratch copies of your project that have been deliberately broken, to prove your tests can fail:
//   a chunker that cuts plans apart, a prompt that never says "only the context", and a prompt that never asks for a citation.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { APP, cleanup, ingest, mutantCopy, run, scratch, sheet } from '../../../checks/lib/helpers.mjs';

after(cleanup);
const { byId } = sheet();
// After milestone 9 the bot also answers from the roaming policy, so its chunk ids are valid citations too.
const roamingFile = path.join(APP, 'data', 'roaming-policy.md');
const roamingIds = new Set(existsSync(roamingFile) ? Object.keys(sheet(roamingFile).byId).map(id => id.replace(/^plan-/, 'roaming-')) : []);
const file = path.join(APP, 'tests', 'fixtures', 'qa.json');
let pairs = [];

test('tests/fixtures/qa.json is a list of at least 10 question and answer pairs', () => {
  assert.ok(existsSync(file), 'tests/fixtures/qa.json is missing. The card says what goes in it.');
  pairs = JSON.parse(readFileSync(file, 'utf8'));
  assert.ok(Array.isArray(pairs), 'qa.json must be a list ([ ... ])');
  assert.ok(pairs.length >= 10, `qa.json has ${pairs.length} pairs, the card asks for at least 10`);
});

test('every pair is a question with either expectedCitations (real chunk ids) or notFound: true', () => {
  const seen = new Set();
  for (const [i, p] of pairs.entries()) {
    assert.equal(typeof p.question, 'string', `pair ${i + 1} has no question (text)`);
    assert.ok(p.question.trim().length > 0, `pair ${i + 1} has an empty question`);
    assert.ok(!seen.has(p.question.trim().toLowerCase()), `the question "${p.question}" appears twice`);
    seen.add(p.question.trim().toLowerCase());
    if (p.notFound === true) continue;
    assert.ok(Array.isArray(p.expectedCitations) && p.expectedCitations.length > 0, `pair ${i + 1} ("${p.question}") needs notFound: true, or a non-empty expectedCitations list`);
    for (const id of p.expectedCitations) assert.ok(byId[id] || roamingIds.has(id), `pair ${i + 1} expects the citation "${id}", which is not a chunk id of any plan in the sheet (or of a roaming section), so it could never pass`);
  }
});

test('at least 3 pairs are not-found cases, and at least 5 expect a citation', () => {
  const nf = pairs.filter(p => p.notFound === true).length;
  const cited = pairs.filter(p => Array.isArray(p.expectedCitations) && p.expectedCitations.length).length;
  assert.ok(nf >= 3, `only ${nf} not-found pairs. The card asks for at least 3: a bot that cannot say "I don't know" is the problem you started with.`);
  assert.ok(cited >= 5, `only ${cited} pairs expect a citation. The card asks for at least 5.`);
});

test('package.json has a "fixtures" script that runs scripts/fixtures.js', () => {
  const pkg = JSON.parse(readFileSync(path.join(APP, 'package.json'), 'utf8'));
  assert.ok(pkg.scripts?.fixtures && /scripts[\\/]fixtures\.js/.test(pkg.scripts.fixtures), 'add a script called "fixtures" to package.json that runs scripts/fixtures.js');
});

function runFixtures(cwd, label) {
  const dataDir = path.join(scratch(), 'pg');
  const env = { FAQ_DATA_DIR: dataDir };
  const ing = ingest(env, cwd);
  if (ing.status !== 0) return { ingestFailed: true, out: ing.out, label };
  return { ...run('scripts/fixtures.js', { env, cwd }), label };
}

test('your fixtures all pass on your pipeline', () => {
  const r = runFixtures(APP, 'your pipeline');
  assert.ok(!r.ingestFailed, `ingest failed, so the fixtures could not run (milestone 3):\n${r.out.split('\n').filter(Boolean).slice(-4).join('\n')}`);
  assert.ok(!r.timedOut, 'scripts/fixtures.js did not finish within two minutes');
  assert.equal(r.status, 0, `scripts/fixtures.js exits non-zero on your own pipeline, so some fixtures fail:\n${r.out.split('\n').filter(l => /FAIL|^\s+-|passed/.test(l)).slice(0, 14).join('\n')}\nIs it the pipeline that is wrong, or the fixture? Retrieval failure or generation failure?`);
});

for (const [label, swaps, why] of [
  ['a chunker that cuts plans apart', { 'src/chunk.js': 'chunk-naive.js' }, 'a price that has been separated from its plan name'],
  ['a prompt that never says "use only the context"', { 'src/prompt.js': 'prompt-no-grounding.js' }, 'a question the plan sheet cannot answer, where the bot must refuse instead of inventing'],
  ['a prompt that never asks for a citation', { 'src/prompt.js': 'prompt-no-citation.js' }, 'a citation that must be there'],
]) {
  test(`your fixtures can fail: they catch ${label}`, () => {
    const copy = mutantCopy(swaps);
    const r = runFixtures(copy, label);
    const swapped = Object.keys(swaps).join(' and ');
    const missingExport = /does not provide an export named '([^']+)'/.exec(r.out ?? '');
    assert.ok(!r.ingestFailed, missingExport
      ? `could not run the broken copy (${label}): this check swaps ${swapped} for a broken version that has only the original exports, and your scripts/ingest.js imports "${missingExport[1]}" from it. Move that code into a file of its own, and keep ${swapped} exactly as its milestone describes.`
      : `could not run the broken copy (${label}): ${r.out.split('\n').filter(Boolean).slice(-3).join(' | ')}`);
    assert.notEqual(r.status, 0, `Your fixtures all still pass on ${label}. A test that cannot fail proves nothing. Which of your questions depends on ${why}? Add one.`);
  });
}

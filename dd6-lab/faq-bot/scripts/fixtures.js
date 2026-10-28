// `npm run fixtures` asks the bot every question in tests/fixtures/qa.json and checks the answer.
// A failure says whether retrieval (the right chunk was not retrieved) or generation (it was, but the answer is wrong) is to blame.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { config, ROOT } from '../src/config.js';
import { withDb } from '../src/db.js';
import { answer } from '../src/answer.js';

const pairs = JSON.parse(readFileSync(path.join(ROOT, 'tests', 'fixtures', 'qa.json'), 'utf8'));

function check(pair, result) {
  const problems = [];
  const retrievedIds = result.retrieved.map(c => c.chunkId);
  if (pair.notFound) {
    if (result.answer.trim() !== config.notFound) problems.push(`generation: expected the not-found sentence, got "${result.answer}"`);
    if (result.citations.length) problems.push(`generation: a not-found answer must not cite, got ${result.citations.join(', ')}`);
    return problems;
  }
  for (const id of pair.expectedCitations ?? []) {
    if (!retrievedIds.includes(id)) problems.push(`retrieval: ${id} was not retrieved (got ${retrievedIds.join(', ')})`);
    else if (!result.citations.includes(id)) problems.push(`generation: ${id} was retrieved but not cited (cited: ${result.citations.join(', ') || 'nothing'})`);
  }
  for (const text of pair.mustContain ?? []) {
    if (!result.answer.includes(text)) problems.push(`generation: the answer does not contain "${text}": "${result.answer}"`);
  }
  return problems;
}

let failed = 0;
await withDb(async pg => {
  for (const pair of pairs) {
    const problems = check(pair, await answer(pg, pair.question));
    if (problems.length) {
      failed += 1;
      console.log(`FAIL  ${pair.question}\n        ${problems.join('\n        ')}`);
    } else {
      console.log(`PASS  ${pair.question}`);
    }
  }
});
console.log(`\n${pairs.length - failed} of ${pairs.length} passed.`);
if (failed) process.exitCode = 1;

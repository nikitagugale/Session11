// Reference solution, milestone 7: run the question and answer pairs through the whole pipeline and report each one.
//   node scripts/fixtures.js        (npm run fixtures)     exits 0 only if every pair passes
// Each pair in tests/fixtures/qa.json is one of:
//   { question, expectedCitations: [chunk ids that must be cited], mustContain: [text the answer must contain] }
//   { question, notFound: true }       the bot must say the not-found sentence and cite nothing
import { readFileSync } from 'node:fs';
import { answer } from '../src/answer.js';
import { config } from '../src/config.js';
import { openDb } from '../src/db.js';

const pairs = JSON.parse(readFileSync(new URL('../tests/fixtures/qa.json', import.meta.url), 'utf8'));
const { pg, close } = await openDb();
let failed = 0;
try {
  for (const pair of pairs) {
    const result = await answer(pg, pair.question);
    const problems = [];
    if (pair.notFound) {
      if (result.answer !== config.notFound) problems.push(`expected the not-found sentence, got: ${result.answer}`);
      if (result.citations.length) problems.push(`a not-found answer must not cite anything, but it cited ${result.citations.join(', ')}`);
    } else {
      for (const id of pair.expectedCitations ?? []) if (!result.citations.includes(id)) problems.push(`expected a citation of ${id}, got: ${result.citations.join(', ') || 'none'}`);
      for (const text of pair.mustContain ?? []) if (!result.answer.includes(text)) problems.push(`the answer should contain "${text}", got: ${result.answer}`);
    }
    if (problems.length) failed += 1;
    console.log(`${problems.length ? 'FAIL' : 'PASS'}  ${pair.question}`);
    for (const p of problems) console.log(`        - ${p}`);
  }
} finally {
  await close();
}
console.log(`\n${pairs.length - failed} of ${pairs.length} passed`);
process.exitCode = failed ? 1 : 0;

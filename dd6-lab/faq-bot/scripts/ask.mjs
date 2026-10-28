// `npm run ask -- "your question"` asks the FAQ bot and shows the answer and the sources it relies on.
//   npm run ask -- "what's the price of the Unlimited Plus plan?"
//   npm run ask -- "what is included in the Basic plan?" --json       (the full result, as JSON)
import { answer } from '../src/answer.js';
import { withDb } from '../src/db.js';

const args = process.argv.slice(2);
const json = args.includes('--json');
const question = args.filter(a => !a.startsWith('--')).join(' ').trim();
if (!question) {
  console.error('Give it a question, for example:  npm run ask -- "what\'s the price of the Unlimited Plus plan?"');
  process.exit(2);
}

try {
  const result = await withDb(pg => answer(pg, question));
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Question : ${question}`);
    console.log(`Answer   : ${result.answer}`);
    const cites = result.citations ?? [];
    if (!cites.length) console.log('Citations: none. Nothing here can be checked against the plan sheet.');
    else console.log(`Citations: ${cites.join(', ')}`);
    for (const s of result.sources ?? []) console.log(`  [${s.chunkId}] ${String(s.snippet).replace(/\s+/g, ' ').slice(0, 110)}`);
    if (result.retrieved) console.log(`Retrieved: ${result.retrieved.map(c => c.chunkId).join(', ')}`);
  }
} catch (e) {
  console.error(`That did not work: ${e.message}`);
  process.exit(1);
}

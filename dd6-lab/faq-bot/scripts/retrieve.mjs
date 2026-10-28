// `npm run retrieve -- "your question"` shows which chunks YOUR retrieve() returns, best first.
//   npm run retrieve -- "family data plan"
//   npm run retrieve -- "what's included in the basic plan" --k 3
import { withDb } from '../src/db.js';
import { retrieve } from '../src/retrieve.js';

const args = process.argv.slice(2);
const kIndex = args.indexOf('--k');
const k = kIndex > -1 ? Number(args[kIndex + 1]) : 5;
const question = args.filter((a, i) => !a.startsWith('--') && (kIndex === -1 || i !== kIndex + 1)).join(' ').trim();
if (!question) {
  console.error('Give it a question, for example:  npm run retrieve -- "family data plan"');
  process.exit(2);
}

try {
  const rows = await withDb(pg => retrieve(pg, question, { k }));
  console.log(`Question: ${question}\n`);
  console.log('rank  score   chunkId                     planName');
  rows.forEach((r, i) => console.log(`${String(i + 1).padEnd(4)}  ${Number(r.score).toFixed(3).padEnd(6)}  ${String(r.chunkId).padEnd(26)}  ${r.planName}`));
} catch (e) {
  console.error(`That did not work: ${e.message}`);
  process.exit(1);
}

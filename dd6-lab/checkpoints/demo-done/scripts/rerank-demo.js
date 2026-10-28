// node scripts/rerank-demo.js "family data plan"     shows the order of the retrieved chunks before and after the rerank step.
import { openDb } from '../src/db.js';
import { rerank } from '../src/rerank.js';
import { retrieve } from '../src/retrieve.js';

const question = process.argv.slice(2).join(' ').trim() || 'family data plan';
const { pg, close } = await openDb();
try {
  const before = await retrieve(pg, question, { k: 5 });
  const after = rerank(question, before);
  console.log(`Question: ${question}\n`);
  console.log('BEFORE (by vector similarity)');
  before.forEach((c, i) => console.log(`  ${i + 1}. ${c.chunkId.padEnd(26)} similarity ${c.score.toFixed(3)}`));
  console.log('\nAFTER (reranked by the judge)');
  after.forEach((c, i) => console.log(`  ${i + 1}. ${c.chunkId.padEnd(26)} relevance ${c.relevance.toFixed(1)}`));
} finally {
  await close();
}

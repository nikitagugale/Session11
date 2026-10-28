// `npm run chunks` runs YOUR chunkPlans() on the plan sheet and shows what it made, and what is wrong with it.
//   npm run chunks               a table of the chunks and a verdict
//   npm run chunks -- --show     also print the full text of every chunk
import { readFileSync } from 'node:fs';
import { chunkPlans } from '../src/chunk.js';
import { config } from '../src/config.js';

const show = process.argv.includes('--show');
const markdown = readFileSync(config.planDocs, 'utf8');
const sheet = markdown.split(/^(?=## )/m).filter(s => s.startsWith('## ')).map(s => ({
  name: /^## (.+)$/m.exec(s)[1].trim(),
  price: /^Price:\s*(.+)$/m.exec(s)?.[0] ?? null,
}));

let chunks;
try {
  chunks = chunkPlans(markdown);
} catch (e) {
  console.error(`chunkPlans() failed: ${e.message}`);
  process.exit(1);
}
if (!Array.isArray(chunks)) {
  console.error('chunkPlans() must return an array of { chunkId, planName, text }.');
  process.exit(1);
}

console.log(`The plan sheet has ${sheet.length} plans. chunkPlans() made ${chunks.length} chunks.\n`);
const pad = (s, n) => String(s).slice(0, n).padEnd(n);
console.log(`${pad('#', 3)} ${pad('chunkId', 26)} ${pad('planName', 22)} ${pad('chars', 5)} ${pad('heading', 7)} ${pad('price', 5)}`);
chunks.forEach((c, i) => {
  const text = String(c.text ?? '');
  console.log(`${pad(i + 1, 3)} ${pad(c.chunkId, 26)} ${pad(c.planName, 22)} ${pad(text.length, 5)} ${pad(/^##\s+\S/m.test(text) ? 'yes' : 'NO', 7)} ${pad(/^Price:/m.test(text) ? 'yes' : 'NO', 5)}`);
  if (show) console.log(text.split('\n').map(l => `      | ${l}`).join('\n'));
});

const problems = [];
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
for (const p of sheet) {
  const heading = new RegExp(`^## ${escapeRe(p.name)}\\s*$`, 'm');
  const withName = chunks.filter(c => heading.test(String(c.text)));
  const withPrice = p.price ? chunks.filter(c => String(c.text).includes(p.price)) : [];
  const squash = s => String(s).replace(/\s+/g, '');
  const cutAt = chunks.findIndex((c, i) => i < chunks.length - 1 && squash(String(c.text) + String(chunks[i + 1].text)).includes(squash(`## ${p.name}`)));
  if (!withName.length) problems.push(cutAt > -1 ? `"${p.name}": a chunk boundary cuts its heading in two (between chunk ${cutAt + 1} and chunk ${cutAt + 2})` : `"${p.name}": its heading is in no chunk`);
  else if (withName.length > 1) problems.push(`"${p.name}": its heading is in ${withName.length} chunks`);
  else if (p.price && !withPrice.includes(withName[0])) problems.push(`"${p.name}": the price is not in the same chunk as the name`);
}
const unnamed = chunks.filter(c => !/^##\s+\S/m.test(String(c.text))).length;
if (unnamed) problems.push(`${unnamed} chunk(s) have no plan heading at all, so nobody could tell which plan they describe`);
if (chunks.length !== sheet.length) problems.push(`expected one chunk per plan (${sheet.length}), got ${chunks.length}`);

console.log('');
if (problems.length) {
  console.log(`${problems.length} problem(s):`);
  for (const p of problems) console.log(`  - ${p}`);
  process.exitCode = 1;
} else {
  console.log('Every plan is in one chunk, with its name and its price together.');
}

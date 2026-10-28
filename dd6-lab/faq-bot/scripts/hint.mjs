// `npm run hint -- N` gives you the next hint for milestone N, one level at a time.
//   npm run hint                    which hints you have taken so far
//   npm run hint -- 4               the next hint for milestone 4 (three hints, then the reveal)
//   npm run hint -- 4 --now         take the next hint even though it has not opened yet (it is noted as early)
//   npm run hint -- 4 --again       read the hints you have already taken, without taking a new one
//   npm run hint -- 4 --reveal      the reference brief, the approach and the common mistakes (opens at the facilitator's summary)
//
// The clock for a milestone starts the first time you run `npm run start -- N`, `npm run step -- N` or `npm run hint -- N`.
// Each hint opens a few minutes later. That is a nudge to try first, not a lock: `--now` always works, and it is noted in your
// progress so that you can say so in LAB-LOG.md. Hints are free once they open.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { MILESTONES, titleOf } from './milestones.mjs';
import { app, markStarted, minutesSinceStart, readState, writeState } from './lab-state.mjs';

const hintsDir = path.join(path.resolve(app, '..'), 'hints');
const args = process.argv.slice(2);
const n = Number(args.find(a => /^\d+$/.test(a)));
const flags = new Set(args.filter(a => a.startsWith('--')));

const wrap = (text, width = 78) => String(text).split('\n').map(line => {
  if (/^\s*(```|\||-|\d+\.)/.test(line) || line.length <= width) return line;
  const out = []; let cur = '';
  for (const w of line.split(' ')) { if ((cur + ' ' + w).trim().length > width) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }
  out.push(cur);
  return out.join('\n');
}).join('\n');
const rule = '-'.repeat(78);

if (!n) {
  const { hints } = readState();
  console.log('Hints used so far:\n');
  for (const m of MILESTONES.filter(x => x.n <= 8)) {
    const s = hints[m.n] ?? { used: 0 };
    console.log(`  ${m.n}  ${m.title.padEnd(34)} ${s.used} of 3 hints${s.early ? ` (${s.early} early)` : ''}${s.revealed ? ', reveal read' : ''}`);
  }
  console.log('\nTake the next hint for a milestone with:  npm run hint -- <number>');
  process.exit(0);
}

const file = path.join(hintsDir, `step-${n}.json`);
if (!existsSync(file)) {
  console.error(`No hints for milestone "${n}". Use a number from 1 to 9. (Is the hints/ folder next to faq-bot/?)`);
  process.exit(1);
}
const data = JSON.parse(readFileSync(file, 'utf8'));
const milestone = MILESTONES.find(m => m.n === n);
const state = readState();
const s = state.hints[n] ?? { used: 0, early: 0, revealed: false, log: [] };
const head = `Milestone ${n} · ${titleOf(n)}`;

if (flags.has('--reveal')) {
  console.log(`${head}\nREFERENCE SOLUTION\n${rule}`);
  console.log('The facilitator opens this at the summary. If you are reading it earlier, say so in LAB-LOG.md: that is fine, it is honest.\n');
  console.log('THE REFERENCE BRIEF (a good prompt for Claude Code, or a good set of requirements for yourself)\n');
  console.log(wrap(data.reveal.referenceBrief));
  console.log('\nTHE APPROACH\n');
  console.log(wrap(data.reveal.approach));
  console.log('\nCOMMON MISTAKES\n');
  for (const m of data.reveal.commonMistakes) console.log(wrap(`- ${m}`));
  console.log(`\n${rule}\nAfter reading it: close the gap in your own work, or run  npm run checkpoint -- ${n}  to get the reference code.`);
  s.revealed = true;
  s.log = [...(s.log ?? []), { what: 'reveal', at: new Date().toISOString() }];
  state.hints[n] = s;
  writeState(state);
  process.exit(0);
}

if (flags.has('--again')) {
  if (!s.used) { console.log(`You have not taken any hints for milestone ${n} yet. Run:  npm run hint -- ${n}`); process.exit(0); }
  for (let i = 1; i <= s.used; i++) console.log(`${head}\nHint ${i} of ${data.levels.length} · ${data.levels[i - 1].label}\n${rule}\n${wrap(data.levels[i - 1].text)}\n${rule}`);
  process.exit(0);
}

if (s.used >= data.levels.length) {
  console.log(`${head}\nYou have taken all ${data.levels.length} hints. The next step is the reveal, which opens at the facilitator's summary.\nRead your hints again with:  npm run hint -- ${n} --again\nOr, if you have run out of road:  npm run hint -- ${n} --reveal`);
  process.exit(0);
}

markStarted(n);
const elapsed = minutesSinceStart(n) ?? 0;
const next = s.used + 1;
const opensAt = milestone?.hintMinutes?.[next - 1] ?? 0;
const early = elapsed < opensAt;
if (early && !flags.has('--now')) {
  const wait = Math.max(1, Math.ceil(opensAt - elapsed));
  console.log(`${head}\nHint ${next} of ${data.levels.length} opens in about ${wait} minute${wait === 1 ? '' : 's'} (the clock for this milestone started ${Math.round(elapsed)} minute${Math.round(elapsed) === 1 ? '' : 's'} ago).`);
  console.log('Try the questions under "Where to start" on the card first. That is where most of the learning is.');
  console.log(`If you really need it now:  npm run hint -- ${n} --now   (it is noted as an early hint, and you can say so in LAB-LOG.md)`);
  process.exit(0);
}

const fresh = readState();
const cur = fresh.hints[n] ?? { used: 0, early: 0, revealed: false, log: [] };
cur.used = next;
if (early) cur.early = (cur.early ?? 0) + 1;
cur.log = [...(cur.log ?? []), { what: `hint ${next}`, at: new Date().toISOString(), early }];
fresh.hints[n] = cur;
writeState(fresh);

const lvl = data.levels[next - 1];
console.log(`${head}\nHint ${next} of ${data.levels.length} · ${lvl.label}${early ? '  (early)' : ''}\n${rule}\n${wrap(lvl.text)}\n${rule}`);
console.log(next < data.levels.length
  ? 'Try again for a few minutes before taking the next one. Note this hint in LAB-LOG.md.'
  : `That was the last hint. The reveal (npm run hint -- ${n} --reveal) opens at the facilitator's summary.`);

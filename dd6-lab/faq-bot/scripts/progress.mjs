// `npm run progress` runs the check for every milestone and prints where you are, plus one line to paste in the chat.
// It reads your work and never changes it. It takes about a minute, because some checks run your pipeline from scratch.
//   npm run progress                milestones 1 to 8
//   npm run progress -- 4           just milestone 4 (a quick re-check)
import { spawnSync } from 'node:child_process';
import { MILESTONES } from './milestones.mjs';
import { app, readState } from './lab-state.mjs';

const only = process.argv.slice(2).map(Number).filter(Boolean);
const list = only.length ? MILESTONES.filter(m => only.includes(m.n)) : MILESTONES.filter(m => m.n <= 8);
const { hints } = readState();

console.log(`Checking ${list.length === 1 ? `milestone ${list[0].n}` : 'all the milestones'}${list.length > 1 ? ' (about a minute)' : ''}...\n`);
const results = [];
for (const m of list) {
  const r = spawnSync(process.execPath, ['scripts/lab.mjs', 'step', String(m.n), '--quiet'], { cwd: app, encoding: 'utf8', timeout: 240000, killSignal: 'SIGKILL' });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const pass = /^ℹ pass (\d+)/m.exec(out)?.[1];
  const fail = /^ℹ fail (\d+)/m.exec(out)?.[1];
  const h = hints[m.n] ?? { used: 0 };
  results.push({ ...m, ok: r.status === 0, hints: h.used ?? 0 });
  console.log(`  ${r.status === 0 ? '[x]' : '[ ]'}  ${m.n}  ${m.title.padEnd(34)} ${r.status === 0 ? 'done' : 'not yet'}${pass !== undefined ? `  (${pass} pass, ${fail ?? 0} fail)` : ''}  hints ${h.used ?? 0}${h.early ? ` (${h.early} early)` : ''}${h.revealed ? ' +reveal' : ''}`);
}

const done = results.filter(r => r.ok).length;
const totalHints = Object.values(hints).reduce((a, s) => a + (s.used ?? 0), 0);
console.log(`\n${done} of ${results.length} milestones done, ${totalHints} hints taken.`);
if (done < results.length) {
  const next = results.find(r => !r.ok);
  console.log(`Next: milestone ${next.n}. Run  npm run step -- ${next.n}  to see exactly which part is failing, or  npm run hint -- ${next.n}  for a hint.`);
}
console.log(`\nPASTE THIS IN THE CHAT:\nPULSE ${results.map(r => `M${r.n}${r.ok ? '[x]' : '[ ]'}`).join(' ')} hints=${totalHints}`);
process.exitCode = done === results.length ? 0 : 1;

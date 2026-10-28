// Lab helper. Plain Node, no dependencies, no shell syntax: runs the same on Linux, macOS and Windows.
//
//   npm run doctor                  check Node, the install, the database and the kit layout
//   npm run baseline                git-commit the starting point, so you can see exactly what changes
//   npm run start -- N              start the clock for milestone N and see when its hints open
//   npm run step -- N               check your work for milestone N (1 to 9)
//   npm run checkpoint -- N         replace your work with the reference solution for milestone N (1 to 9)
//
// `step` copies the hidden check in, runs it, and removes it again, so `npm test` never changes under you.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, rmdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { MILESTONES, titleOf } from './milestones.mjs';
import { app, markStarted } from './lab-state.mjs';

const kit = path.resolve(app, '..');
const checksDir = path.join(kit, 'checks');
const checkpointsDir = path.join(kit, 'checkpoints');
const [, , command, arg, ...rest] = process.argv;
const quiet = rest.includes('--quiet');

const STEPS = {
  ...Object.fromEntries(MILESTONES.map(m => [m.n, m.check])),
  demo: 'presenter: a rerank step that puts the right plan first',
};

const say = (...a) => console.log(...a);
const fail = (msg, code = 1) => { console.error(msg); process.exit(code); };

// Node prints a stack trace and an object dump for every failed assertion. Learners need the sentence, not the trace.
// It also names the check file and, for equality assertions, prints "actual !== expected". The check file is the answer key,
// and for the milestone about finding facts the expected value IS the answer, so neither is shown.
function tidy(text, { hideValues = false } = {}) {
  const out = [];
  let skipping = false;
  for (const line of text.split('\n')) {
    if (skipping) { if (/^\s*\}\s*$/.test(line)) skipping = false; continue; }
    if (/^\s+generatedMessage:/.test(line)) { skipping = true; continue; }
    if (/^test at .*\.test\.js:\d+:\d+\s*$/.test(line)) continue;
    if (hideValues && /^\s+\S.* !== .+$/.test(line)) continue;
    if (/^\s+at .+:\d+:\d+\)?\s*$/.test(line) || /^\s+at .*\(node:/.test(line) || /^\s+at async /.test(line)) continue;
    out.push(line.replace(/^(\s*AssertionError.*) \{\s*$/, '$1'));
  }
  return out.join('\n');
}

function nodeTest(files, options) {
  const r = spawnSync(process.execPath, ['--test', '--test-reporter=spec', ...files], { cwd: app, encoding: 'utf8' });
  process.stdout.write(tidy(r.stdout ?? '', options));
  process.stderr.write(tidy(r.stderr ?? '', options));
  return r.status ?? 1;
}

async function doctor() {
  let bad = 0;
  const ok = m => say(`  ok    ${m}`);
  const no = (m, fix) => { bad += 1; say(`  FAIL  ${m}\n        -> ${fix}`); };

  const [maj] = process.versions.node.split('.').map(Number);
  maj >= 20 ? ok(`Node ${process.versions.node}`) : no(`Node ${process.versions.node} is too old`, 'install Node 20 or newer');
  existsSync(path.join(app, 'node_modules', '@electric-sql', 'pglite')) ? ok('dependencies installed') : no('node_modules is missing', 'run `npm ci` in this folder');
  existsSync(path.join(app, 'data', 'plan-docs.md')) ? ok('the plan sheet, data/plan-docs.md, is there') : no('data/plan-docs.md is missing', 're-extract the kit zip');
  existsSync(checksDir) && existsSync(checkpointsDir) && existsSync(path.join(kit, 'hints')) ? ok('checks/, checkpoints/ and hints/ found next to this folder') : no('checks/, checkpoints/ or hints/ not found next to faq-bot/', 're-extract the kit zip and keep the folders together');
  try {
    const { openDb } = await import('../src/db.js');
    const db = await openDb({ dataDir: 'memory://' });
    const row = (await db.pg.query("SELECT '[1,2,3]'::vector <=> '[1,2,4]'::vector AS d")).rows[0];
    await db.close();
    Number.isFinite(Number(row.d)) ? ok('the database starts, with pgvector (the cosine distance operator works)') : no('the database started but pgvector did not answer', 'run `npm ci` again, then tell the facilitator');
  } catch (e) {
    no(`the database did not start: ${e.message}`, 'run `npm ci` again, then tell the facilitator');
  }
  const git = spawnSync('git', ['--version'], { encoding: 'utf8' });
  git.status === 0 ? ok(git.stdout.trim()) : say('  warn  git not found: `npm run baseline` will be skipped (use the editor diff instead)');

  say(bad ? `\n${bad} problem(s) above. Fix them, then run \`npm run doctor\` again.` : '\nReady. Next: npm test, then open LAB-GUIDE.md');
  process.exit(bad ? 1 : 0);
}

function baseline() {
  const git = (...a) => spawnSync('git', ['-C', app, ...a], { encoding: 'utf8' });
  try {
    if (git('--version').status !== 0) return say('git not found: skipping. Use the editor diff instead.');
    if (!existsSync(path.join(app, '.git'))) git('-c', 'init.defaultBranch=main', 'init', '-q');
    git('add', '-A');
    const r = git('-c', 'user.name=lab', '-c', 'user.email=lab@local', 'commit', '-q', '-m', 'baseline: starting point');
    say(r.status === 0 ? 'Baseline committed. `git diff` and the editor diff now show only what you change.'
                       : 'Nothing new to commit (a baseline already exists).');
  } catch (e) {
    say(`baseline skipped: ${e.message}`);
  }
}

function start(n) {
  const m = MILESTONES.find(x => String(x.n) === String(n));
  if (!m) fail(`Unknown milestone "${n}". Use a number from 1 to 9.`);
  const at = markStarted(m.n);
  const minutes = (Date.now() - new Date(at).getTime()) / 60000;
  say(`Milestone ${m.n} · ${m.title}`);
  say(minutes < 0.2 ? 'The clock for this milestone just started.' : `The clock for this milestone started ${Math.round(minutes)} minute${Math.round(minutes) === 1 ? '' : 's'} ago.`);
  say(`Aim to finish in about ${m.targetMinutes} minutes. Hints open after ${m.hintMinutes.join(', ')} minutes (a nudge, not a lock: npm run hint -- ${m.n}).`);
  say('Open LAB-GUIDE.md at the card for this milestone, and read it before you type anything.');
}

function step(n) {
  if (!STEPS[n]) fail(`Unknown milestone "${n}". Use a number from 1 to 9.`);
  const numbered = /^\d+$/.test(n);
  if (numbered) markStarted(n);
  say(`\n${numbered ? `MILESTONE ${n}` : `STEP ${n}`}: ${numbered ? titleOf(n) : STEPS[n]}\n`);

  const file = n === 'demo' ? 'demo.test.js' : `step${n}.test.js`;
  const src = path.join(checksDir, file);
  if (!existsSync(src)) fail(`Missing ${src}. Is checks/ next to faq-bot/?`);
  const destDir = path.join(app, 'tests', 'steps');
  const dest = path.join(destDir, file);
  mkdirSync(destDir, { recursive: true });
  cpSync(src, dest);
  let status;
  try { status = nodeTest([dest], { hideValues: n === '1' }); }
  finally { rmSync(dest, { force: true }); try { rmdirSync(destDir); } catch { /* not empty */ } }

  if (status === 0) {
    say(`\nSTEP ${n} PASSED`);
    if (numbered && !quiet) {
      const last = n === '4' ? '\nThat is the end of the first block. Write your log, then use any spare time on the stretch goals while the others finish.'
        : n === '8' ? '\nThat is the end of the second block. Write your log, then use any spare time on the stretch goals while the others finish.'
        : n === '9' ? '\nThat is the homework done.' : '';
      say(`Milestone ${n} is done. Write two lines in LAB-LOG.md, then go on to the next milestone.${last}`);
    }
  } else {
    say(`\nSTEP ${n} not passing yet. Read the first failure above: it says which success criterion is not met.`);
    if (numbered && !quiet) say(`Stuck? npm run hint -- ${n} gives you the next hint when it opens. To catch up, npm run checkpoint -- ${n} gives you the reference code.`);
  }
  process.exit(status);
}

// ---------------------------------------------------------------------------------------------------------------------
// A checkpoint is a complete set of the files you are meant to write, as they should be after milestone N.
const REPLACE_DIRS = ['src', 'migrations', 'docs', path.join('tests', 'fixtures')];
const LEARNER_SCRIPTS = ['ingest.js', 'fixtures.js', 'check-staleness.js', 'rerank-demo.js'];

function listFiles(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? listFiles(path.join(dir, e.name), base) : [path.relative(base, path.join(dir, e.name))]);
}

function checkpoint(name) {
  const dir = path.join(checkpointsDir, name === 'demo-done' ? 'demo-done' : `step-${name}`);
  if (!existsSync(dir) || !statSync(dir).isDirectory()) fail(`No checkpoint "${name}". Use a number from 1 to 9 (demo-done is for the presenter).`);

  const backup = path.join(app, '.checkpoint-backup', new Date().toISOString().replace(/[:.]/g, '-'));
  const save = rel => {
    const from = path.join(app, rel);
    if (!existsSync(from)) return;
    mkdirSync(path.dirname(path.join(backup, rel)), { recursive: true });
    cpSync(from, path.join(backup, rel), { recursive: true });
  };

  for (const rel of REPLACE_DIRS) {
    const from = path.join(dir, rel);
    const to = path.join(app, rel);
    save(rel);
    rmSync(to, { recursive: true, force: true });
    if (existsSync(from)) cpSync(from, to, { recursive: true });
  }
  for (const f of LEARNER_SCRIPTS) {
    const rel = path.join('scripts', f);
    const from = path.join(dir, rel);
    const to = path.join(app, rel);
    if (existsSync(from)) { save(rel); cpSync(from, to, { force: true }); }
    else if (existsSync(to)) { save(rel); rmSync(to, { force: true }); }
  }
  if (existsSync(path.join(dir, 'package.json'))) { save('package.json'); cpSync(path.join(dir, 'package.json'), path.join(app, 'package.json'), { force: true }); }

  // The database is derived from your code and the plan sheet, so it is rebuilt rather than carried across.
  rmSync(path.join(app, '.data'), { recursive: true, force: true });

  say(`Your code now matches the reference solution for milestone ${name}.${existsSync(backup) ? `\nYour previous work was saved in ${path.relative(app, backup)}` : ''}`);
  say('The database was cleared too. If this milestone is 3 or later, run  npm run ingest  to fill it again.');
  say('Run `npm test` to confirm, then carry on with the next milestone.');
}

switch (command) {
  case 'doctor': await doctor(); break;
  case 'baseline': baseline(); break;
  case 'start': start(String(arg)); break;
  case 'step': step(String(arg)); break;
  case 'checkpoint': checkpoint(String(arg)); break;
  default: fail('Usage: node scripts/lab.mjs <doctor | baseline | start N | step N | checkpoint N>');
}

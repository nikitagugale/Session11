// Shared helpers for the lab's checks. They read YOUR work and never change it: anything that writes runs in a scratch folder.
// This file is outside the folder you open on purpose: it holds the answers to some of the milestones.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const KIT = path.resolve(here, '..', '..');
export const APP = path.join(KIT, 'faq-bot');
export const MUTANTS = path.join(KIT, 'checks', 'mutants');

/** Import one of YOUR modules fresh, so an edit made after an earlier import is seen. */
export const load = rel => import(`${pathToFileURL(path.join(APP, rel)).href}?t=${Date.now()}${Math.random()}`);

export const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
export const normalise = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export const readText = rel => readFileSync(path.join(APP, rel), 'utf8');

/** The plan sheet, read by the check's own parser (not by your chunker). */
export function sheet(file = path.join(APP, 'data', 'plan-docs.md')) {
  const markdown = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const plans = markdown.split(/^(?=## )/m).filter(s => s.startsWith('## ')).map(section => {
    const name = /^## (.+)$/m.exec(section)[1].trim();
    return {
      name,
      id: `plan-${slug(name)}`,
      section: section.trimEnd(),
      priceLine: /^Price:.*$/m.exec(section)?.[0] ?? null,
      price: /^Price:\s*(\$[\d.]+)/m.exec(section)?.[1] ?? null,
      bullets: [...section.matchAll(/^- (.+)$/gm)].map(m => m[1]),
    };
  });
  return { markdown, plans, byId: Object.fromEntries(plans.map(p => [p.id, p])) };
}

const cleanups = [];
export function scratch(prefix = 'dd6-check-') {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  cleanups.push(dir);
  return dir;
}
export function cleanup() {
  for (const d of cleanups.splice(0)) rmSync(d, { recursive: true, force: true });
}

/** Run one of YOUR scripts with Node, from your project folder (or a scratch copy of it), with extra environment variables. */
export function run(script, { env = {}, args = [], cwd = APP, timeout = 120000 } = {}) {
  const r = spawnSync(process.execPath, [script, ...args], { cwd, env: { ...process.env, ...env }, encoding: 'utf8', timeout, killSignal: 'SIGKILL' });
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '', out: `${r.stdout ?? ''}${r.stderr ?? ''}`, timedOut: r.error?.code === 'ETIMEDOUT' };
}

/** Run an npm script. On Windows npm is a .cmd file, so it needs a shell there. */
export function npmRun(name, { env = {}, cwd = APP, timeout = 120000 } = {}) {
  const options = { cwd, env: { ...process.env, ...env }, encoding: 'utf8', timeout, killSignal: 'SIGKILL' };
  // One command string with the shell, so that Node 24 does not print the DEP0190 warning about arguments passed to a shell.
  const r = process.platform === 'win32' ? spawnSync(`npm run --silent ${name}`, { ...options, shell: true }) : spawnSync('npm', ['run', '--silent', name], options);
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '', out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

export const ingest = (env = {}, cwd = APP) => run('scripts/ingest.js', { env, cwd });

/** Open the (scratch) database with YOUR migrations applied, run fn(pg), and close it. */
export async function withDb(dataDir, fn) {
  const { openDb } = await load('src/db.js');
  const db = await openDb({ dataDir });
  try { return await fn(db.pg); } finally { await db.close(); }
}

/**
 * A scratch copy of YOUR project, with some files swapped for deliberately broken ones from checks/mutants/.
 * Used to prove that your tests can fail. node_modules is shared, not copied.
 */
export function mutantCopy(swaps) {
  const dir = scratch('dd6-mutant-');
  cpSync(APP, dir, {
    recursive: true,
    filter: p => !/[\\/](node_modules|\.git|\.data|\.lab|\.checkpoint-backup)([\\/]|$)/.test(p) && !p.endsWith(`${path.sep}tests${path.sep}steps`),
  });
  symlinkSync(path.join(APP, 'node_modules'), path.join(dir, 'node_modules'), 'junction');
  for (const [target, mutant] of Object.entries(swaps)) cpSync(path.join(MUTANTS, mutant), path.join(dir, target));
  return dir;
}

export const hasFile = rel => existsSync(path.join(APP, rel));

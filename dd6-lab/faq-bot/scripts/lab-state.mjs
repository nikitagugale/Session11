// Your progress on this machine: when you started each milestone, and which hints you took. It lives in .lab/state.json.
// Lab fixture: please leave it alone.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const app = fileURLToPath(new URL('..', import.meta.url)).replace(/[\\/]$/, '');
const file = path.join(app, '.lab', 'state.json');

export function readState() {
  try {
    const s = JSON.parse(readFileSync(file, 'utf8'));
    return { started: s.started ?? {}, hints: s.hints ?? {} };
  } catch {
    return { started: {}, hints: {} };
  }
}

export function writeState(state) {
  if (!existsSync(path.dirname(file))) mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(state, null, 2));
}

/** Starts the clock for milestone n, unless it is already running. Returns the start time (ISO text). */
export function markStarted(n) {
  const state = readState();
  const key = String(n);
  if (!state.started[key]) {
    state.started[key] = new Date().toISOString();
    writeState(state);
  }
  return state.started[key];
}

export function minutesSinceStart(n) {
  const at = readState().started[String(n)];
  return at ? (Date.now() - new Date(at).getTime()) / 60000 : null;
}

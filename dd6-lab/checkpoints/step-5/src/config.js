// Settings every script shares. Lab fixture: please leave it alone.
// The environment variables exist so the lab's checks can run your code against a scratch database and a scratch copy of the
// plan sheet without touching yours.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const abs = p => (path.isAbsolute(p) || p.startsWith('memory://') ? p : path.resolve(ROOT, p));

export const config = {
  /** Where the database lives (a folder). `memory://` keeps it in memory. */
  dataDir: abs(process.env.FAQ_DATA_DIR ?? '.data/pg'),
  /** The plan sheet: the only source of plan names, prices and features. */
  planDocs: abs(process.env.PLAN_DOCS ?? 'data/plan-docs.md'),
  /** The roaming policy: the second document type, for the homework (milestone 9). */
  roamingDocs: abs(process.env.ROAMING_DOCS ?? 'data/roaming-policy.md'),
  /** How many chunks `retrieve` returns unless you ask for another number. */
  defaultK: 5,
  /** What the bot must say, word for word, when the plan sheet does not have the answer. */
  notFound: "I don't have that in the current plan list — let me check with the team.",
};

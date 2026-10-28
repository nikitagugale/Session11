// `npm run sql -- "SELECT ..."` runs one SQL statement against the lab database and prints the rows as a table.
//   npm run sql -- "SELECT chunk_id, plan_name FROM plan_chunks ORDER BY chunk_id"
//   npm run sql -- "SELECT count(*) FROM plan_chunks"
// A vector column is shown as its length, because 1536 numbers is not a table. Stop other scripts first: the database
// folder can only be open in one process at a time.
import { withDb } from '../src/db.js';

const statement = process.argv.slice(2).join(' ').trim();
if (!statement) {
  console.error('Give it one SQL statement, for example:  npm run sql -- "SELECT count(*) FROM plan_chunks"');
  process.exit(2);
}

const show = v => {
  if (v === null || v === undefined) return 'NULL';
  if (Array.isArray(v)) return `vector(${v.length})`;
  if (typeof v === 'string' && /^\[-?[\d.e+-]+(,-?[\d.e+-]+){20,}\]$/.test(v)) return `vector(${v.split(',').length})`;
  if (v instanceof Date) return v.toISOString();
  return String(v).replace(/\s+/g, ' ');
};

try {
  const result = await withDb(pg => pg.query(statement));
  const cols = result.fields.map(f => f.name);
  if (!cols.length) {
    console.log('OK');
  } else {
    const rows = result.rows.map(r => cols.map(c => show(r[c]).slice(0, 70)));
    const widths = cols.map((c, i) => Math.max(c.length, ...rows.map(r => r[i].length)));
    console.log(cols.map((c, i) => c.padEnd(widths[i])).join('  '));
    console.log(widths.map(w => '-'.repeat(w)).join('  '));
    for (const r of rows) console.log(r.map((x, i) => x.padEnd(widths[i])).join('  '));
    console.log(`\n(${rows.length} row${rows.length === 1 ? '' : 's'})`);
  }
} catch (e) {
  console.error(`That did not work: ${e.message}`);
  process.exit(1);
}

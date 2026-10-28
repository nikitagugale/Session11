// `npm run reset-db` throws the database away so you can start again from nothing (then run `npm run ingest`).
import { existsSync, rmSync } from 'node:fs';
import { config } from '../src/config.js';

if (config.dataDir.startsWith('memory://')) process.exit(0);
const lock = `${config.dataDir}.lock`;
for (const p of [config.dataDir, lock]) if (existsSync(p)) rmSync(p, { recursive: true, force: true });
console.log('The database is gone. Run  npm run ingest  to fill it again.');

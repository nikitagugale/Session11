# faq-bot: notes for Claude Code

A small Node project (plain JavaScript, ES modules, Node 20+): a telecom FAQ bot that must answer only from the company's plan
documents, and cite the chunk of the document behind every claim. Read this first. It is the project's context file.

## Stack, and what stands in for what
- **Database**: real Postgres with the pgvector extension, through PGlite (Postgres compiled to WebAssembly). Open it with `openDb()` or `withDb(fn)` from `src/db.js`. It runs every `migrations/*.sql` file once. Never create your own connection.
- **Embeddings**: `embed(text)` in `src/lib/embed.js` is a stand-in for an embeddings API: 1536 numbers, no network. `toPgVector(vector)` writes a vector as pgvector text. Pass it as a parameter and cast with `::vector`.
- **The model**: `generate({ system, user })` in `src/model.js` is a stand-in for the Claude API. **Do not call a real API and do not add a dependency.** Read the comment at the top of the file: it says exactly how the stand-in reads a prompt.
- **Settings**: `src/config.js` has the paths (`planDocs`, `roamingDocs`), `defaultK`, and `notFound`, the sentence the bot must say when the answer is not in the documents.

## How the project is organised
- The documents are in `data/`. `data/plan-docs.md` has one `## ` heading per plan, then a `Price:` line, then a list of features.
- The code that the milestones ask you to write: `src/chunk.js`, `src/retrieve.js`, `src/prompt.js`, `src/answer.js`, `scripts/ingest.js`, `scripts/fixtures.js`, `scripts/check-staleness.js`, SQL files in `migrations/`, notes in `docs/`, question pairs in `tests/fixtures/`, and the `scripts` section of `package.json`.
- Do **not** edit `src/config.js`, `src/db.js`, `src/model.js`, `src/lib/*`, `data/*`, `tests/baseline/`, or the other files in `scripts/` unless the user says to. They are the lab's fixtures.

## Contracts the checks rely on (never rename)
- `chunkPlans(markdown)` returns `[{ chunkId, planName, text }]`. `retrieve(pg, question, { k })` returns `[{ chunkId, planName, text, score }]`, best first. `buildPrompt({ chunks, question })` returns `{ system, user }`. `answer(pg, question, { model, k })` returns `{ answer, citations, sources, retrieved }`.
- The table is `plan_chunks(chunk_id, plan_name, text, embedding vector(1536))`, and `ingest_meta(key, value)` holds the row `last_ingested_at`.
- The user's milestone card (in `LAB-GUIDE.md`) holds the interface contract for each milestone. **It is binding.** Follow it exactly, and say so if the user's request conflicts with it.

## Rules for this session
- The database folder can only be open in one process at a time. Always close it (`await close()`, or use `withDb`). Never leave a script running in the background, and do not run anything that never exits.
- To look at the data: `npm run sql -- "SELECT ..."`. To fill it: `npm run ingest`. To start again: `npm run reset-db`.
- Do not hard-code file paths to the documents or the database. Use `config`. The lab's checks run your code against scratch copies by changing the environment.
- `src/chunk.js` and `src/answer.js` start as starter code. They run, and they are not good enough. The starter is unreviewed: say what is wrong with it before you change it.
- Run `npm test` before you say you are done. It must stay green.
- You may run `npm run step -- N`, `npm run chunks`, `npm run retrieve -- "..."`, `npm run ask -- "..."`, `npm run sql -- "..."`, `npm run ingest` and `npm run fixtures` to check work. Do not run `npm run hint` or `npm run checkpoint`: they are the user's tools.

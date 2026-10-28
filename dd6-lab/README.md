# DD6 Lab Kit: Build a Grounded AI Feature
**PwC Full-Stack AI track · Wed 28 Oct 2026 · 08:00–11:00 IST**

A phone company's FAQ bot told a customer the price of the Unlimited Plus plan, and the price was invented. Over eight
milestones you will find out why, build the pipeline that ties every answer to a source (chunk, store, retrieve, prompt, cite),
prove it works, and make sure it cannot go stale in silence.

**This is a milestone lab, not a follow-along.** There are no prompts to paste. Each milestone is a ticket with a goal, an interface
contract and success criteria, in `LAB-GUIDE.md`. You decide how to get there, and you work at your own pace. The facilitator checks
in twice, after milestone 4 and after milestone 8, to walk through the steps, the tests and the solutions.

## Setup: at the start of the session (about 2 minutes)

Needs **Node 20 or newer** and access to the npm registry. Save `dd6-lab-kit.zip` in your home folder, then run this in a terminal on
the lab VM. It runs happily in the background while the session carries on:

```bash
cd ~
unzip -q dd6-lab-kit.zip     # or: python3 -m zipfile -e dd6-lab-kit.zip .
cd dd6-lab/faq-bot
npm ci                       # one-time install, about a minute
npm test                     # should end with: pass 18
npm run doctor               # should end with: Ready.
```

When `npm test` is green, open **only the `faq-bot` folder** in VS Code (File, Open Folder), then open `LAB-GUIDE.md`. Do not open
`dd6-lab` itself. The folders next to `faq-bot` (`hints/`, `checks/`, `checkpoints/`) hold the answers, and Claude Code reads
everything in the folder you open.

If `npm test` does not show `pass 18`, paste the last line of the error into the chat and carry on listening. It gets fixed at the
first break.

**There is nothing else to install.** No Postgres, no Docker, no API key: the database is Postgres running inside Node (PGlite, with
the pgvector extension), the embedder and the model are small stand-ins inside the project, and every document in `data/` is made up.

## What is in the folder you open (`faq-bot/`)

| Path | What it is |
|---|---|
| `LAB-GUIDE.md` | **Your milestone cards.** Read the card before you start each milestone. |
| `LAB-LOG.md` | Your evidence log. Two or three lines per milestone. |
| `data/` | The plan sheet (`plan-docs.md`) and the roaming policy (homework). Made up. |
| `src/chunk.js`, `src/retrieve.js`, `src/prompt.js`, `src/answer.js` | The code you write. `chunk.js` and `answer.js` start as **starter code** that runs and is not good enough. |
| `scripts/ingest.js`, `scripts/fixtures.js`, `scripts/check-staleness.js` | Scripts you write (ingest starts as a stub). |
| `migrations/`, `docs/`, `tests/fixtures/` | Where your SQL, your notes and your question pairs go. |
| everything else | The lab's fixtures. Please leave them alone. |

## The commands

`npm run help` lists them all on one screen, and the participant handbook explains each in depth.

| Command | What it does |
|---|---|
| `npm run ask -- "your question"` | Asks the FAQ bot. Shows the answer, its citations and its sources. |
| `npm run chunks` | Runs your `chunkPlans()` on the plan sheet and flags what is wrong with it. |
| `npm run ingest` | Fills the database from the plan sheet (milestone 3). |
| `npm run retrieve -- "your question"` | Shows which chunks your `retrieve()` returns, best first. |
| `npm run sql -- "SELECT ..."` | Runs one SQL statement against the lab database. |
| `npm run reset-db` | Throws the database away so you can start again. |
| `npm run start -- N` | Starts the clock for milestone N and shows when its hints open. |
| `npm run step -- N` | Checks milestone N (1 to 9) against its success criteria. |
| `npm run progress` | Checks every milestone and prints one line to paste in the chat. |
| `npm run hint -- N` | The next hint for milestone N. Three hints, then `--reveal` for the reference solution. |
| `npm run checkpoint -- N` | Replaces your work with the reference solution for milestone N. Your old work is saved in `.checkpoint-backup/`. |
| `npm test` | The lab's own tests. They stay green all session. |
| `npm run doctor` | Checks Node, the install, the database and the kit layout. |
| `npm run baseline` | Commits the starting point with git, so the diff shows only what you change. |

## What is real and what stands in

| In this kit | Stands in for | Notes |
|---|---|---|
| PGlite with pgvector (`src/db.js`) | Azure Database for PostgreSQL (flexible server) with pgvector | Real Postgres and real pgvector: the same SQL runs in production. |
| `embed()` in `src/lib/embed.js` | An embeddings API (Azure OpenAI or another) | Hashes words into 1536 numbers. Real embeddings capture meaning, not just shared words. |
| `generate()` in `src/model.js` | The Claude API (or Azure AI Foundry) | A rule-based stand-in: same input, same output, no network. See the comment at the top of the file. |
| `data/*.md` | Azure Blob Storage, a CMS, a plan database | A made-up plan sheet and roaming policy. |

## If something goes wrong

| Symptom | Fix |
|---|---|
| `unzip: command not found` | Use Python instead: `python3 -m zipfile -e dd6-lab-kit.zip .` |
| `cannot find or open dd6-lab-kit.zip` | It is probably in `~/Downloads`. `cd` there, unzip, then `cd dd6-lab/faq-bot`. |
| `Unsupported engine`, `SyntaxError` | Node is too old. `node --version` has to say 20 or newer. |
| `npm ERR! ... ETIMEDOUT` or a proxy error | The VM cannot reach the npm registry. Tell the facilitator. |
| "The database folder is in use by another process" | Another script of yours is still running. Wait for it, or stop it. |
| `relation "plan_chunks" does not exist` | The table is not created yet (milestone 3), or you cleared the database: run `npm run ingest`. |
| `npm run hint` or `npm run doctor` says `hints/` is missing | You opened the wrong folder or moved something. Keep `faq-bot/`, `hints/`, `checks/` and `checkpoints/` side by side inside `dd6-lab/`. |

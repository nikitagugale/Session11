# DD6 Lab Guide: a FAQ bot that does not make things up

A phone company has an AI FAQ bot. A customer asked it for the price of the Unlimited Plus plan. The bot gave a price with
confidence, and that price is not in the plan sheet. Over eight milestones you will find out why, build the pipeline that ties
every answer to a source (chunk, store, retrieve, prompt, cite), prove it works, and make sure it cannot go stale in silence.

**There are no prompts to paste in this lab.** Each milestone is a ticket: a goal, what you are given, a contract, and success
criteria. You decide how to get there, with Claude Code (writing your own brief), by hand, or both.

**You work by yourself, at your own pace.** The facilitator does not stop the room after each milestone. They check in twice:
after milestone 4 and after milestone 8. Each time they walk through the steps, the tests and the solutions for the milestones
before it. Until then, you have the cards, the checks, the hints and the chat.

---

## How the lab runs

| Block | Milestones | About how long | Then |
|---|---|---|---|
| **A** | 1, 2, 3, 4 | 45 minutes | The facilitator's first summary (steps, tests, solutions for 1 to 4) |
| **B** | 5, 6, 7, 8 | 38 minutes | The facilitator's second summary (steps, tests, solutions for 5 to 8) |
| Homework | 9 | about an hour | Your own time |

- **Each card has a pace** (for example "aim for 8 minutes") and the times when its hints open. They are a guide. A milestone
  that takes you twice as long is fine, and a slow milestone costs you nothing, because syncing is free (see below).
- **Check yourself.** `npm run step -- N` runs the check for milestone N and tells you which success criteria are not met yet. You
  never need to ask anyone whether you are done: the check says so.
- **Hints.** There are three hints per milestone. The clock for a milestone starts the first time you run `npm run start -- N`,
  `npm run step -- N` or `npm run hint -- N`. Each hint opens a few minutes later. If you run `npm run hint -- N` too early, it
  tells you how long to wait. That is a nudge, not a lock: `npm run hint -- N --now` takes it anyway, and notes that it was early.
  **Try first.** Most of the learning is in the first few minutes of being stuck.
- **Sync.** `npm run checkpoint -- N` replaces your work with the reference solution for milestone N, so that the next milestone
  starts from known-good code. Your own work is saved first, in `.checkpoint-backup/`, and the database is cleared (run
  `npm run ingest` again). You can use it at any time. If you sync, try to explain the milestone in one sentence in your log.
- **The reveal.** `npm run hint -- N --reveal` shows the reference brief (a good prompt), the approach and the common mistakes. The
  facilitator opens it at the summaries. Read it earlier if you must, and say so in your log.
- **The chat.** Teaching assistants are watching it. "Stuck on 4, retrieval returns 1 row" gets a better answer than "it's broken".
- **The pulse.** At the two summaries you may be asked to run `npm run progress` and paste its last line (it starts with PULSE).
- **Finished early?** Every card has stretch goals. They are worth doing. Or help a neighbour: explaining a fix is the quickest
  way to find out whether you understand it.

## Ground rules

1. **Read the card before you open Claude.** Know what "done" looks like first.
2. **Write your own brief.** The success criteria on the card are your acceptance criteria. A good brief says the context, the
   task, the constraints, how you will know it worked, and how to check (see the template at the end).
3. **Review every change.** Read the diff. Run the check. Claude is quick, and it is also confident when it is wrong.
4. **Understand each fix well enough to explain it.** Several milestones ask for one sentence on why something was wrong.
5. **Hints are free once they open.** Taking one early is allowed. Taking one without trying first is how you miss the learning.
6. **Every file in this kit is made up.** The plan sheet, the prices and the roaming policy are not a real company's. There is no
   API key and no real customer data anywhere.

## Your commands

`npm run help` lists everything. The ones you will use all the time:

| Command | What it does |
|---|---|
| `npm run ask -- "your question"` | Asks the FAQ bot. Shows the answer, its citations and its sources. `--json` shows the full result. |
| `npm run chunks` | Runs YOUR `chunkPlans()` on the plan sheet and shows what it made, and what is wrong with it. |
| `npm run ingest` | Fills the database from the plan sheet (the script you write in milestone 3). |
| `npm run retrieve -- "your question"` | Shows which chunks YOUR `retrieve()` returns, best first. `--k 3` changes how many. |
| `npm run sql -- "SELECT ..."` | Runs one SQL statement against the lab database and prints the rows. |
| `npm run reset-db` | Throws the database away so you can start again (then `npm run ingest`). |
| `npm run step -- N` | Checks milestone N against its success criteria (1 to 9). |
| `npm run progress` | Checks every milestone and prints one line to paste in the chat. Takes about a minute. |
| `npm run hint -- N` | The next hint for milestone N (`--now` early, `--again` to re-read, `--reveal` for the reference). |
| `npm run checkpoint -- N` | Replaces your work with the reference solution for milestone N. |
| `npm test` | The lab's own tests. They stay green all session. |

The database can only be open in one process at a time. If a script says the folder is in use, another script of yours is still
running. Wait for it, or stop it.

## What is yours to change, and what is not

Yours: `src/chunk.js`, `src/retrieve.js`, `src/prompt.js`, `src/answer.js`, `scripts/ingest.js`, `scripts/fixtures.js`,
`scripts/check-staleness.js`, `migrations/`, `docs/`, `tests/fixtures/`, `LAB-LOG.md`, and the `scripts` section of `package.json`.

Not yours (the lab's fixtures): `src/config.js`, `src/db.js`, `src/model.js`, `src/lib/`, the other files in `scripts/`,
`data/`, `tests/baseline/`. You may add new files of your own in `src/` and `scripts/`. You never change the words in `data/`
(milestone 8 asks you to touch the plan sheet, which changes its modified time and nothing else).

## The stand-in model

There is no API key in this lab. `src/model.js` stands in for the Claude API: messages in, text out, the same every time. It
reads your prompt the way a careful but literal assistant would. **Read the comment at the top of the file before milestone 5.**
In short: if the system prompt does not tell it to use only the context, it makes things up (that is milestone 1); if it does, it
answers only from the chunks it is given. One more thing to know: it answers about the plan whose name it finds in the question.
So a question about a plan that does not exist, but whose name starts like one that does ("Unlimited Ultra"), gets the answer for
the real one ("Unlimited"). A real model may do better, and no wording of your prompt changes this stand-in. If you find a case
like that, it is a finding for your log, not a bug in your prompt.

---

## Milestone 1 · Reproduce the hallucination

**Ticket FAQ-101** · aim for **8 minutes** · hints open at **+3, +5, +7**

**Why this matters.** A customer asked the bot for the price of the Unlimited Plus plan, and the bot invented one. Before anything is
fixed, we keep the evidence. In milestone 6 you will ask the same question again to prove the fix.

**Your goal.** Reproduce the bug, and record six facts about it.

**You are given.** The bot as it stands (`src/answer.js`), the command that asks it a question (`npm run ask`), and the plan sheet
(`data/plan-docs.md`).

**Interface contract.** Create `docs/findings.json` with these keys, replacing every `"?"` with what you found:

```json
{
  "question": "?",
  "inventedAnswer": "?",
  "inventedPrice": "?",
  "realPrice": "?",
  "inventedPriceInSheet": "?",
  "citationsReturned": "?"
}
```

| Key | Type | Meaning |
|---|---|---|
| `question` | text | The question you asked: *what's the price of the Unlimited Plus plan?* |
| `inventedAnswer` | text | The bot's answer, copied exactly |
| `inventedPrice` | number | The price inside that answer, with no `$` |
| `realPrice` | number | What the plan sheet says that plan costs |
| `inventedPriceInSheet` | true or false | Does the made-up price appear anywhere in the plan sheet? |
| `citationsReturned` | number | How many citations the bot gave with its answer |

**Success criteria.**
- **Must:** ☐ the six values are filled in, and each one comes from something you ran or searched  ☐ `npm run step -- 1` passes  ☐ your log says which command gave you each fact
- **Stretch:** ☐ ask two other questions about plan details and note which answers are invented  ☐ say in one sentence why the answer sounds so sure

**Where to start.**
- How would you ask the bot the question? What does it print under the answer?
- Where does the bot get its answer from? (You can read `src/answer.js`, but you do not have to.)
- How would you find out what the plan sheet says about this plan? How would you check whether a price appears in it?

**Verify yourself.** `npm run step -- 1`

---

## Milestone 2 · Chunk the plan sheet

**Ticket FAQ-102** · aim for **10 minutes** · hints open at **+4, +7, +10**

**Why this matters.** Retrieval can only find what a chunk holds. If a plan's price ends up in a different chunk from its name, no
search can put them back together, and the bot will say something confident about the wrong plan, or nothing at all.

**Your goal.** Replace the starter chunker so that every plan is exactly one chunk, with its name, its price and its features together.

**You are given.** A starter chunker in `src/chunk.js` that cuts the text into pieces of a fixed length. It runs. It is not good
enough. `npm run chunks` shows what any chunker does to the sheet and flags what is wrong.

**Interface contract.**
- Keep the file `src/chunk.js` and the export `chunkPlans(markdown)`. It takes the text of `data/plan-docs.md` and returns an array of `{ chunkId, planName, text }`, all text.
- One chunk per plan. `planName` is the plan's heading, exactly. `text` is the plan's section as written in the sheet: the heading, the price line and every feature, verbatim.
- `chunkId` is `plan-` followed by the name in lower case, with every run of other characters (anything that is not a letter or a number) replaced by one dash, and no dash at the start or the end of the name part. For example `Unlimited Plus` becomes `plan-unlimited-plus`, and a plan called `Gold!` would become `plan-gold`, not `plan-gold-`. The id comes from the name, so it does not change when a plan is added or moved.
- The title and the intro lines before the first plan belong to no plan. They are not a chunk.
- It must work when the sheet has Windows line endings. A sub-heading (`###`) or a blank line inside a plan must not start a new chunk.

**Success criteria.**
- **Must:** ☐ `npm run chunks` ends with "Every plan is in one chunk"  ☐ `npm run step -- 2` passes  ☐ your log says, in one sentence, why the starter was a problem
- **Stretch:** ☐ what would happen to search quality if the whole sheet were one chunk? What if each feature were its own chunk?  ☐ what would you change if a plan's price line were missing in the sheet?

**Where to start.**
- Run `npm run chunks` on the starter and read the problems it lists. What do they have in common?
- Look at how `data/plan-docs.md` is written. What marks where one plan ends and the next begins?
- What does a chunk have to keep together to be able to answer "how much is X?"

**Verify yourself.** `npm run chunks`, then `npm run step -- 2`

---

## Milestone 3 · Build the ingestion pipeline

**Ticket FAQ-103** · aim for **13 minutes** · hints open at **+5, +9, +12**

**Why this matters.** Every question will be matched against what is in the database. If ingestion is wrong, or can only be run once,
or leaves old plans behind, the bot will quote prices that no longer exist.

**Your goal.** Write the script that chunks the plan sheet, embeds every chunk, and stores it in the database, so that it is safe to
run again and again.

**You are given.** `openDb()` in `src/db.js` (real Postgres with pgvector, in-process; it runs every `.sql` file in `migrations/` once,
and returns `{ pg, close }`), `embed(text)` and `toPgVector(vector)` in `src/lib/embed.js`, the plan sheet's path in `config.planDocs`,
your chunker from milestone 2, and `npm run sql` to look inside the database. The course slide creates the table like this:

```sql
CREATE TABLE plan_chunks (
  chunk_id text PRIMARY KEY,
  plan_name text,
  text text,
  embedding vector(1536)
);
CREATE INDEX ON plan_chunks USING ivfflat (embedding vector_cosine_ops);
```

**Interface contract.**
- A migration in `migrations/` (any file name that ends in `.sql`) creates the table `plan_chunks` with the four columns above, and a table `ingest_meta(key text primary key, value text)`.
- `scripts/ingest.js` (`npm run ingest`) reads the plan sheet from `config.planDocs` (never a path typed into the script), chunks it, embeds each chunk's text, and stores every chunk in `plan_chunks`.
- Running it again must not fail or duplicate anything. A plan whose price changed must be updated, with a new embedding. A plan that was removed from the sheet must be deleted from the table.
- At the end of every run, even one that changes no chunk, it records the time, as an ISO text such as `2026-10-28T08:15:00.000Z`, in `ingest_meta` under the key `last_ingested_at`. (That one row is the only thing that moves on a second run.)
- Close the database when you are done, or the next script will find the folder locked.

**Success criteria.**
- **Must:** ☐ `npm run ingest` runs, and `npm run sql -- "SELECT count(*) FROM plan_chunks"` says 12  ☐ a second run leaves the same 12 chunks, with no duplicates  ☐ a changed, removed or added plan is reflected after the next run  ☐ `npm run step -- 3` passes
- **Stretch:** ☐ make ingest print one line: how many chunks were added, updated and removed  ☐ say in your log what a customer would be told about a plan that was removed from the sheet, if ingest never deleted it

**Where to start.**
- Which three jobs does the script have to do? In what order?
- What should happen when a chunk id is already in the table? What about a plan that is no longer in the sheet?
- How do you pass a list of 1536 numbers from JavaScript to a `vector` column? Which helper turns it into text?
- How will you check that it worked? (`npm run sql` is your window into the database.)

**Verify yourself.** `npm run ingest`, then `npm run step -- 3`

---

## Milestone 4 · Write and test retrieval

**Ticket FAQ-104** · aim for **13 minutes** · hints open at **+5, +8, +11**

**Why this matters.** Retrieval decides what the model gets to see. Most "the AI is wrong" complaints are really "retrieval was wrong"
complaints. You can only fix what you can see, so you will test it with real questions and look at what comes back.

**Your goal.** Write `retrieve()`: given a question, return the chunks that match it best.

**You are given.** The filled table from milestone 3, `embed()` and `toPgVector()`, and `npm run retrieve -- "a question"` to see what
your function returns. pgvector's `<=>` operator gives the cosine **distance** between two vectors: 0 means identical.

**Interface contract.**
- `src/retrieve.js` exports `retrieve(pg, question, { k = 5 } = {})`, where `pg` is the database from `openDb()`.
- It returns an array of `{ chunkId, planName, text, score }`, best match first. `score` is the cosine **similarity** (a bigger number is a better match), so it is 1 minus the distance.
- It returns `k` rows. If `k` is bigger than the number of chunks, it returns all of them.
- It does not change the table.

**Success criteria.**
- **Must:** ☐ `npm run retrieve -- "family data plan"` and two more questions of your own show sensible results  ☐ `npm run step -- 4` passes  ☐ your log says what you looked at to decide the results were sensible
- **Stretch:** ☐ for "family data plan", is the first result the plan the customer asked about? Write one sentence on why, or why not  ☐ the demo fixed a result like that with a rerank step: can you do it with the helper `judgeRelevance` in `src/model.js`?

**Where to start.**
- Does `<=>` mean "similar" or "different"? How will you turn it into a score where bigger is better, and what order do you need?
- How will you get the question into the same kind of vector as the chunks?
- How will you know your function is right? What will you look at?
- If `npm run retrieve` returns fewer rows than you asked for, is your JavaScript to blame, or the query itself? How can you tell? (`npm run sql` runs any query, and `EXPLAIN` in front of a query shows how Postgres will run it.)

**Verify yourself.** `npm run retrieve -- "family data plan"`, then `npm run step -- 4`. The check builds its own fresh database from your `migrations/` folder each time, so a repair made by hand to your own database does not change its result.

---

## Milestone 5 · Write the grounded prompt

**Ticket FAQ-105** · aim for **8 minutes** · hints open at **+3, +5, +7**

**Why this matters.** The system prompt is where the rules of a feature live. An instruction to answer "only from the context" is a
promise, not a guarantee, but without it the model will happily fill any gap with something plausible.

**Your goal.** Write the prompt that makes the model answer only from the chunks it is given, cite them, and say one fixed sentence
when the answer is not there.

**You are given.** The stand-in model (read the comment at the top of `src/model.js` to see how it reads a prompt) and the sentence
the bot must say when the answer is not in the plan sheet. It is `config.notFound`:

> I don't have that in the current plan list — let me check with the team.

**Interface contract.**
- `src/prompt.js` exports `buildPrompt({ chunks, question })`, where `chunks` is an array of `{ chunkId, planName, text }`. It returns `{ system, user }`, both text.
- The **system** text tells the model: to answer using ONLY the context; to cite the chunk id of every plan it relies on, in brackets, with an example such as `[chunk_id: plan-07]`; and, if the answer is not in the context, to respond exactly with the not-found sentence, in double quotes.
- The **user** text has a line `CONTEXT:`, then each chunk as a line `[chunk_id: <the id>]` followed by its text (blank line between chunks), then a line `QUESTION: ` followed by the question, unchanged.

**Success criteria.**
- **Must:** ☐ with the answer in the context, the model answers from it and cites the chunk  ☐ with the answer missing, or with an empty context, it says the not-found sentence exactly  ☐ `npm run step -- 5` passes
- **Stretch:** ☐ remove one rule at a time from your system prompt and run the check: which missing rule does it catch first, and what does that tell you?  ☐ what would a real model do with a context that holds an instruction, such as "ignore the rules above"?

**Where to start.**
- If you were the model, what exactly would you need to be told so that you could not "helpfully" fill a gap?
- Which of the three rules is easiest to forget? Which one is easiest to get slightly wrong?
- Where does the model see the chunk ids? What would happen if it could not?

**Verify yourself.** `npm run step -- 5`

---

## Milestone 6 · Re-run the original bug

**Ticket FAQ-106** · aim for **8 minutes** · hints open at **+3, +5, +7**

**Why this matters.** Every piece works on its own. A feature is only done when a question goes in at one end and a checkable answer
comes out of the other, and the bug you started with is gone.

**Your goal.** Turn `answer()` from "ask the model" into a grounded answer: retrieve, prompt, generate, and return checkable citations.
Then ask the question from milestone 1 again.

**You are given.** `retrieve()` (milestone 4), `buildPrompt()` (milestone 5), `generate()` in `src/model.js`, the starter `src/answer.js`,
and `npm run ask`.

**Interface contract.**
- `src/answer.js` exports `answer(pg, question, { model, k } = {})`. `model` is an object with a `generate({ system, user })` method, and defaults to the one in `src/model.js`, so a test can pass a different one. `k` defaults to `config.defaultK`.
- It returns `{ answer, citations, sources, retrieved }`: `answer` is the model's text; `citations` is an array of chunk ids the answer cites; `sources` is `{ chunkId, snippet }` for each citation, where `snippet` is that chunk's text; `retrieved` is the chunks that were retrieved.
- **Only chunk ids that were really retrieved may appear in `citations` and `sources`.** If the model cites an id it was never given, that id must not be passed on.
- A not-found answer has `citations` and `sources` empty.

**Success criteria.**
- **Must:** ☐ `npm run ask -- "what's the price of the Unlimited Plus plan?"` gives the real price with a citation, and not the answer in `docs/findings.json`  ☐ a plan that does not exist gets the not-found sentence  ☐ `npm run step -- 6` passes
- **Stretch:** ☐ add a similarity floor: if the best chunk scores below a number you choose, return the not-found sentence without calling the model  ☐ print how long retrieval and the model call each took

**Where to start.**
- What does each piece take in, and what does it give back? How do they fit together?
- How does a citation get from the model's text into the `citations` array? What could go wrong if you trust it?
- How will you test the not-found path? What question would you ask?

**Verify yourself.** `npm run ask -- "what's the price of the Unlimited Plus plan?"`, then `npm run step -- 6`

---

## Milestone 7 · Add fixture tests

**Ticket FAQ-107** · aim for **14 minutes** · hints open at **+5, +9, +13**

**Why this matters.** "It works on the question I tried" is not evidence. On Monday you wrote an evaluation set: questions that are in
scope, at the edge, and out of scope. Now you turn the idea into a test that can fail, and a test that cannot fail proves nothing.

**Your goal.** Write at least 10 known question and answer pairs and a runner for them. The pairs must catch real mistakes.

**You are given.** The whole pipeline in `answer()`, `config.notFound`, and the questions you wrote on Monday (use them if you have
them). The check will run your fixtures on your pipeline, and then on three deliberately broken copies of your project.

**Interface contract.**
- `tests/fixtures/qa.json` is a list of at least 10 pairs. Each pair has a `question` and **either** `expectedCitations` (a non-empty list of chunk ids that must be cited), with an optional `mustContain` (a list of text the answer must contain), **or** `notFound: true`.
- At least 3 pairs are not-found cases, and at least 5 expect a citation. Questions must be different from each other. Every id in `expectedCitations` must be a real chunk id: one from the plan sheet, or (after the homework) one from the roaming policy.
- `scripts/fixtures.js` opens the database, calls `answer()` for every pair, prints `PASS` or `FAIL` with the reason for each, prints how many passed, and exits with a non-zero code if any pair failed.
- Add a script called `fixtures` to `package.json` that runs it.

**Success criteria.**
- **Must:** ☐ `npm run fixtures` passes on your pipeline  ☐ `npm run step -- 7` passes, including the three lines that say your fixtures can fail  ☐ your log says, for any fixture that failed at first, whether it was a retrieval failure or a generation failure
- **Stretch:** ☐ add a pair for a plan whose name is a prefix of another (for example Unlimited and Unlimited Plus)  ☐ write a pair that you think should be answerable but is not: what does that tell you?  ☐ write a pair about a plan that sounds real but is not in the sheet (a name that starts like a real plan). If it will not pass however you word the prompt, that is a finding, not a failure: write in your log which part of the system would have to catch it

**Where to start.**
- Which three kinds of question belong in the set? (Think of Monday.)
- What are three ways this bot could be broken? Which of your questions would catch each one?
- When a pair fails, how will you tell whether retrieval or generation is to blame? Which output shows you?

**Verify yourself.** `npm run fixtures`, then `npm run step -- 7`

---

## Milestone 8 · Add a staleness check

**Ticket FAQ-108** · aim for **7 minutes** · hints open at **+3, +5, +7**

**Why this matters.** A grounded bot is only as current as its last ingest. If a price changes in the sheet and nobody re-ingests, the
bot is confidently, correctly wrong, citing a source that is out of date. Nothing in the answer tells a customer.

**Your goal.** Write a script that fails when the plan sheet has changed since the last ingest, and wire it so that a stale corpus
cannot ship.

**You are given.** The `last_ingested_at` row that your ingest writes (milestone 3), the plan sheet's path in `config.planDocs`, and
a `deploy` script in `package.json` that pretends to ship the bot (`npm run deploy`).

**Interface contract.**
- `scripts/check-staleness.js` compares the plan sheet's modified time with `last_ingested_at`.
- If the sheet is newer, or nothing has been ingested yet, it prints a clear message that says the corpus is **stale** and tells you to run `npm run ingest`, and it exits with a non-zero code.
- Otherwise it prints a short OK message and exits 0.
- It never changes anything.
- Add a script called `predeploy` to `package.json` that runs it. npm runs `predeploy` before `deploy`, and stops if it fails.

**Success criteria.**
- **Must:** ☐ make the sheet newer (run `touch data/plan-docs.md`: it changes the file's modified time and not one word of it), and `npm run deploy` refuses  ☐ run `npm run ingest`, and `npm run deploy` goes ahead  ☐ `npm run step -- 8` passes
- **Stretch:** ☐ a file's modified time changes even if its content does not. How would you avoid a false alarm?  ☐ would you rather re-ingest everything or only the changed plans, for 12 plans? For 12,000?

**Where to start.**
- Which two times are you comparing, and where does each one live?
- What exit code means "something is wrong", and who reads it?
- What should the message say so that someone seeing it at midnight knows what to do?

**Verify yourself.** `touch data/plan-docs.md`, then `npm run deploy`; then `npm run ingest` and `npm run deploy` again; then `npm run step -- 8`. (The check works on its own copies, so it never touches your sheet.)

---

## Homework · Milestone 9 · A second document type

**Ticket FAQ-109** · about an hour, in your own time · hints open at **+10, +20, +30**

**Why this matters.** A feature that answers from one document is a demo. Real FAQ bots read plan sheets, policies and terms, each
written differently. Your pipeline should take a second document type without breaking the first.

**Your goal.** Add the roaming policy (`data/roaming-policy.md`) to the pipeline, so that the bot can answer roaming questions with citations.

**You are given.** The roaming policy, `config.roamingDocs` (its path), and your pipeline from milestones 2 to 8. The policy has one
section for each zone (its countries, its daily pass price and its details) and a section of rules for all zones. It has no
"Price:" lines.

**Interface contract.**
- One run of `node scripts/ingest.js` ingests both documents into the same table.
- Roaming chunk ids are `roaming-` followed by the heading in lower case with dashes, for example `roaming-zone-c-asia-pacific`. Each zone stays whole: its countries, its daily pass and its details.
- The clean-up step must delete only chunks that are in neither document.
- The plan questions still work, and so does everything you built before: when you are done, `npm run progress` should still show milestones 1 to 8 green.
- Leave `src/chunk.js` as milestone 2 describes it (the one export, `chunkPlans`) and put any new code in a file of its own. The check for milestone 7 swaps `src/chunk.js` for a broken copy to prove your tests can fail, and it cannot run if another file imports a name that the broken copy does not have.

**Success criteria.**
- **Must:** ☐ "do you offer international roaming in Japan?" is answered, with a citation of the Asia-Pacific zone  ☐ "what does a daily roaming pass cost in Germany?" gives the Europe and Americas price  ☐ the plan questions still work  ☐ `npm run step -- 9` passes
- **Stretch:** ☐ update your fixtures: the Japan question used to be a not-found case  ☐ make your staleness check look at both documents  ☐ in your log, describe how you would protect an endpoint that serves `answer()`, using last Saturday's ideas: one scope per tool action, and a check that the caller may see the document

---

## Appendix · How to brief an AI coding assistant

This is a template, not a prompt for any milestone. A good brief makes the result checkable.

| Part | Say |
|---|---|
| **Context** | What the code is, and what already exists. "This is a Node project; the chunker is in `src/chunk.js`." |
| **Task** | One thing to do, in one sentence. |
| **Constraints** | What it must not touch or add. "Do not change `src/model.js`. No new dependencies." |
| **Acceptance** | The observable results that mean "done": file names, return shapes, what a run prints. |
| **Verify** | The commands that prove it. "Run `npm run chunks` and `npm run step -- 2`." |

Two habits make a big difference: ask for a **plan or a list of findings before any change**, and **read the diff** before you accept it.

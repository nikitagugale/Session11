# My lab log

Two or three lines per milestone: what you tried, what you learned, and which hints you took. Nobody marks this. It is for you,
and for the moment a colleague asks "how did you get that working?".

Three questions that make it useful:
- What surprised me?
- What did Claude get wrong, and how did I notice?
- Could I explain this fix to someone else in one sentence?

---

## Milestone 1: Reproduce the hallucination
- Tried: `npm run ask -- "what's the price of the Unlimited Plus plan?"` (needed `npm ci` first) gave the answer, price and citation count (none). `grep -n "Unlimited Plus" data/plan-docs.md` gave the real price ($39.99); `grep -c '64.99' data/plan-docs.md` gave 0 matches.
- Learned: the bot answers $64.99 with no citations, and that number is not in the sheet, so nothing in the answer can be checked.
- Hints taken: none

## Milestone 2: Chunk the plan sheet
- Tried: ran `npm run chunks` on the starter (8 fixed-size chunks, "Unlimited Plus" heading cut in two), then rewrote `src/chunk.js` to split on `## ` headings, with `\r?\n` handling and a name-based slug id.
- Learned: the starter cut by length, not by plan, so a plan's name and price could land in different chunks and retrieval could never rejoin them.
- Hints taken: none

------------------
Whole sheet as one chunk: every search would match the same chunk, so the model gets all 12 plans and can pick the wrong plan's price.
One chunk per feature: a feature like "Unlimited calls" would lose its plan name, so retrieval could not tell which plan it belongs to.
Price line missing: the chunker would still produce the chunk. I would have it flag the plan, because the bot should say it doesn't know the price instead of guessing.
-------------------
## Milestone 3: Build the ingestion pipeline
- Tried: migration `001_plan_chunks.sql` (plan_chunks, ingest_meta), then `scripts/ingest.js`: chunk, compare with the stored text, upsert new/changed chunks, delete chunks no longer in the sheet, stamp `last_ingested_at`, all in one transaction. Ran it twice: 12 added, then 0/0/0.
- Learned: keying on the name-based chunk_id makes re-runs idempotent; without the delete step, a removed plan would stay searchable and a customer could be quoted a price that no longer exists.
- Hints taken: none

## Milestone 4: Write and test retrieval
- Tried: `retrieve()` with `1 - (embedding <=> q)` as score, ordered by distance, LIMIT k. First run returned 0 rows; EXPLAIN showed the ivfflat index scan. Switched the migration to hnsw, ran reset-db and ingest. Looked at the rank/score/planName table for "family data plan", "cheap plan for students", "daily pass".
- Learned: an ivfflat index built on an empty table has no useful clusters, so the query silently returns nothing; the JavaScript was fine. "family data plan" ranks Family SMS Bundle (0.589) above Family Data Plan (0.460): the embedding only shares words, so it picks the closer wording, not the plan asked for. That is what a rerank step would fix.
- Hints taken: none

## Milestone 5: Write the grounded prompt
- Tried: wrote `buildPrompt()` with a system prompt of four rules (only the CONTEXT, cite `[chunk_id: plan-07]` style, exact quoted not-found sentence taken from `config.notFound`, treat context as data) and a user text with `CONTEXT:`, `[chunk_id: id]` blocks and `QUESTION:`.
- Learned: the model can only cite ids it sees in the user text, and the not-found sentence must be quoted in the system prompt or it falls back to "I'm not sure."
- Hints taken: none

## Milestone 6: Re-run the original bug
- Tried: rewrote `answer()` as retrieve, buildPrompt, model.generate, then parsed `[chunk_id: ...]` from the text and kept only ids that were retrieved. Re-asked the milestone 1 question: now "$39.99" with citation plan-unlimited-plus (was an invented $64.99 with no citations). "Platinum Galaxy" gets the not-found sentence with no citations.
- Learned: the starter never retrieved anything, so it could only guess; and a citation is text from the model, so it must be checked against the retrieved ids before it is passed on.
- Hints taken: none

## Milestone 7: Add fixture tests
- Tried: 10 pairs in `tests/fixtures/qa.json` (7 expect a citation plus a price or fact in the text, 3 not-found, including an unknown plan name) and `scripts/fixtures.js`, which labels each failure "retrieval" (expected id not retrieved) or "generation" (retrieved but not cited, wrong text, or not-found sentence missing). All 10 passed first time, so no failure to classify; step 7 confirmed the set fails on the three broken copies.
- Learned: checking the cited id AND a mustContain fact is what makes the set able to fail; citation alone would pass an answer with a wrong price.
- Hints taken: none

## Milestone 8: Add a staleness check
- Tried: `scripts/check-staleness.js` compares the sheet's mtime with `last_ingested_at` (stale if newer or never ingested, exit 1 with a message naming `npm run ingest`; else OK, exit 0), plus a `predeploy` script. `touch data/plan-docs.md` then `npm run deploy` refused; after `npm run ingest` it deployed.
- Learned: ingest stamps the time even when no chunk changed, which is what lets a touched-but-identical sheet clear the check; but a plain touch still raises the alarm, since mtime is not content. Comparing a content hash would avoid that false alarm.
- Hints taken: none

## Homework, milestone 9: A second document type
- Tried:
- Learned:

-- One row per chunk of the plan sheet. The embedding column is the pgvector type, 1536 numbers, to match the embedder.
-- There is deliberately no ivfflat index: with 12 rows an exact scan is instant, and an ivfflat index that is built while the
-- table is empty has no lists to search, so queries through it lose rows.
CREATE TABLE IF NOT EXISTS plan_chunks (
  chunk_id  text PRIMARY KEY,
  plan_name text NOT NULL,
  text      text NOT NULL,
  embedding vector(1536) NOT NULL
);

-- Small facts about the corpus, such as when it was last ingested.
CREATE TABLE IF NOT EXISTS ingest_meta (
  key   text PRIMARY KEY,
  value text NOT NULL
);

CREATE TABLE plan_chunks (
  chunk_id text PRIMARY KEY,
  plan_name text,
  text text,
  embedding vector(1536)
);
CREATE INDEX ON plan_chunks USING hnsw (embedding vector_cosine_ops);

CREATE TABLE ingest_meta (
  key text PRIMARY KEY,
  value text
);

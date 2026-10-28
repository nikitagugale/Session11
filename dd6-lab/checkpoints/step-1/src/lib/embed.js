// A deterministic stand-in for an embeddings API: no network, no key, the same answer every time.
// It hashes the words (and word pairs) of a text into a 1536-number vector, so two texts that share vocabulary land close
// together under cosine similarity. A real embedding model understands meaning, not just shared words, but everything on the
// database side (the vector column, the index, the cosine query) is exactly the same. In production this is one API call.
import { fnv1a, tokens } from './text.js';

export const DIM = 1536;

/** @param {string} text @returns {number[]} a unit-length vector of DIM numbers */
export function embed(text) {
  const v = new Array(DIM).fill(0);
  const t = tokens(text);
  const add = (feature, weight) => {
    const h = fnv1a(feature);
    v[h % DIM] += (h & 0x80000000 ? -1 : 1) * weight;
  };
  t.forEach((w, i) => {
    add(w, 1);
    if (i > 0) add(`${t[i - 1]}_${w}`, 0.5);
  });
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map(x => x / norm);
}

/** Formats a vector the way pgvector reads it: '[0.1,0.2,...]'. Pass it as a parameter and cast it with ::vector. */
export function toPgVector(vec) {
  return `[${vec.map(x => Number(x.toFixed(6))).join(',')}]`;
}

/** Cosine similarity of two unit-length vectors: 1 is identical, 0 is unrelated. */
export function cosine(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

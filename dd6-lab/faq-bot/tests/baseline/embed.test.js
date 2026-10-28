// What the stand-in embedder promises. It does not change during the lab, so these stay green all session.
// Do not edit: your own tests go in tests/learner/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DIM, cosine, embed, toPgVector } from '../../src/lib/embed.js';

test('an embedding has 1536 numbers and unit length', () => {
  const v = embed('what is the price of the Basic plan');
  assert.equal(v.length, DIM);
  assert.equal(DIM, 1536);
  assert.ok(Math.abs(Math.sqrt(v.reduce((s, x) => s + x * x, 0)) - 1) < 1e-9);
});

test('the same text always gives the same embedding', () => {
  assert.deepEqual(embed('family data plan'), embed('family data plan'));
});

test('texts that share words are closer than texts that do not', () => {
  const q = embed('student plan with 20 GB of data');
  assert.ok(cosine(q, embed('Student Saver: 20 GB of data, student ID required')) > cosine(q, embed('Prepaid Daily Pass, pay only on days you use it')));
});

test('a text is identical to itself', () => {
  const v = embed('Unlimited Plus');
  assert.ok(Math.abs(cosine(v, v) - 1) < 1e-9);
});

test('toPgVector writes the format pgvector reads', () => {
  const s = toPgVector(embed('hello'));
  assert.match(s, /^\[-?[\d.e-]+(,-?[\d.e-]+){1535}\]$/);
});

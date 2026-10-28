// What the stand-in model promises, so you can rely on it while you work. It does not change during the lab.
// Do not edit: your own tests go in tests/learner/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../../src/config.js';
import { generate, judgeRelevance } from '../../src/model.js';

const GROUNDED = `Answer using ONLY the CONTEXT below. Cite the chunk_id in brackets, for example [chunk_id: plan-07]. If the answer is not in the CONTEXT, respond exactly: "${config.notFound}"`;
const BASIC = '## Basic\nPrice: $9.99 per month\n- 2 GB of data\n- 100 minutes of calls';
const STUDENT = '## Student Saver\nPrice: $14.99 per month\n- 20 GB of data\n- Valid student ID required';
const ctx = (...chunks) => `CONTEXT:\n${chunks.map(([id, text]) => `[chunk_id: ${id}]\n${text}`).join('\n\n')}\n\nQUESTION: `;

test('with no instruction to stay in the context, it makes an answer up, and it is always the same one', async () => {
  const a = await generate({ system: 'You are a helpful assistant.', user: "what's the price of the Unlimited Plus plan?" });
  const b = await generate({ system: 'You are a helpful assistant.', user: "what's the price of the Unlimited Plus plan?" });
  assert.equal(a.text, b.text);
  assert.match(a.text, /Unlimited Plus plan costs \$\d+\.\d\d per month/);
  assert.ok(!/\[chunk_id/.test(a.text), 'an invented answer cites nothing');
});

test('told to use ONLY the context, it answers from the context and cites the chunk', async () => {
  const { text } = await generate({ system: GROUNDED, user: `${ctx(['plan-basic', BASIC], ['plan-student-saver', STUDENT])}what does the Basic plan cost?` });
  assert.equal(text, 'The Basic plan costs $9.99 per month. [chunk_id: plan-basic]');
});

test('when the answer is not in the context, it says the sentence from your prompt, word for word', async () => {
  const { text } = await generate({ system: GROUNDED, user: `${ctx(['plan-basic', BASIC])}what does the Platinum Max plan cost?` });
  assert.equal(text, config.notFound);
});

test('with an empty context it says the not-found sentence', async () => {
  const { text } = await generate({ system: GROUNDED, user: `${ctx()}what does the Basic plan cost?` });
  assert.equal(text, config.notFound);
});

test('it only cites when the system prompt asks for citations', async () => {
  const quiet = 'Answer using ONLY the CONTEXT below.';
  const { text } = await generate({ system: quiet, user: `${ctx(['plan-basic', BASIC])}what does the Basic plan cost?` });
  assert.equal(text, 'The Basic plan costs $9.99 per month.');
});

test('it reads one detail from a chunk when the question asks for one', async () => {
  const { text } = await generate({ system: GROUNDED, user: `${ctx(['plan-student-saver', STUDENT])}how many GB does the Student Saver include?` });
  assert.match(text, /20 GB of data/);
  assert.ok(!/student ID/.test(text));
});

test('the judge scores a chunk by whether it is about the plan the question names', () => {
  const chunk = name => ({ planName: name });
  assert.equal(judgeRelevance('family data plan', chunk('Family Data Plan')), 10);
  assert.ok(judgeRelevance('family data plan', chunk('Family SMS Bundle')) < judgeRelevance('family data plan', chunk('Tablet Data Plan')));
  assert.ok(judgeRelevance('family data plan', chunk('Tablet Data Plan')) < 5);
});

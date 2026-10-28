// Milestone 1: the evidence. Reads YOUR docs/findings.json and compares each fact with what is really true.
// It does not tell you the answers: it tells you which ones do not match, so go and look again.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { APP, load, normalise, sheet } from '../../../checks/lib/helpers.mjs';

const file = path.join(APP, 'docs', 'findings.json');
const QUESTION = "what's the price of the Unlimited Plus plan?";
const { markdown, plans } = sheet();
const realPlan = plans.find(p => p.name === 'Unlimited Plus');
const money = s => Number(/\$([\d.]+)/.exec(String(s))?.[1]);

let findings = {};
let botAnswer;
const placeholder = v => v === '?' || v === undefined || v === null || v === '';

test('docs/findings.json exists and is valid JSON', () => {
  assert.ok(existsSync(file), 'docs/findings.json is missing. Create it with the six keys from the milestone card.');
  findings = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(typeof findings, 'object');
});

test('question: the question you asked is the one from the course', () => {
  assert.ok(!placeholder(findings.question), 'question is still a placeholder. Put the exact question you asked the bot.');
  assert.equal(normalise(findings.question), normalise(QUESTION), 'that is not the question from the course. The card says which one to ask.');
});

test('inventedAnswer: the exact text the bot gave you', async () => {
  assert.ok(!placeholder(findings.inventedAnswer), 'inventedAnswer is still a placeholder. Ask the bot, then copy its answer exactly.');
  const { generate } = await load('src/model.js');
  botAnswer = (await generate({ system: 'You are a helpful assistant.', user: QUESTION })).text;
  assert.equal(normalise(findings.inventedAnswer), normalise(botAnswer), 'that is not what the bot says. Ask it the question yourself and copy its answer, word for word.');
});

test('inventedPrice: the price the bot made up, as a number', () => {
  assert.ok(!placeholder(findings.inventedPrice), 'inventedPrice is still a placeholder.');
  assert.equal(typeof findings.inventedPrice, 'number', 'inventedPrice must be a number, not text');
  assert.equal(findings.inventedPrice, money(botAnswer ?? findings.inventedAnswer), 'that is not the price in the bot\'s answer. Read the answer again.');
});

test('realPrice: what the plan sheet says, as a number', () => {
  assert.ok(!placeholder(findings.realPrice), 'realPrice is still a placeholder. The plan sheet is data/plan-docs.md.');
  assert.equal(typeof findings.realPrice, 'number', 'realPrice must be a number, not text');
  assert.equal(findings.realPrice, money(realPlan.priceLine), 'that is not what the plan sheet says for this plan. Open data/plan-docs.md and find the plan.');
});

test('inventedPriceInSheet: does the made-up price appear anywhere in the plan sheet', () => {
  assert.ok(!placeholder(findings.inventedPriceInSheet), 'inventedPriceInSheet is still a placeholder. Search the plan sheet for the made-up price.');
  assert.equal(typeof findings.inventedPriceInSheet, 'boolean', 'inventedPriceInSheet must be true or false (not text)');
  assert.equal(findings.inventedPriceInSheet, markdown.includes(`$${findings.inventedPrice}`), 'that does not match the plan sheet. Search data/plan-docs.md for the made-up price.');
});

test('citationsReturned: how many citations the bot gave with its answer', () => {
  assert.ok(!placeholder(findings.citationsReturned), 'citationsReturned is still a placeholder. Look at what the bot printed under its answer.');
  assert.equal(typeof findings.citationsReturned, 'number', 'citationsReturned must be a number, not text');
  assert.equal(findings.citationsReturned, 0, 'that does not match what the bot returns. Run npm run ask and look at the citations line.');
});

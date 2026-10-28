// STARTER CODE: this is "the FAQ bot" as it stands today. It just asks the model. It never looks anything up.
// Milestone 6 asks you to turn it into a grounded answer. Keep the file name and the export.
//
// answer(pg, question) returns { answer, citations, sources }:
//   answer     the text the customer sees
//   citations  the chunk ids the answer relies on, for example ['plan-unlimited-plus']
//   sources    for each citation, { chunkId, snippet }: what a person needs to check it
import { generate } from './model.js';

export async function answer(pg, question) {
  const { text } = await generate({
    system: 'You are a helpful assistant for a mobile phone company. Answer customers\u2019 questions about our plans.',
    user: question,
  });
  return { answer: text, citations: [], sources: [] };
}

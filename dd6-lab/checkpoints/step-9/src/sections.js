// Reference solution, milestone 9: one rule for every document that is written as "## " sections.
// Both the plan sheet and the roaming policy have one section for each unit: a plan, or a roaming zone. A chunk is one whole
// section, so a zone's countries, its daily pass price and its rules stay together, just as a plan's price stays with its name.
// The id carries the document type, so a plan and a zone can never collide: plan-unlimited-plus, roaming-zone-c-asia-pacific.
// It lives in its own file on purpose: the checks for milestone 7 swap src/chunk.js for a broken copy, and a file of its own is not swapped.

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function chunkSections(markdown, prefix) {
  return markdown
    .replace(/\r\n/g, '\n')
    .split(/^(?=## )/m)
    .filter(section => section.startsWith('## '))
    .map(section => {
      const text = section.trimEnd();
      const planName = /^## (.+)$/m.exec(text)[1].trim();
      return { chunkId: `${prefix}-${slug(planName)}`, planName, text };
    });
}

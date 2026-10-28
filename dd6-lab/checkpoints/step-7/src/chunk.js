// Reference solution, milestone 2: one chunk per plan.
//
// A plan starts at a "## " heading and runs until the next "## " heading, so its name, its price and its features always stay
// together. The title and the intro lines before the first "## " describe no plan, so they are not chunks. The chunk text is the
// plan's section exactly as written (only blank lines at the end are dropped), and the chunk id comes from the name, not from the
// position, so it does not change when a plan is added or moved.

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function chunkPlans(markdown) {
  return markdown
    .replace(/\r\n/g, '\n')
    .split(/^(?=## )/m)
    .filter(section => section.startsWith('## '))
    .map(section => {
      const text = section.trimEnd();
      const planName = /^## (.+)$/m.exec(text)[1].trim();
      return { chunkId: `plan-${slug(planName)}`, planName, text };
    });
}

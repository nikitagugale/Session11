// chunkPlans(markdown) takes the text of data/plan-docs.md and returns an array of { chunkId, planName, text }.
// One chunk per plan: each "## " heading starts a plan, and the plan runs until the next "## " heading.

const slug = name => name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');

export function chunkPlans(markdown) {
  const lines = String(markdown).split(/\r?\n/);
  const chunks = [];
  let current = null;
  const close = () => {
    if (current) chunks.push({ chunkId: `plan-${slug(current.planName)}`, planName: current.planName, text: current.lines.join('\n').trim() });
  };
  for (const line of lines) {
    const heading = /^##\s+(.+?)\s*$/.exec(line); // "###" does not match: the third character must be whitespace
    if (heading) {
      close();
      current = { planName: heading[1], lines: [line] };
    } else if (current) {
      current.lines.push(line);
    } else {
      // the title and intro before the first plan belong to no plan
    }
  }
  close();
  return chunks;
}

// Reference solution, milestone 9: the plan chunker, now built on the shared section rule in src/sections.js.
// The export is the same as before (chunkPlans), so everything from milestones 2 to 8 keeps working.
import { chunkSections } from './sections.js';

export const chunkPlans = markdown => chunkSections(markdown, 'plan');

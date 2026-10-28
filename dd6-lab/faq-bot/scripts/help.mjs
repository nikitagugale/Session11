// `npm run help`: every command in this kit, in one screen. The participant handbook explains each of them in depth.
const sections = [
  ['Ask and look', [
    ['npm run ask -- "your question"', 'Ask the FAQ bot. Shows the answer, its citations and the sources. Add --json for the full result.'],
    ['npm run chunks', 'Run YOUR chunkPlans() on the plan sheet and see what it made, and what is wrong with it. Add -- --show for the text.'],
    ['npm run retrieve -- "your question"', 'Show which chunks YOUR retrieve() returns, best first. Add -- --k 3 to change how many.'],
    ['npm run sql -- "SELECT ..."', 'Run one SQL statement against the lab database and print the rows. Try: SELECT chunk_id, plan_name FROM plan_chunks'],
    ['npm run ingest', 'Fill the database from the plan sheet (the script you write in milestone 3).'],
    ['npm run reset-db', 'Throw the database away to start again, then run npm run ingest.'],
    ['npm run fixtures', 'Run YOUR question and answer pairs (the script you write in milestone 7). Not there until you add it.'],
    ['npm run deploy', 'A pretend deploy. Milestone 8 makes it refuse when the plan sheet is newer than the last ingest.'],
    ['npm test', 'Run the lab\'s own tests. They stay green all session.'],
  ]],
  ['The lab', [
    ['npm run start -- N', 'Start the clock for milestone N and see when its hints open. (The first step or hint command starts it for you.)'],
    ['npm run step -- N', 'Check milestone N (1 to 9). It tells you which success criteria are not met yet.'],
    ['npm run progress', 'Check every milestone and print one line to paste in the chat. Takes about a minute.'],
    ['npm run hint -- N', 'The next hint for milestone N. Three hints, then --reveal for the reference solution. --now takes one early.'],
    ['npm run checkpoint -- N', 'Replace your work with the reference solution for milestone N. Your work is saved first, in .checkpoint-backup/.'],
    ['npm run baseline', 'Commit the starting point with git, so git diff shows only what you change.'],
    ['npm run doctor', 'Check Node, the install, the database and the kit layout.'],
    ['npm run help', 'This screen.'],
  ]],
];

console.log('DD6 lab commands\n');
for (const [title, rows] of sections) {
  console.log(title.toUpperCase());
  for (const [cmd, what] of rows) console.log(`  ${cmd}\n      ${what}`);
  console.log('');
}
console.log('Your guide is LAB-GUIDE.md. Your evidence log is LAB-LOG.md. If a command is a mystery, the handbook has a page on it.');

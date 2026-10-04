import { readFileSync, writeFileSync } from 'fs';

// Read the raw temp file
const raw = readFileSync('C:/Users/vanap/AppData/Local/Temp/windsurf/mcp_output_22e40a649338d28f.txt', 'utf-8');

// Extract JSON between "### Result" and "### Ran Playwright"
const start = raw.indexOf('\n', raw.indexOf('### Result')) + 1;
const end = raw.indexOf('### Ran Playwright');
const jsonStr = raw.substring(start, end).trim();

let questions;
try {
  questions = JSON.parse(jsonStr);
} catch (e) {
  console.error('JSON parse error:', e.message);
  console.log('First 200 chars:', jsonStr.substring(0, 200));
  writeFileSync('D:/project_work_frilans/marketplizzzz/scripts/debug_json.txt', jsonStr.substring(0, 2000), 'utf-8');
  process.exit(1);
}

console.log(`Parsed ${questions.length} questions`);

// Save clean JSON
writeFileSync('D:/project_work_frilans/marketplizzzz/scripts/quiz_raw.json', JSON.stringify(questions, null, 2), 'utf-8');

// Format text output
let correct = 0, incorrect = 0, partial = 0;
const lines = [];

lines.push('='.repeat(60));
lines.push('  REZULTATY TESTA');
lines.push('  Exam 04.05.26 Training');
lines.push(`  Attempt: 22657 | Total: ${questions.length}`);
lines.push('='.repeat(60));
lines.push('');

for (const q of questions) {
  lines.push('-'.repeat(50));
  let status = '';
  if (q.s === 'V') { status = ' [CORRECT]'; correct++; }
  else if (q.s === 'X') { status = ' [WRONG]'; incorrect++; }
  else if (q.s === 'P') { status = ' [PARTIAL]'; partial++; }

  lines.push(`${q.n}${status}`);
  lines.push('-'.repeat(50));
  lines.push(q.t);
  if (q.g) lines.push(q.g);

  if ((q.tp === 'mc' || q.tp === 'tf') && q.opts.length > 0) {
    lines.push('');
    lines.push('Options:');
    for (const o of q.opts) {
      let m = '  ';
      if (o.sel && o.ok) m = '[V]';
      else if (o.sel && o.bad) m = '[X]';
      else if (o.sel) m = '[>]';
      else if (o.ok) m = '[V]';
      const text = o.t || '(text not extracted)';
      lines.push(`  ${m} ${text}`);
    }
  }

  if (q.tp === 'ma' && q.opts.length > 0) {
    lines.push('');
    lines.push('Matches:');
    for (const o of q.opts) {
      const mark = o.ok ? '[V]' : '[X]';
      lines.push(`  ${mark} ${o.l} -> ${o.r}`);
    }
  }

  if ((q.tp === 'sa' || q.tp === 'nu') && q.ua) {
    lines.push('');
    lines.push(`Your answer: ${q.ua}`);
  }

  if (q.tp === 'cloze' && q.opts.length > 0) {
    lines.push('');
    lines.push('Blanks:');
    for (const o of q.opts) {
      lines.push(`  [${o.p}]: ${o.a}`);
    }
  }

  if (q.ra) {
    lines.push('');
    lines.push(`CORRECT ANSWER: ${q.ra}`);
  }

  lines.push('');
}

lines.push('='.repeat(60));
lines.push(`TOTAL: ${questions.length} questions`);
lines.push(`  Correct: ${correct} | Wrong: ${incorrect} | Partial: ${partial}`);
lines.push('='.repeat(60));

const result = lines.join('\n');
writeFileSync('D:/project_work_frilans/marketplizzzz/scripts/quiz_results.txt', result, 'utf-8');
console.log(`Saved quiz_results.txt`);
console.log(`Correct: ${correct} | Wrong: ${incorrect} | Partial: ${partial}`);

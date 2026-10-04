import { readFileSync, writeFileSync } from 'fs';

const raw = readFileSync('D:/project_work_frilans/marketplizzzz/scripts/quiz_raw.json', 'utf-8');
const questions = JSON.parse(raw);

let correct = 0, incorrect = 0, partial = 0;
const lines = [];

lines.push('='.repeat(60));
lines.push('  \u0420\u0415\u0417\u0423\u041b\u042c\u0422\u0410\u0422\u042b \u0422\u0415\u0421\u0422\u0410');
lines.push('  \u042d\u043a\u0437\u0430\u043c\u0435\u043d 04.05.26 \u0422\u0440\u0435\u043d\u0438\u0440\u043e\u0432\u043e\u0447\u043d\u044b\u0439');
lines.push(`  Attempt: 22657 | \u0412\u0441\u0435\u0433\u043e \u0432\u043e\u043f\u0440\u043e\u0441\u043e\u0432: ${questions.length}`);
lines.push('='.repeat(60));
lines.push('');

for (const q of questions) {
  lines.push('-'.repeat(50));
  let status = '';
  if (q.s === 'V') { status = '[\u0412\u0415\u0420\u041d\u041e]'; correct++; }
  else if (q.s === 'X') { status = '[\u041d\u0415\u0412\u0415\u0420\u041d\u041e]'; incorrect++; }
  else if (q.s === 'P') { status = '[\u0427\u0410\u0421\u0422\u0418\u0427\u041d\u041e]'; partial++; }

  lines.push(`${q.n} ${status}`);
  lines.push('-'.repeat(50));
  lines.push(q.t);
  if (q.g) lines.push(q.g);

  if ((q.tp === 'mc' || q.tp === 'tf') && q.opts.length > 0) {
    lines.push('');
    lines.push('\u0412\u0430\u0440\u0438\u0430\u043d\u0442\u044b:');
    for (const o of q.opts) {
      let m = '  ';
      if (o.sel && o.ok) m = '[\u2713]';
      else if (o.sel && o.bad) m = '[\u2717]';
      else if (o.sel) m = '[>]';
      else if (o.ok) m = '[\u2713]';
      const text = o.t || '(\u0442\u0435\u043a\u0441\u0442 \u043d\u0435 \u0438\u0437\u0432\u043b\u0435\u0447\u0435\u043d)';
      lines.push(`  ${m} ${text}`);
    }
  }

  if (q.tp === 'ma' && q.opts.length > 0) {
    lines.push('');
    lines.push('\u0421\u043e\u043e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0438\u044f:');
    for (const o of q.opts) {
      const mark = o.ok ? '[\u2713]' : '[\u2717]';
      lines.push(`  ${mark} ${o.l} -> ${o.r}`);
    }
  }

  if ((q.tp === 'sa' || q.tp === 'nu') && q.ua) {
    lines.push('');
    lines.push(`\u0412\u0430\u0448 \u043e\u0442\u0432\u0435\u0442: ${q.ua}`);
  }

  if (q.tp === 'cloze' && q.opts.length > 0) {
    lines.push('');
    lines.push('\u041f\u0440\u043e\u043f\u0443\u0441\u043a\u0438:');
    for (const o of q.opts) {
      lines.push(`  [${o.p}]: ${o.a}`);
    }
  }

  if (q.ra) {
    lines.push('');
    lines.push(`\u041f\u0420\u0410\u0412\u0418\u041b\u042c\u041d\u042b\u0419 \u041e\u0422\u0412\u0415\u0422: ${q.ra}`);
  }

  lines.push('');
}

lines.push('='.repeat(60));
lines.push(`\u0418\u0422\u041e\u0413\u041e: ${questions.length} \u0432\u043e\u043f\u0440\u043e\u0441\u043e\u0432`);
lines.push(`  \u0412\u0435\u0440\u043d\u043e: ${correct} | \u041d\u0435\u0432\u0435\u0440\u043d\u043e: ${incorrect} | \u0427\u0430\u0441\u0442\u0438\u0447\u043d\u043e: ${partial}`);
lines.push('='.repeat(60));

const result = lines.join('\n');
writeFileSync('D:/project_work_frilans/marketplizzzz/scripts/quiz_results.txt', result, 'utf-8');
console.log(`Done! ${questions.length} questions. Correct: ${correct}, Wrong: ${incorrect}, Partial: ${partial}`);

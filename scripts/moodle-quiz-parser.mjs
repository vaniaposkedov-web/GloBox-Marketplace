// ============================================================
// Moodle Quiz Parser — Node.js скрипт
// ============================================================
// Как использовать:
// 1. В браузере откройте DevTools (F12) → Application → Cookies
// 2. Скопируйте значение cookie "MoodleSession"
// 3. Запустите: node scripts/moodle-quiz-parser.mjs
// ============================================================

import https from 'https';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import readline from 'readline';

// ─── НАСТРОЙКИ ─────────────────────────────────────────
const CONFIG = {
  baseUrl: 'https://urtk-mephi.online',
  attemptId: '22657',
  cmid: '12243',
  // Вставьте ваш MoodleSession cookie сюда, или введите при запуске
  moodleSession: '',
};
// ───────────────────────────────────────────────────────

async function askQuestion(prompt) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(prompt, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function fetchPage(url, cookie) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'Cookie': `MoodleSession=${cookie}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ru-RU,ru;q=0.9',
      },
    };

    https.get(url, options, (res) => {
      // Следуем за редиректами
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redirectUrl = res.headers.location.startsWith('http')
          ? res.headers.location
          : `${CONFIG.baseUrl}${res.headers.location}`;
        console.log(`  ↪ Редирект: ${redirectUrl}`);
        fetchPage(redirectUrl, cookie).then(resolve).catch(reject);
        return;
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (data.includes('<title>') && data.includes('Вход на сайт')) {
          reject(new Error('Cookie недействительна или истекла. Скопируйте новый MoodleSession из браузера.'));
          return;
        }
        resolve(data);
      });
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseQuestions(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const questions = [];

  doc.querySelectorAll('.que').forEach(q => {
    const questionData = {};

    // Номер вопроса
    const qInfo = q.querySelector('.info .no');
    questionData.number = qInfo ? qInfo.textContent.trim() : '?';

    // Текст вопроса
    const qText = q.querySelector('.qtext');
    questionData.text = qText ? qText.textContent.trim() : '(текст не найден)';

    // Тип
    const qClasses = q.className;
    let qType = 'unknown';
    if (qClasses.includes('multichoice')) qType = 'multichoice';
    else if (qClasses.includes('truefalse')) qType = 'truefalse';
    else if (qClasses.includes('shortanswer')) qType = 'shortanswer';
    else if (qClasses.includes('numerical')) qType = 'numerical';
    else if (qClasses.includes('essay')) qType = 'essay';
    else if (qClasses.includes('match')) qType = 'match';
    else if (qClasses.includes('multianswer')) qType = 'multianswer';
    else if (qClasses.includes('calculated')) qType = 'calculated';
    questionData.type = qType;

    // Оценка
    const gradeDiv = q.querySelector('.grade');
    questionData.grade = gradeDiv ? gradeDiv.textContent.trim() : '';

    const stateDiv = q.querySelector('.state');
    questionData.state = stateDiv ? stateDiv.textContent.trim() : '';

    // Ответы
    questionData.answers = [];
    questionData.correctAnswer = '';
    questionData.userAnswer = '';

    if (qType === 'multichoice' || qType === 'truefalse') {
      // Ищем варианты ответов в разных форматах разметки Moodle
      let options = q.querySelectorAll('.answer .r0, .answer .r1');
      if (options.length === 0) options = q.querySelectorAll('.answer div[class*="r"]');
      if (options.length === 0) options = q.querySelectorAll('.answer .d-flex');
      if (options.length === 0) options = q.querySelectorAll('.answer label');

      options.forEach(opt => {
        const label = opt.querySelector('label') || opt;
        const text = label.textContent.trim().replace(/^[a-z]\.\s*/i, '');
        const input = opt.querySelector('input[type="radio"], input[type="checkbox"]');
        const isSelected = input ? (input.hasAttribute('checked') || input.getAttribute('checked') === 'checked') : false;
        const isCorrect = opt.classList.contains('correct') || !!opt.querySelector('.correct');
        const isIncorrect = opt.classList.contains('incorrect') || !!opt.querySelector('.incorrect');

        questionData.answers.push({ text, isSelected, isCorrect, isIncorrect });
        if (isCorrect) questionData.correctAnswer = text;
        if (isSelected) questionData.userAnswer = text;
      });
    } else if (qType === 'shortanswer' || qType === 'numerical' || qType === 'calculated') {
      const input = q.querySelector('.answer input[type="text"]');
      if (input) {
        questionData.userAnswer = input.getAttribute('value') || '';
      }
    } else if (qType === 'match') {
      const rows = q.querySelectorAll('.answer table tr');
      rows.forEach(row => {
        const cols = row.querySelectorAll('td');
        if (cols.length >= 2) {
          const left = cols[0].textContent.trim();
          const select = row.querySelector('select');
          let right = cols[1].textContent.trim();
          if (select) {
            const selectedOpt = select.querySelector('option[selected]');
            right = selectedOpt ? selectedOpt.textContent.trim() : right;
          }
          questionData.answers.push({ left, right });
        }
      });
    } else if (qType === 'multianswer') {
      const subquestions = q.querySelectorAll('select, input[type="text"]');
      subquestions.forEach((sq, i) => {
        if (sq.tagName === 'SELECT') {
          const selectedOpt = sq.querySelector('option[selected]');
          questionData.answers.push({
            position: i + 1,
            userAnswer: selectedOpt ? selectedOpt.textContent.trim() : '',
          });
        } else {
          questionData.answers.push({
            position: i + 1,
            userAnswer: sq.getAttribute('value') || '',
          });
        }
      });
    }

    // Правильный ответ
    const rightAnswer = q.querySelector('.rightanswer');
    if (rightAnswer) {
      const raText = rightAnswer.textContent.trim()
        .replace(/^Правильный ответ:\s*/i, '')
        .replace(/^The correct answer is:\s*/i, '');
      if (!questionData.correctAnswer) questionData.correctAnswer = raText;
    }

    // Feedback
    const feedback = q.querySelector('.feedback .generalfeedback');
    questionData.feedback = feedback ? feedback.textContent.trim() : '';

    const specificFb = q.querySelector('.specificfeedback');
    questionData.specificFeedback = specificFb ? specificFb.textContent.trim() : '';

    questions.push(questionData);
  });

  return questions;
}

function detectPages(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const pages = new Set([0]);

  doc.querySelectorAll('.qn_buttons a.qnbutton').forEach(link => {
    const href = link.getAttribute('href') || '';
    const match = href.match(/page=(\d+)/);
    if (match) pages.add(parseInt(match[1]));
  });

  // Также проверяем навигацию страниц
  doc.querySelectorAll('a[href*="page="]').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href.includes('review.php')) {
      const match = href.match(/page=(\d+)/);
      if (match) pages.add(parseInt(match[1]));
    }
  });

  return [...pages].sort((a, b) => a - b);
}

function formatOutput(allQuestions) {
  let output = '';
  output += '═'.repeat(60) + '\n';
  output += '  РЕЗУЛЬТАТЫ ТЕСТА\n';
  output += `  Attempt: ${CONFIG.attemptId}, cmid: ${CONFIG.cmid}\n`;
  output += `  Дата: ${new Date().toLocaleString('ru-RU')}\n`;
  output += '═'.repeat(60) + '\n\n';

  allQuestions.forEach(q => {
    output += `${'─'.repeat(50)}\n`;
    output += `Вопрос ${q.number}\n`;
    output += `${'─'.repeat(50)}\n`;
    output += `${q.text}\n\n`;

    if (q.state) output += `Статус: ${q.state}\n`;
    if (q.grade) output += `${q.grade}\n`;

    if (q.type === 'multichoice' || q.type === 'truefalse') {
      output += '\nВарианты ответов:\n';
      q.answers.forEach(a => {
        let marker = '  ';
        if (a.isSelected && a.isCorrect) marker = '[V]';
        else if (a.isSelected && a.isIncorrect) marker = '[X]';
        else if (a.isSelected) marker = '[>]';
        else if (a.isCorrect) marker = '[V]';
        output += `  ${marker} ${a.text}\n`;
      });
    }

    if (q.type === 'match') {
      output += '\nСоответствия:\n';
      q.answers.forEach(a => {
        output += `  ${a.left} -> ${a.right}\n`;
      });
    }

    if (q.type === 'multianswer') {
      output += '\nПропуски:\n';
      q.answers.forEach(a => {
        output += `  [${a.position}]: ${a.userAnswer}\n`;
      });
    }

    if (q.userAnswer && q.type !== 'multichoice' && q.type !== 'truefalse') {
      output += `\nВаш ответ: ${q.userAnswer}\n`;
    }

    if (q.correctAnswer) {
      output += `\nПравильный ответ: ${q.correctAnswer}\n`;
    }

    if (q.specificFeedback) {
      output += `\nКомментарий: ${q.specificFeedback}\n`;
    }

    output += '\n';
  });

  output += '═'.repeat(60) + '\n';
  output += `Всего вопросов: ${allQuestions.length}\n`;
  output += '═'.repeat(60) + '\n';

  return output;
}

// ─── MAIN ──────────────────────────────────────────────
async function main() {
  console.log('🎓 Moodle Quiz Parser\n');

  let cookie = CONFIG.moodleSession;
  if (!cookie) {
    cookie = await askQuestion('Вставьте значение cookie MoodleSession: ');
  }

  if (!cookie) {
    console.error('❌ Cookie не указан. Завершение.');
    process.exit(1);
  }

  const reviewUrl = `${CONFIG.baseUrl}/mod/quiz/review.php?attempt=${CONFIG.attemptId}&cmid=${CONFIG.cmid}`;

  console.log(`\n📥 Загружаем первую страницу: ${reviewUrl}`);
  let html;
  try {
    html = await fetchPage(reviewUrl, cookie);
  } catch (e) {
    console.error(`❌ ${e.message}`);
    process.exit(1);
  }

  // Определяем страницы
  const pages = detectPages(html);
  console.log(`📄 Найдено страниц: ${pages.length} (${pages.join(', ')})`);

  let allQuestions = [];

  for (const page of pages) {
    const pageUrl = page === 0
      ? reviewUrl
      : `${reviewUrl}&page=${page}`;

    console.log(`\n📥 Парсим страницу ${page + 1}...`);

    let pageHtml;
    if (page === 0 && html) {
      pageHtml = html;
      html = null; // использовали
    } else {
      try {
        pageHtml = await fetchPage(pageUrl, cookie);
      } catch (e) {
        console.error(`  ❌ Ошибка: ${e.message}`);
        continue;
      }
    }

    const questions = parseQuestions(pageHtml);
    console.log(`  ✅ Найдено вопросов: ${questions.length}`);
    allQuestions.push(...questions);
  }

  if (allQuestions.length === 0) {
    console.log('\n⚠️  Вопросы не найдены. Возможно, структура страницы отличается.');
    console.log('Попробуйте использовать скрипт для консоли браузера (moodle-quiz-parser-console.js)');

    // Сохраняем HTML для отладки
    const debugFile = `quiz_debug_${Date.now()}.html`;
    try {
      const firstPageHtml = await fetchPage(reviewUrl, cookie);
      fs.writeFileSync(debugFile, firstPageHtml);
      console.log(`\n💾 HTML страницы сохранен в ${debugFile} для отладки`);
    } catch (_) {}
    process.exit(1);
  }

  const output = formatOutput(allQuestions);

  // Выводим в консоль
  console.log('\n' + output);

  // Сохраняем в файл
  const filename = `quiz_answers_${CONFIG.attemptId}_${new Date().toISOString().slice(0, 10)}.txt`;
  fs.writeFileSync(filename, output, 'utf-8');
  console.log(`\n💾 Результаты сохранены в ${filename}`);

  // Также сохраняем JSON
  const jsonFile = `quiz_answers_${CONFIG.attemptId}_${new Date().toISOString().slice(0, 10)}.json`;
  fs.writeFileSync(jsonFile, JSON.stringify(allQuestions, null, 2), 'utf-8');
  console.log(`💾 JSON сохранен в ${jsonFile}`);
}

main().catch(console.error);

// ============================================================
// Moodle Quiz Parser — скрипт для консоли браузера (F12)
// ============================================================
// Как использовать:
// 1. Откройте страницу с результатами теста в браузере
//    (https://urtk-mephi.online/mod/quiz/review.php?attempt=...)
// 2. Нажмите F12 → вкладка Console
// 3. Вставьте весь этот скрипт и нажмите Enter
// 4. Скрипт выведет все вопросы и ответы в консоль
//    и предложит скачать результат как текстовый файл
// ============================================================

(async function parseQuiz() {
  const baseUrl = window.location.href.replace(/&page=\d+/, '').replace(/\?page=\d+&?/, '?');
  
  // Определяем количество страниц
  const pageLinks = document.querySelectorAll('.qn_buttons .qnbutton');
  const pages = new Set();
  pageLinks.forEach(link => {
    const href = link.closest('a')?.href || '';
    const match = href.match(/page=(\d+)/);
    if (match) pages.add(parseInt(match[1]));
  });
  
  // Если нет пагинации, парсим только текущую страницу
  const pageNumbers = pages.size > 0 ? [...pages].sort((a, b) => a - b) : [null];
  
  const allQuestions = [];
  
  for (const pageNum of pageNumbers) {
    let doc = document;
    
    // Если нужна другая страница — загружаем её
    if (pageNum !== null && !window.location.href.includes(`page=${pageNum}`)) {
      const url = pageNum === 0 
        ? baseUrl 
        : (baseUrl.includes('?') ? `${baseUrl}&page=${pageNum}` : `${baseUrl}?page=${pageNum}`);
      
      try {
        const resp = await fetch(url, { credentials: 'include' });
        const html = await resp.text();
        const parser = new DOMParser();
        doc = parser.parseFromString(html, 'text/html');
        console.log(`📄 Загружена страница ${pageNum + 1}`);
      } catch (e) {
        console.error(`❌ Ошибка загрузки страницы ${pageNum}:`, e);
        continue;
      }
    }
    
    // Парсим вопросы на странице
    const questions = doc.querySelectorAll('.que');
    
    questions.forEach((q, idx) => {
      const questionData = {};
      
      // Номер вопроса
      const qInfo = q.querySelector('.info .no');
      questionData.number = qInfo ? qInfo.textContent.trim() : `?`;
      
      // Текст вопроса
      const qText = q.querySelector('.qtext');
      questionData.text = qText ? qText.textContent.trim() : '(текст не найден)';
      
      // Тип вопроса
      const qClasses = q.className;
      let qType = 'unknown';
      if (qClasses.includes('multichoice')) qType = 'multichoice';
      else if (qClasses.includes('truefalse')) qType = 'truefalse';
      else if (qClasses.includes('shortanswer')) qType = 'shortanswer';
      else if (qClasses.includes('numerical')) qType = 'numerical';
      else if (qClasses.includes('essay')) qType = 'essay';
      else if (qClasses.includes('match')) qType = 'match';
      else if (qClasses.includes('multianswer')) qType = 'multianswer';
      else if (qClasses.includes('description')) qType = 'description';
      else if (qClasses.includes('calculated')) qType = 'calculated';
      questionData.type = qType;
      
      // Статус ответа (правильно/неправильно)
      const gradeDiv = q.querySelector('.grade');
      questionData.grade = gradeDiv ? gradeDiv.textContent.trim() : '';
      
      const stateDiv = q.querySelector('.state');
      questionData.state = stateDiv ? stateDiv.textContent.trim() : '';
      
      // Ответы
      questionData.answers = [];
      questionData.correctAnswer = '';
      questionData.userAnswer = '';
      
      if (qType === 'multichoice' || qType === 'truefalse') {
        const answerOptions = q.querySelectorAll('.answer .r0, .answer .r1, .answer div[class*="r"]');
        // Альтернативный селектор
        let options = answerOptions.length > 0 ? answerOptions : q.querySelectorAll('.answer label, .answer .flex-fill');
        
        if (options.length === 0) {
          // Ещё один вариант разметки Moodle
          options = q.querySelectorAll('.answer .d-flex');
        }
        
        options.forEach(opt => {
          const label = opt.querySelector('label') || opt;
          const text = label.textContent.trim().replace(/^[a-z]\.\s*/i, '');
          const input = opt.querySelector('input[type="radio"], input[type="checkbox"]');
          const isSelected = input ? input.checked || input.hasAttribute('checked') : false;
          const isCorrect = opt.classList.contains('correct') || 
                           opt.closest('.correct') !== null ||
                           opt.querySelector('.fa-check, .icon.fa-check, .correct') !== null;
          const isIncorrect = opt.classList.contains('incorrect') || 
                             opt.closest('.incorrect') !== null;
          
          const answerInfo = { text, isSelected, isCorrect, isIncorrect };
          questionData.answers.push(answerInfo);
          
          if (isCorrect) questionData.correctAnswer = text;
          if (isSelected) questionData.userAnswer = text;
        });
        
        // Если не нашли через классы, ищем правильный ответ в feedback
        if (!questionData.correctAnswer) {
          const rightAnswer = q.querySelector('.rightanswer');
          if (rightAnswer) {
            questionData.correctAnswer = rightAnswer.textContent.trim()
              .replace(/^Правильный ответ:\s*/i, '')
              .replace(/^The correct answer is:\s*/i, '');
          }
        }
      } else if (qType === 'shortanswer' || qType === 'numerical' || qType === 'calculated') {
        const input = q.querySelector('.answer input[type="text"], .answer .formulation input');
        if (input) {
          questionData.userAnswer = input.value || input.getAttribute('value') || '';
        }
        const rightAnswer = q.querySelector('.rightanswer');
        if (rightAnswer) {
          questionData.correctAnswer = rightAnswer.textContent.trim()
            .replace(/^Правильный ответ:\s*/i, '')
            .replace(/^The correct answer is:\s*/i, '');
        }
      } else if (qType === 'match') {
        const rows = q.querySelectorAll('.answer table tr, .answer .match_item');
        rows.forEach(row => {
          const cols = row.querySelectorAll('td, .text');
          if (cols.length >= 2) {
            const left = cols[0].textContent.trim();
            const select = row.querySelector('select');
            const right = select ? select.options[select.selectedIndex]?.text : cols[1].textContent.trim();
            questionData.answers.push({ left, right });
          }
        });
        const rightAnswer = q.querySelector('.rightanswer');
        if (rightAnswer) {
          questionData.correctAnswer = rightAnswer.textContent.trim();
        }
      } else if (qType === 'essay') {
        const essayText = q.querySelector('.qtype_essay_response, .answer .editor_atto_content, .answer textarea');
        if (essayText) {
          questionData.userAnswer = essayText.textContent.trim() || essayText.value || '';
        }
      } else if (qType === 'multianswer') {
        // Cloze questions - вопросы с пропусками
        const subquestions = q.querySelectorAll('select, input[type="text"]');
        subquestions.forEach((sq, i) => {
          if (sq.tagName === 'SELECT') {
            questionData.answers.push({ 
              position: i + 1, 
              userAnswer: sq.options[sq.selectedIndex]?.text || '' 
            });
          } else {
            questionData.answers.push({ 
              position: i + 1, 
              userAnswer: sq.value || '' 
            });
          }
        });
        const rightAnswer = q.querySelector('.rightanswer');
        if (rightAnswer) {
          questionData.correctAnswer = rightAnswer.textContent.trim();
        }
      }
      
      // Общий feedback / правильный ответ
      if (!questionData.correctAnswer) {
        const rightAnswer = q.querySelector('.rightanswer');
        if (rightAnswer) {
          questionData.correctAnswer = rightAnswer.textContent.trim()
            .replace(/^Правильный ответ:\s*/i, '')
            .replace(/^The correct answer is:\s*/i, '');
        }
      }
      
      // Feedback
      const feedback = q.querySelector('.feedback, .generalfeedback');
      questionData.feedback = feedback ? feedback.textContent.trim() : '';
      
      // Specific feedback
      const specificFb = q.querySelector('.specificfeedback');
      if (specificFb) {
        questionData.specificFeedback = specificFb.textContent.trim();
      }
      
      allQuestions.push(questionData);
    });
  }
  
  // Форматируем вывод
  let output = '';
  output += '═'.repeat(60) + '\n';
  output += '  РЕЗУЛЬТАТЫ ТЕСТА\n';
  output += '  URL: ' + window.location.href + '\n';
  output += '  Дата парсинга: ' + new Date().toLocaleString('ru-RU') + '\n';
  output += '═'.repeat(60) + '\n\n';
  
  allQuestions.forEach((q, i) => {
    output += `${'─'.repeat(50)}\n`;
    output += `📋 Вопрос ${q.number}\n`;
    output += `${'─'.repeat(50)}\n`;
    output += `${q.text}\n\n`;
    
    if (q.state) output += `Статус: ${q.state}\n`;
    if (q.grade) output += `${q.grade}\n`;
    
    if (q.type === 'multichoice' || q.type === 'truefalse') {
      output += '\nВарианты ответов:\n';
      q.answers.forEach(a => {
        let marker = '  ';
        if (a.isSelected && a.isCorrect) marker = '✅';
        else if (a.isSelected && a.isIncorrect) marker = '❌';
        else if (a.isSelected) marker = '👉';
        else if (a.isCorrect) marker = '✅';
        output += `  ${marker} ${a.text}\n`;
      });
    }
    
    if (q.type === 'match') {
      output += '\nСоответствия:\n';
      q.answers.forEach(a => {
        output += `  ${a.left} → ${a.right}\n`;
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
      output += `\n✅ Правильный ответ: ${q.correctAnswer}\n`;
    }
    
    if (q.specificFeedback) {
      output += `\n💬 Комментарий: ${q.specificFeedback}\n`;
    }
    
    output += '\n';
  });
  
  output += '═'.repeat(60) + '\n';
  output += `Всего вопросов: ${allQuestions.length}\n`;
  output += '═'.repeat(60) + '\n';
  
  // Выводим в консоль
  console.log(output);
  
  // Скачиваем как файл
  const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `quiz_answers_${new Date().toISOString().slice(0,10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
  
  console.log(`\n✅ Готово! Найдено ${allQuestions.length} вопросов. Файл скачан.`);
  
  // Также возвращаем данные в JSON
  return allQuestions;
})();

// Глобальная переменная для хранения текущей активной textarea и её выделения
let currentTextarea = null;
let savedSelection = new WeakMap(); // Используем WeakMap для хранения позиций каждой textarea

// Создаем панель инструментов
function createToolbar(textarea) {
  const toolbar = document.createElement('div');
  toolbar.id = 'steam-bb-toolbar';
  toolbar.className = 'steam-bb-toolbar';
  
  const bbCodes = [
    { name: 'B', title: 'Жирный', tag: 'b' },
    { name: 'I', title: 'Курсив', tag: 'i' },
    { name: 'U', title: 'Подчеркнутый', tag: 'u' },
    { name: 'S', title: 'Зачеркнутый', tag: 'strike' },
    { name: 'H1', title: 'Заголовок 1', tag: 'h1' },
    { name: 'H2', title: 'Заголовок 2', tag: 'h2' },
    { name: 'H3', title: 'Заголовок 3', tag: 'h3' },
    { name: '💬', title: 'Цитата', tag: 'quote', withAuthor: true },
    { name: '👁️', title: 'Спойлер', tag: 'spoiler' },
    { name: '👩🏻‍💻', title: 'Код', tag: 'code' },
    { name: '🔗', title: 'Ссылка', tag: 'url', needsUrl: true },
    { name: '📝', title: 'Список', tag: 'list', isList: true },
    { name: '🔢', title: 'Нумерованный список', tag: 'olist', isList: true },
    { name: '📊', title: 'Таблица', tag: 'table', isTable: true },
    { name: '—', title: 'Горизонтальная линия', tag: 'hr', isHr: true }
  ];
  
  bbCodes.forEach(code => {
    const btn = document.createElement('button');
    btn.className = 'bb-button';
    btn.innerHTML = code.name;
    btn.title = code.title;
    btn.type = 'button'; // Предотвращаем отправку формы
    
    // ВАЖНО: Используем onmousedown вместо onclick
    // это предотвращает потерю фокуса с textarea
    btn.onmousedown = (e) => {
      e.preventDefault(); // Предотвращаем потерю фокуса
      insertBBCode(code, textarea);
      return false;
    };
    
    toolbar.appendChild(btn);
  });
  
  return toolbar;
}


// Сохранение позиции выделения для конкретной textarea
function saveSelection(textarea) {
  if (textarea && textarea.tagName === 'TEXTAREA') {
    savedSelection.set(textarea, {
      start: textarea.selectionStart,
      end: textarea.selectionEnd
    });
  }
}

// Получение сохраненной позиции для textarea
function getSavedSelection(textarea) {
  return savedSelection.get(textarea) || { start: 0, end: 0 };
}

// Вставка BB-кода
function insertBBCode(code, textarea) {
  // Используем переданную textarea вместо document.activeElement
  if (!textarea || (textarea.tagName !== 'TEXTAREA' && !textarea.isContentEditable)) {
    alert('Пожалуйста, выберите текстовое поле для форматирования');
    return;
  }
  
  // Используем текущие позиции, если они валидны, иначе сохраненные
  // Важно: используем ?? вместо || чтобы правильно обработать позицию 0
  const saved = getSavedSelection(textarea);
  let start = textarea.selectionStart ?? saved.start;
  let end = textarea.selectionEnd ?? saved.end;
  
  const selectedText = textarea.value.substring(start, end);
  const beforeText = textarea.value.substring(0, start);
  const afterText = textarea.value.substring(end);
  
  let replacement = '';
  
  if (code.isHr) {
    replacement = '[hr][/hr]';
  } else if (code.isList) {
    const items = selectedText.split('\n').filter(line => line.trim());
    if (items.length === 0) {
      replacement = `[${code.tag}]\n[*]Пункт 1\n[*]Пункт 2\n[*]Пункт 3\n[/${code.tag}]`;
    } else {
      const listItems = items.map(item => `[*]${item.trim()}`).join('\n');
      replacement = `[${code.tag}]\n${listItems}\n[/${code.tag}]`;
    }
  } else if (code.isTable) {
    if (selectedText) {
      replacement = `[table]\n[tr]\n[th]${selectedText}[/th]\n[th]Колонка 2[/th]\n[/tr]\n[tr]\n[td]Данные 1[/td]\n[td]Данные 2[/td]\n[/tr]\n[/table]`;
    } else {
      replacement = '[table]\n[tr]\n[th]Колонка 1[/th]\n[th]Колонка 2[/th]\n[/tr]\n[tr]\n[td]Данные 1[/td]\n[td]Данные 2[/td]\n[/tr]\n[/table]';
    }
  } else if (code.needsUrl) {
    const url = prompt('Введите URL:');
    if (url) {
      replacement = `[${code.tag}=${url}]${selectedText || 'текст ссылки'}[/${code.tag}]`;
    } else {
      return;
    }
  } else if (code.withAuthor) {
    const author = prompt('Введите имя автора цитаты (или оставьте пустым):');
    if (author) {
      replacement = `[${code.tag}=${author}]${selectedText || 'текст цитаты'}[/${code.tag}]`;
    } else {
      replacement = `[${code.tag}]${selectedText || 'текст цитаты'}[/${code.tag}]`;
    }
  } else {
    replacement = `[${code.tag}]${selectedText || 'текст'}[/${code.tag}]`;
  }
  
  textarea.value = beforeText + replacement + afterText;
  
  // Устанавливаем курсор
  const newPos = start + replacement.length;
  textarea.setSelectionRange(newPos, newPos);
  textarea.focus();
  
  // Обновляем сохраненную позицию для этой textarea
  saveSelection(textarea);
  
  // Триггерим событие для Steam
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));
}

// Умная вставка панели перед textarea
function insertToolbarBeforeTextarea(toolbar, textarea) {
  try {
    // Проверяем, не вставлена ли уже панель
    if (textarea.previousSibling && textarea.previousSibling.classList && 
        textarea.previousSibling.classList.contains('steam-bb-toolbar')) {
      // Панель уже на месте
      console.log('Steam BB Codes: панель уже добавлена к этой textarea');
      return;
    }
    
    const parent = textarea.parentNode;
    if (!parent) {
      console.warn('Steam BB Codes: textarea не имеет родителя');
      return;
    }
    
    // Создаем контейнер-обертку для textarea и панели
    const wrapper = document.createElement('div');
    wrapper.className = 'steam-bb-container';
    wrapper.style.cssText = 'display: block; position: relative; width: 100%;';
    
    // Заменяем textarea на wrapper
    parent.replaceChild(wrapper, textarea);
    
    // Добавляем панель и textarea в wrapper
    wrapper.appendChild(toolbar);
    wrapper.appendChild(textarea);
    
    // Устанавливаем правильную ширину панели под textarea
    const updateToolbarWidth = () => {
      if (textarea.offsetWidth > 0) {
        toolbar.style.width = textarea.offsetWidth;
      }
    };
    
    // Устанавливаем ширину сразу и после небольшой задержки
    setTimeout(updateToolbarWidth, 10);
    setTimeout(updateToolbarWidth, 100);
    
    // Следим за изменением размера textarea
    const resizeObserver = new ResizeObserver(() => {
      updateToolbarWidth();
    });
    resizeObserver.observe(textarea);
    
    console.log('Steam BB Codes: панель успешно добавлена перед textarea');
    
  } catch (error) {
    console.error('Steam BB Codes: ошибка при вставке панели', error);
  }
}

// Инициализация
function init() {
  // Ищем все textarea, включая с классом input_box
  const textareas = document.querySelectorAll('textarea, textarea.input_box, textarea#game_recommendation');
  
  console.log('Steam BB Codes: найдено текстовых полей:', textareas.length);
  
  textareas.forEach(textarea => {
	  //  Пропускаем скрытые textarea
  if (getComputedStyle(textarea).display === 'none') {
    console.log('Steam BB Codes: пропускаю скрытое поле:', textarea);
    return; // Не обрабатываем скрытые поля
  }
    // Проверяем, не добавлена ли уже панель
    if (textarea.dataset.bbToolbarAdded === 'true') {
      return;
    }
    
    console.log('Steam BB Codes: добавляю панель к', textarea.id || textarea.className);
    
    const toolbar = createToolbar(textarea);
    
    // Помечаем, что панель добавлена
    textarea.dataset.bbToolbarAdded = 'true';
    
    // Добавляем обработчики для отслеживания фокуса и выделения
    textarea.addEventListener('focus', () => {
      currentTextarea = textarea;
      // Инициализируем позицию при фокусе
      saveSelection(textarea);
    });
    
    textarea.addEventListener('blur', () => {
      // Сохраняем выделение перед потерей фокуса
      saveSelection(textarea);
    });
    
    textarea.addEventListener('mouseup', () => {
      saveSelection(textarea);
    });
    
    textarea.addEventListener('keyup', () => {
      saveSelection(textarea);
    });
    
    textarea.addEventListener('input', () => {
      saveSelection(textarea);
    });
    
    // Вставляем панель перед textarea более надежным способом
    insertToolbarBeforeTextarea(toolbar, textarea);
  });
}

// Запускаем с задержкой и несколько раз
setTimeout(init, 500);
setTimeout(init, 1000);
setTimeout(init, 2000);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Наблюдатель за изменениями DOM
const observer = new MutationObserver((mutations) => {
  let shouldInit = false;
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length) {
      mutation.addedNodes.forEach(node => {
        if (node.tagName === 'TEXTAREA' || (node.querySelector && node.querySelector('textarea'))) {
          shouldInit = true;
        }
      });
    }
  });
  if (shouldInit) {
    setTimeout(init, 100);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

console.log('Steam BB Codes Extension загружено!');

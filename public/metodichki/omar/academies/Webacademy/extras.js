/* ===== Web Academy — EXTRAS =====
   Adds MORE unique tasks, quiz questions and examples for every covered topic.
   All entries are different from those already in content.js / examples.js.
*/
(function(){
  'use strict';

  // ---------- Helper: merge into existing objects without overwriting ----------
  function mergeTopic(target, id, addTasks, addQuiz){
    if (!target[id]) target[id] = { tasks:[], quiz:[] };
    if (addTasks) target[id].tasks = (target[id].tasks||[]).concat(addTasks);
    if (addQuiz)  target[id].quiz  = (target[id].quiz ||[]).concat(addQuiz);
  }
  function addExamples(target, id, list){
    if (!target[id]) target[id] = [];
    target[id] = target[id].concat(list);
  }

  // Wait until base content.js / examples.js have loaded
  const TC = window.TOPIC_CONTENT || (window.TOPIC_CONTENT = {});
  const TE = window.TOPIC_EXAMPLES || (window.TOPIC_EXAMPLES = {});

  /* =========================================================
     TOPIC 1 — Что такое веб
     ========================================================= */
  mergeTopic(TC, 1,
    [
      {q:"Нарисуй на бумаге путь запроса: ты → браузер → сервер → ответ.", hint:"Стрелочки в обе стороны.", solution:"// схема: клиент ↔ HTTP ↔ сервер"},
      {q:"Открой Network в DevTools и обнови страницу — сколько запросов?", hint:"Вкладка Network, F5.", solution:"// у обычной страницы 5–50 запросов"},
      {q:"Найди в Network главный документ (тип document) и посмотри его статус.", hint:"Status 200 = ОК.", solution:"// 200 OK"},
      {q:"Сравни два сайта: какой грузится быстрее? Запиши время загрузки.", hint:"Колонка Time во вкладке Network.", solution:"// например, 350 мс vs 1.2 с"},
      {q:"Напиши страничку-привет с твоим любимым цветом фона.", hint:"<body style='background:...'>.", solution:"<body style=\"background:#ffd83d\"><h1>Привет!</h1></body>"},
    ],
    [
      {q:"Что такое URL?", opts:["Адрес страницы","Имя файла","Версия HTML","Тип сервера"], answer:0},
      {q:"Какой код значит «всё хорошо»?", opts:["404","500","200","302"], answer:2},
      {q:"Кто отправляет запрос?", opts:["Сервер","Клиент (браузер)","База данных","Принтер"], answer:1},
      {q:"Что такое DNS простыми словами?", opts:["Телефонная книга интернета","Антивирус","Браузер","Сервер игр"], answer:0},
      {q:"HTTPS отличается от HTTP тем, что…", opts:["Быстрее","Шифрует данные","Без картинок","Без JS"], answer:1},
    ]
  );

  /* =========================================================
     TOPIC 2 — Структура HTML
     ========================================================= */
  mergeTopic(TC, 2,
    [
      {q:"Добавь description в head (meta name='description').", hint:"<meta name='description' content='...'>", solution:"<meta name=\"description\" content=\"Мой сайт о котах\">"},
      {q:"Добавь og:title для красивой ссылки в соцсетях.", hint:"<meta property='og:title' ...>", solution:"<meta property=\"og:title\" content=\"Сайт о котах\">"},
      {q:"Сделай страницу с двумя <section> и общим <header>.", hint:"header + 2 section.", solution:"<header><h1>Привет</h1></header><section>А</section><section>Б</section>"},
      {q:"Используй <main> для основного содержимого.", hint:"Один <main> на странице.", solution:"<main><h1>Главная</h1></main>"},
      {q:"Добавь <footer> с © и годом.", hint:"<footer>...</footer>.", solution:"<footer>© 2026 Аня</footer>"},
    ],
    [
      {q:"Сколько <main> можно на странице?", opts:["1","2","Сколько угодно","0"], answer:0},
      {q:"og:title нужен для…", opts:["SEO/соцсетей","Скорости","Безопасности","Цвета"], answer:0},
      {q:"<footer> — это…", opts:["Подвал","Шапка","Меню","Контент"], answer:0},
      {q:"meta description влияет на…", opts:["Сниппет в Google","Цвет","Шрифт","Размер картинки"], answer:0},
      {q:"<section> — это…", opts:["Раздел контента","Кнопка","Скрипт","Картинка"], answer:0},
    ]
  );

  /* =========================================================
     TOPIC 3 — Текст и теги
     ========================================================= */
  mergeTopic(TC, 3,
    [
      {q:"Сделай <mark> вокруг важного слова.", hint:"<mark>...</mark>.", solution:"<p>Это <mark>важно</mark>.</p>"},
      {q:"Используй <abbr> с расшифровкой.", hint:"title=...", solution:"<abbr title=\"HyperText Markup Language\">HTML</abbr>"},
      {q:"Используй <kbd> для клавиш Ctrl+S.", hint:"<kbd>Ctrl</kbd>+<kbd>S</kbd>", solution:"<kbd>Ctrl</kbd>+<kbd>S</kbd>"},
      {q:"Сделай нижний и верхний индекс: H2O и x².", hint:"<sub>, <sup>.", solution:"H<sub>2</sub>O и x<sup>2</sup>"},
      {q:"Оформи длинную цитату через <blockquote>.", hint:"<blockquote>...</blockquote>.", solution:"<blockquote>Знание — сила.</blockquote>"},
    ],
    [
      {q:"<mark> — это…", opts:["Подсветка","Курсив","Жирный","Зачёркивание"], answer:0},
      {q:"<kbd> используют для…", opts:["Кода","Клавиш клавиатуры","Картинок","Ссылок"], answer:1},
      {q:"<sup> — это…", opts:["Верхний индекс","Нижний","Жирный","Тонкий"], answer:0},
      {q:"<abbr> добавляет…", opts:["Расшифровку","Стиль","Цвет","Скрипт"], answer:0},
      {q:"<blockquote> — это…", opts:["Цитата большая","Кнопка","Список","Ссылка"], answer:0},
    ]
  );

  /* =========================================================
     EXAMPLES — добавляем НОВЫЕ примеры (отличные от уже существующих)
     ========================================================= */

  // Тема 1 — Что такое веб
  addExamples(TE, 1, [
    {title:"Самая короткая страница", code:"<!doctype html><title>Hi</title><p>Привет, веб!", output:"Браузер всё равно покажет 'Привет, веб!'", explanation:"Браузер прощает многое — но лучше писать полно."},
    {title:"Ссылка на внешний сайт", code:"<a href=\"https://wikipedia.org\" target=\"_blank\" rel=\"noopener\">Википедия ↗</a>", output:"Откроется в новой вкладке", explanation:"target=_blank + rel=noopener — безопасная новая вкладка."},
    {title:"Картинка из интернета", code:"<img src=\"https://placekitten.com/300/200\" alt=\"котик\">", output:"Котик 300×200", explanation:"alt — текст, если картинка не загрузилась."},
  ]);

  // Тема 2 — Структура HTML — НОВЫЕ примеры
  addExamples(TE, 2, [
    {title:"Семантический скелет", code:"<body>\n  <header><h1>Блог</h1></header>\n  <nav><a href='/'>Дом</a></nav>\n  <main><article>Пост…</article></main>\n  <footer>© 2026</footer>\n</body>", output:"Шапка + меню + контент + подвал", explanation:"Семантика помогает поисковикам и читалкам."},
    {title:"Open Graph для соцсетей", code:"<meta property=\"og:title\" content=\"Лучший рецепт пиццы\">\n<meta property=\"og:image\" content=\"pizza.jpg\">", output:"Красивая карточка в Telegram/VK", explanation:"og:* — это превью при шаринге ссылки."},
  ]);

  // Тема 3 — Текст
  addExamples(TE, 3, [
    {title:"Подсветка важного", code:"<p>Сегодня <mark>важная</mark> дата.</p>", output:"Слово 'важная' с жёлтым фоном", explanation:"<mark> работает как маркер."},
    {title:"Химия и математика", code:"<p>Формула воды: H<sub>2</sub>O, площадь круга: πr<sup>2</sup>.</p>", output:"H₂O и r²", explanation:"<sub> вниз, <sup> вверх."},
    {title:"Горячие клавиши", code:"<p>Сохранить: <kbd>Ctrl</kbd> + <kbd>S</kbd></p>", output:"Кнопки выглядят как клавиши", explanation:"Браузер сам стилизует <kbd>."},
  ]);

  // Тема 8 — CSS базовый
  addExamples(TE, 8, [
    {title:"Список без точек", code:"ul { list-style: none; padding: 0; }", output:"Список без маркеров", explanation:"list-style:none убирает точки."},
    {title:"Ссылки без подчёркивания", code:"a { text-decoration: none; color: #0a84ff; }", output:"Чистые синие ссылки", explanation:"text-decoration управляет линиями."},
    {title:"Тень у карточки", code:".card { box-shadow: 0 6px 20px rgba(0,0,0,.12); border-radius: 12px; }", output:"Карточка как будто парит", explanation:"box-shadow = X Y blur color."},
    {title:"Плавный hover", code:"button { transition: transform .2s; }\nbutton:hover { transform: scale(1.05); }", output:"Кнопка чуть растёт при наведении", explanation:"transition сглаживает изменения."},
  ]);

  // Тема 12 — Flexbox (новые)
  addExamples(TE, 12, [
    {title:"Колонка вместо строки", code:".col { display:flex; flex-direction: column; gap: 8px; }", output:"Элементы друг под другом", explanation:"flex-direction:column — вертикально."},
    {title:"Прижать кнопку вниз", code:".card { display:flex; flex-direction:column; }\n.card .btn { margin-top: auto; }", output:"Кнопка всегда внизу карточки", explanation:"margin-top:auto толкает элемент вниз во flex."},
    {title:"Равные колонки", code:".cols > * { flex: 1; }", output:"Все колонки одинаковой ширины", explanation:"flex:1 у всех = поровну."},
  ]);

  // Тема 13 — CSS Grid (новая)
  addExamples(TE, 13, [
    {title:"Сетка 3 колонки", code:".grid { display:grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }", output:"Три равные колонки с отступами", explanation:"repeat(3,1fr) = 3 равные доли."},
    {title:"Адаптивная сетка", code:".grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap:12px; }", output:"Колонки сами подстраиваются под ширину", explanation:"auto-fit + minmax = классика отзывчивости."},
    {title:"Главная + сайдбар", code:".layout { display:grid; grid-template-columns: 1fr 280px; gap: 24px; }", output:"Контент слева, панель справа 280px", explanation:"Грид принимает разные единицы."},
  ]);

  // Тема 17 — JS базовый (новые)
  addExamples(TE, 17, [
    {title:"Массив и длина", code:"const arr=['a','b','c']; console.log(arr.length);", output:"3", explanation:"length — кол-во элементов."},
    {title:"if/else", code:"const t=20; console.log(t>15?'тепло':'холодно');", output:"тепло", explanation:"Тернарный = короткий if."},
    {title:"Функция-приветствие", code:"function hi(name){ return `Привет, ${name}!`; }\nconsole.log(hi('Аня'));", output:"Привет, Аня!", explanation:"return возвращает значение из функции."},
    {title:"Цикл for", code:"for(let i=1;i<=3;i++) console.log('Шаг',i);", output:"Шаг 1 / Шаг 2 / Шаг 3", explanation:"i — счётчик."},
  ]);

  // Тема 23 — DOM (новые)
  addExamples(TE, 23, [
    {title:"Удалить элемент", code:"document.querySelector('.toast').remove();", output:"Тост исчезает", explanation:".remove() удаляет узел из DOM."},
    {title:"Сменить картинку", code:"document.querySelector('img').src='cat.jpg';", output:"Картинка меняется на cat.jpg", explanation:"У <img> атрибут — src."},
    {title:"Переключить класс", code:"document.body.classList.toggle('dark');", output:"Тема переключается", explanation:"toggle добавит если нет / уберёт если есть."},
  ]);

  // Тема 25 — События (новые)
  addExamples(TE, 25, [
    {title:"Двойной клик", code:"el.addEventListener('dblclick',()=>el.classList.toggle('big'));", output:"Двойной клик — переключает размер", explanation:"Событие dblclick."},
    {title:"Делегирование", code:"list.addEventListener('click',e=>{\n  if(e.target.matches('li')) e.target.remove();\n});", output:"Клик по любому <li> удаляет его", explanation:"Один слушатель на родителе — экономия."},
    {title:"Mouse move", code:"document.addEventListener('mousemove',e=>{\n  cursor.style.left=e.pageX+'px';\n  cursor.style.top =e.pageY+'px';\n});", output:"Кружок следует за мышкой", explanation:"pageX/pageY — координаты курсора."},
  ]);

  // Тема 28 — async/await (новая)
  addExamples(TE, 28, [
    {title:"async + try/catch", code:"async function load(){\n  try{ const r=await fetch('/api'); if(!r.ok) throw r;\n    return await r.json();\n  } catch(e){ console.error('Ошибка',e); }\n}", output:"Чистая обработка ошибок", explanation:"try/catch работает с await."},
    {title:"Параллельные запросы", code:"const [u,p]=await Promise.all([\n  fetch('/u').then(r=>r.json()),\n  fetch('/p').then(r=>r.json())\n]);", output:"Оба грузятся одновременно", explanation:"Promise.all быстрее последовательных await."},
    {title:"Тайм-аут", code:"const ctrl=new AbortController();\nsetTimeout(()=>ctrl.abort(), 3000);\nfetch(url,{signal:ctrl.signal});", output:"Запрос отменится через 3 сек", explanation:"AbortController — отмена fetch."},
  ]);

  // Тема 31 — fetch (новые)
  addExamples(TE, 31, [
    {title:"GET с заголовком", code:"fetch('/api/me', { headers:{ Authorization:'Bearer TOKEN' } }).then(r=>r.json());", output:"Сервер видит токен", explanation:"headers — объект с заголовками."},
    {title:"DELETE", code:"fetch('/api/users/5',{method:'DELETE'}).then(r=>console.log(r.status));", output:"204 No Content", explanation:"Метод DELETE удаляет ресурс."},
    {title:"FormData загрузка", code:"const fd=new FormData();\nfd.append('file', input.files[0]);\nfetch('/upload',{method:'POST', body:fd});", output:"Файл загружается", explanation:"FormData сам выставит Content-Type."},
  ]);

  // Тема 33 — REST (новая)
  addExamples(TE, 33, [
    {title:"CRUD адреса", code:"GET    /api/posts      // список\nGET    /api/posts/12   // один\nPOST   /api/posts      // создать\nPUT    /api/posts/12   // обновить\nDELETE /api/posts/12   // удалить", output:"Стандартные REST-маршруты", explanation:"Глагол + ресурс = REST."},
    {title:"Статусы ответов", code:"200 OK\n201 Created\n204 No Content\n400 Bad Request\n401 Unauthorized\n404 Not Found\n500 Server Error", output:"Шпаргалка статусов", explanation:"2xx — успех, 4xx — клиент, 5xx — сервер."},
  ]);

  // Тема 34 — JSON (новые)
  addExamples(TE, 34, [
    {title:"Массив объектов", code:"JSON.stringify([{n:'Аня'},{n:'Боря'}]);", output:"'[{\"n\":\"Аня\"},{\"n\":\"Боря\"}]'", explanation:"Массивы и объекты можно вкладывать."},
    {title:"Сохранить в localStorage", code:"localStorage.setItem('user', JSON.stringify({name:'Аня', xp:120}));", output:"Объект в хранилище", explanation:"localStorage хранит ТОЛЬКО строки."},
    {title:"Достать из localStorage", code:"const u=JSON.parse(localStorage.getItem('user')||'{}');", output:"Объект пользователя", explanation:"||'{}' защищает от null."},
  ]);

  // Тема 36 — Безопасность / прочее (новая)
  addExamples(TE, 36, [
    {title:"Эскейп пользовательского текста", code:"el.textContent = userInput; // безопасно\n// НЕ: el.innerHTML = userInput;", output:"Текст показан как текст", explanation:"textContent защищает от XSS."},
    {title:"HTTPS-редирект", code:"if(location.protocol==='http:') location.replace('https://'+location.host+location.pathname);", output:"Переход на защищённое соединение", explanation:"HTTPS — обязателен в современных сайтах."},
  ]);

  console.log('[Web Academy] extras.js loaded — bonus tasks & examples ready');
})();

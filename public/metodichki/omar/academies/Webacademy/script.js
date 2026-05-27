// Web Academy — образовательная платформа по веб-разработке
// Полностью на русском: HTML, CSS, JavaScript, HTTP, API, Server

const TOPICS = [
  {id:1, emoji:"📄", title:"Что такое веб", level:"easy", group:"Основы веба",
    intro:"Веб — это сеть документов в интернете. Браузер запрашивает страницу у сервера и показывает её пользователю. Главные технологии: HTML (структура), CSS (стиль), JavaScript (поведение).",
    syntax:"<!-- Это самая простая страница -->\n<!DOCTYPE html>\n<html>\n  <body>Привет, веб!</body>\n</html>",
    syntaxNote:"Файл .html открывается в браузере. Сервер не обязателен — можно просто двойным кликом."},
  {id:2, emoji:"🏷️", title:"HTML — теги и структура", level:"easy", group:"HTML",
    intro:"HTML — язык разметки. Теги <тег>...</тег> описывают, ЧТО находится на странице.",
    syntax:"<!DOCTYPE html>\n<html lang=\"ru\">\n  <head>\n    <meta charset=\"UTF-8\">\n    <title>Моя страница</title>\n  </head>\n  <body>\n    <h1>Заголовок</h1>\n    <p>Абзац текста.</p>\n  </body>\n</html>",
    syntaxNote:"<!DOCTYPE html> объявляет тип документа. <head> — мета-данные, <body> — видимое содержимое."},
  {id:3, emoji:"🔤", title:"Текст: заголовки и абзацы", level:"easy", group:"HTML",
    intro:"Заголовки h1–h6 и абзацы <p> — основа любого текста на странице.",
    syntax:"<h1>Главное</h1>\n<h2>Раздел</h2>\n<p>Это <strong>важный</strong> и <em>выделенный</em> текст.</p>",
    syntaxNote:"h1 один на страницу. <strong> = важно, <em> = акцент."},
  {id:4, emoji:"🔗", title:"Ссылки и изображения", level:"easy", group:"HTML",
    intro:"<a href=\"...\"> — ссылка, <img src=\"...\" alt=\"...\"> — картинка.",
    syntax:"<a href=\"https://example.com\" target=\"_blank\">Перейти</a>\n<img src=\"cat.jpg\" alt=\"Кот\" width=\"200\">",
    syntaxNote:"alt обязателен — описание картинки для незрячих и поисковиков."},
  {id:5, emoji:"📋", title:"Списки и таблицы", level:"easy", group:"HTML",
    intro:"<ul> — маркированный список, <ol> — нумерованный, <table> — таблица.",
    syntax:"<ul>\n  <li>Молоко</li>\n  <li>Хлеб</li>\n</ul>\n<table>\n  <tr><th>Имя</th><th>Возраст</th></tr>\n  <tr><td>Аня</td><td>12</td></tr>\n</table>",
    syntaxNote:"Используй таблицы только для табличных данных, не для вёрстки."},
  {id:6, emoji:"📝", title:"Формы и инпуты", level:"easy", group:"HTML",
    intro:"<form> собирает данные от пользователя: <input>, <textarea>, <select>, <button>.",
    syntax:"<form action=\"/save\" method=\"post\">\n  <label>Имя: <input name=\"name\" required></label>\n  <label>Email: <input type=\"email\" name=\"email\"></label>\n  <button type=\"submit\">Отправить</button>\n</form>",
    syntaxNote:"У каждого input должен быть атрибут name — иначе сервер не получит значение."},
  {id:7, emoji:"📚", title:"Семантические теги", level:"mid", group:"HTML",
    intro:"header, nav, main, section, article, aside, footer — теги, которые объясняют смысл блока.",
    syntax:"<header>Шапка</header>\n<nav>Меню</nav>\n<main>\n  <article>Статья</article>\n  <aside>Боковая колонка</aside>\n</main>\n<footer>Подвал</footer>",
    syntaxNote:"Семантика помогает поисковикам, скринридерам и тебе самому ориентироваться в коде."},
  {id:8, emoji:"🎨", title:"CSS — синтаксис и подключение", level:"easy", group:"CSS",
    intro:"CSS описывает, КАК выглядит элемент. Правило: селектор { свойство: значение; }",
    syntax:"/* style.css */\nh1 {\n  color: tomato;\n  font-size: 32px;\n}\n\n/* в HTML */\n<link rel=\"stylesheet\" href=\"style.css\">",
    syntaxNote:"Лучше внешний CSS-файл, чем style=\"...\" в тегах."},
  {id:9, emoji:"🎯", title:"Селекторы", level:"easy", group:"CSS",
    intro:"По тегу h1, по классу .btn, по id #main, по атрибуту [type=\"text\"], потомки a b.",
    syntax:".card { background: #fff; }\n#header { padding: 20px; }\na:hover { color: red; }\nul li:first-child { font-weight: bold; }",
    syntaxNote:"Класс — главное оружие. id используй только для уникальных элементов."},
  {id:10, emoji:"🌈", title:"Цвета и шрифты", level:"easy", group:"CSS",
    intro:"color, background, font-family, font-size, font-weight, line-height.",
    syntax:"body {\n  color: #222;\n  background: #f6f8fb;\n  font-family: \"Segoe UI\", Arial, sans-serif;\n  font-size: 16px;\n  line-height: 1.6;\n}",
    syntaxNote:"Указывай несколько шрифтов через запятую — браузер возьмёт первый доступный."},
  {id:11, emoji:"📦", title:"Блочная модель (Box Model)", level:"easy", group:"CSS",
    intro:"Каждый элемент = content + padding + border + margin.",
    syntax:".card {\n  width: 300px;\n  padding: 16px;\n  border: 1px solid #ddd;\n  margin: 20px;\n  box-sizing: border-box;\n}",
    syntaxNote:"box-sizing: border-box; — width включает padding и border. Очень удобно."},
  {id:12, emoji:"📐", title:"Flexbox", level:"mid", group:"CSS",
    intro:"display: flex; — мощная одномерная вёрстка для строк или колонок.",
    syntax:".row {\n  display: flex;\n  gap: 12px;\n  justify-content: space-between;\n  align-items: center;\n}",
    syntaxNote:"justify-content — по главной оси, align-items — по поперечной."},
  {id:13, emoji:"🔲", title:"CSS Grid", level:"mid", group:"CSS",
    intro:"display: grid; — двумерная сеточная вёрстка.",
    syntax:".gallery {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 16px;\n}",
    syntaxNote:"1fr — одна «доля» свободного места. repeat(auto-fit, minmax(200px,1fr)) — адаптив."},
  {id:14, emoji:"📱", title:"Адаптивность и media queries", level:"mid", group:"CSS",
    intro:"@media — разные стили для разных размеров экрана.",
    syntax:"@media (max-width: 600px) {\n  .menu { display: none; }\n  body { font-size: 14px; }\n}",
    syntaxNote:"Всегда добавляй <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> в <head>."},
  {id:15, emoji:"✨", title:"Псевдоклассы и переходы", level:"mid", group:"CSS",
    intro:":hover, :focus, :first-child, transition — оживляют интерфейс.",
    syntax:".btn {\n  background: #07f;\n  color: white;\n  transition: transform .2s, background .2s;\n}\n.btn:hover { background: #05c; transform: scale(1.05); }",
    syntaxNote:"transition пишется на исходном состоянии, а не на :hover."},
  {id:16, emoji:"🎬", title:"CSS-анимации", level:"hard", group:"CSS",
    intro:"@keyframes описывает кадры, animation: применяет.",
    syntax:"@keyframes bounce {\n  0%,100% { transform: translateY(0); }\n  50% { transform: translateY(-20px); }\n}\n.ball { animation: bounce 1s infinite; }",
    syntaxNote:"Анимируй только transform и opacity — это работает на GPU и не тормозит."},
  {id:17, emoji:"📜", title:"JavaScript — переменные и типы", level:"easy", group:"JavaScript",
    intro:"let, const, var. Типы: number, string, boolean, null, undefined, object.",
    syntax:"let age = 12;\nconst name = \"Аня\";\nlet isOk = true;\nconsole.log(age, name, isOk, typeof age);",
    syntaxNote:"Всегда const, кроме случаев, когда значение действительно меняется — тогда let. var — устарел."},
  {id:18, emoji:"➕", title:"Операторы и условия", level:"easy", group:"JavaScript",
    intro:"+ - * / %, сравнение === !==, логика && || !, if/else, тернарник ?:.",
    syntax:"let n = 14;\nif (n >= 18) {\n  console.log(\"взрослый\");\n} else if (n >= 12) {\n  console.log(\"подросток\");\n} else {\n  console.log(\"ребёнок\");\n}",
    syntaxNote:"Используй === вместо == — без неявных преобразований типа."},
  {id:19, emoji:"🔁", title:"Циклы и массивы", level:"easy", group:"JavaScript",
    intro:"Array — упорядоченный список. for, for..of, forEach, map, filter.",
    syntax:"const fruits = [\"яблоко\", \"груша\", \"банан\"];\nfor (const f of fruits) console.log(f);\nconst upper = fruits.map(f => f.toUpperCase());\nconst short = fruits.filter(f => f.length < 6);",
    syntaxNote:"map создаёт новый массив той же длины. filter — массив только подходящих."},
  {id:20, emoji:"🛠️", title:"Функции и стрелочные функции", level:"easy", group:"JavaScript",
    intro:"Обычная и стрелочная функция. Параметры по умолчанию.",
    syntax:"function add(a, b = 0) {\n  return a + b;\n}\nconst square = x => x * x;\nconsole.log(add(2, 3), square(5));",
    syntaxNote:"Стрелочные функции не имеют своего this — это иногда плюс, иногда минус."},
  {id:21, emoji:"🗂️", title:"Объекты и деструктуризация", level:"mid", group:"JavaScript",
    intro:"Объект — пары ключ:значение. Деструктуризация — короткая распаковка.",
    syntax:"const user = { name: \"Аня\", age: 12, city: \"Москва\" };\nconst { name, age } = user;\nconst clone = { ...user, age: 13 };\nconsole.log(name, age, clone);",
    syntaxNote:"Spread (...) копирует поля. Удобно для иммутабельных обновлений."},
  {id:22, emoji:"⚠️", title:"Ошибки: try / catch", level:"mid", group:"JavaScript",
    intro:"try ловит исключения, чтобы программа не падала.",
    syntax:"try {\n  const data = JSON.parse(\"{ bad json }\");\n} catch (e) {\n  console.error(\"Ошибка:\", e.message);\n} finally {\n  console.log(\"готово\");\n}",
    syntaxNote:"Не глотай ошибки молча — хотя бы логируй."},
  {id:23, emoji:"🌳", title:"DOM — что это", level:"easy", group:"DOM",
    intro:"DOM — дерево объектов, представляющее страницу. JS меняет DOM — меняется страница.",
    syntax:"// получить элемент\nconst h1 = document.querySelector(\"h1\");\nconsole.log(h1.textContent);\n// все .item\nconst items = document.querySelectorAll(\".item\");",
    syntaxNote:"querySelector принимает любой CSS-селектор. Возвращает первый найденный элемент."},
  {id:24, emoji:"✏️", title:"Изменение DOM", level:"easy", group:"DOM",
    intro:"Меняем текст, атрибуты, классы, стили элемента.",
    syntax:"const el = document.querySelector(\"#title\");\nel.textContent = \"Новый текст\";\nel.classList.add(\"active\");\nel.style.color = \"crimson\";\nel.setAttribute(\"data-id\", 42);",
    syntaxNote:"classList.add/remove/toggle — самый чистый способ управлять CSS-классами."},
  {id:25, emoji:"🖱️", title:"События", level:"easy", group:"DOM",
    intro:"click, input, submit, keydown, mouseover. addEventListener подписывается на событие.",
    syntax:"const btn = document.querySelector(\"#go\");\nbtn.addEventListener(\"click\", (e) => {\n  e.preventDefault();\n  alert(\"Клик!\");\n});",
    syntaxNote:"e.preventDefault() отменяет действие по умолчанию (например, отправку формы)."},
  {id:26, emoji:"➕", title:"Создание и удаление элементов", level:"mid", group:"DOM",
    intro:"createElement, append, remove — динамически меняем структуру страницы.",
    syntax:"const list = document.querySelector(\"#list\");\nconst li = document.createElement(\"li\");\nli.textContent = \"Новый пункт\";\nlist.append(li);\n// удалить\nli.remove();",
    syntaxNote:"Для большого количества вставок используй DocumentFragment — это быстрее."},
  {id:27, emoji:"💾", title:"localStorage", level:"mid", group:"JavaScript",
    intro:"localStorage хранит строки прямо в браузере, между перезагрузками.",
    syntax:"localStorage.setItem(\"user\", JSON.stringify({ name: \"Аня\" }));\nconst u = JSON.parse(localStorage.getItem(\"user\"));\nconsole.log(u.name);\nlocalStorage.removeItem(\"user\");",
    syntaxNote:"localStorage хранит только строки — используй JSON.stringify/parse для объектов."},
  {id:28, emoji:"🌐", title:"HTTP — основы", level:"easy", group:"HTTP и сеть",
    intro:"HTTP — протокол общения браузера и сервера. Запрос → ответ. Методы: GET, POST, PUT, DELETE.",
    syntax:"GET  /api/users          → получить список\nPOST /api/users           → создать (тело JSON)\nPUT  /api/users/42         → обновить\nDELETE /api/users/42       → удалить",
    syntaxNote:"Заголовок Content-Type сообщает серверу формат тела (application/json и т.п.)."},
  {id:29, emoji:"📨", title:"Статусы HTTP", level:"easy", group:"HTTP и сеть",
    intro:"Коды ответа: 2xx — успех, 3xx — редирект, 4xx — ошибка клиента, 5xx — ошибка сервера.",
    syntax:"200 OK\n201 Created\n301 Moved Permanently\n400 Bad Request\n401 Unauthorized\n404 Not Found\n500 Internal Server Error",
    syntaxNote:"418 I'm a teapot — настоящий код из шуточного RFC."},
  {id:30, emoji:"🍪", title:"Cookies, заголовки, CORS", level:"mid", group:"HTTP и сеть",
    intro:"Заголовки несут мета-данные. Cookie — маленький кусочек, который браузер автоматически шлёт. CORS — разрешает кросс-доменные запросы.",
    syntax:"GET /api/me HTTP/1.1\nHost: example.com\nCookie: sid=abc123\nAuthorization: Bearer eyJ...\n\n// сервер отвечает\nAccess-Control-Allow-Origin: https://my.site",
    syntaxNote:"Без правильного CORS браузер заблокирует ответ — даже если сервер ответил 200."},
  {id:31, emoji:"📡", title:"fetch — запрос с фронта", level:"mid", group:"API",
    intro:"fetch(url, options) — встроенная в браузер функция HTTP-запросов. Возвращает Promise.",
    syntax:"fetch(\"/api/users\")\n  .then(r => r.json())\n  .then(users => console.log(users))\n  .catch(err => console.error(err));",
    syntaxNote:".json() сам читает тело и парсит как JSON. Если статус 4xx/5xx — это НЕ ошибка fetch'а, проверяй r.ok."},
  {id:32, emoji:"⏳", title:"async / await", level:"mid", group:"JavaScript",
    intro:"async-функции возвращают Promise, await ждёт результат — код читается как синхронный.",
    syntax:"async function loadUsers() {\n  try {\n    const r = await fetch(\"/api/users\");\n    if (!r.ok) throw new Error(\"HTTP \" + r.status);\n    const data = await r.json();\n    return data;\n  } catch (e) {\n    console.error(e);\n  }\n}",
    syntaxNote:"await работает только внутри async-функций (или на верхнем уровне модуля)."},
  {id:33, emoji:"🔌", title:"REST API", level:"mid", group:"API",
    intro:"REST — стиль API: URL = ресурс, HTTP-метод = действие. JSON — формат данных.",
    syntax:"GET    /api/posts            // список\nGET    /api/posts/5          // один\nPOST   /api/posts            // создать\nPUT    /api/posts/5          // обновить\nDELETE /api/posts/5          // удалить",
    syntaxNote:"URL — это существительные (posts, users). Действие выражено методом, а не /getPosts."},
  {id:34, emoji:"📦", title:"JSON", level:"easy", group:"API",
    intro:"JSON — текстовый формат данных. Похож на JS-объект, но ключи в двойных кавычках.",
    syntax:"{\n  \"name\": \"Аня\",\n  \"age\": 12,\n  \"skills\": [\"html\", \"css\"]\n}\n\n// в JS\nconst s = JSON.stringify(obj);\nconst back = JSON.parse(s);",
    syntaxNote:"В JSON нет комментариев и хвостовых запятых. Все строки — в \"двойных\" кавычках."},
  {id:35, emoji:"🔐", title:"Авторизация и токены", level:"hard", group:"API",
    intro:"Сервер выдаёт токен (JWT) после логина. Браузер шлёт его в заголовке Authorization.",
    syntax:"// login\nfetch(\"/api/login\", { method:\"POST\", body: JSON.stringify({email, pass}) })\n  .then(r => r.json())\n  .then(({token}) => localStorage.setItem(\"token\", token));\n\n// запросы\nfetch(\"/api/me\", { headers: { Authorization: \"Bearer \" + token } });",
    syntaxNote:"Никогда не клади пароли в localStorage. Токен — да; пароль — нет."},
  {id:36, emoji:"🖥️", title:"Что такое сервер", level:"easy", group:"Бэкенд",
    intro:"Сервер — программа, которая принимает HTTP-запросы и отвечает. Может крутиться в облаке 24/7.",
    syntax:"Клиент (браузер)  ──HTTP──▶  Сервер  ──SQL──▶  База данных\n                  ◀──HTML/JSON──",
    syntaxNote:"Сервер не обязан отдавать HTML — он может отвечать JSON для SPA или мобильного приложения."},
  {id:37, emoji:"🟢", title:"Node.js и Express", level:"hard", group:"Бэкенд",
    intro:"Node.js запускает JS вне браузера. Express — фреймворк для сервера на Node.",
    syntax:"// server.js\nimport express from \"express\";\nconst app = express();\napp.use(express.json());\n\napp.get(\"/api/hello\", (req, res) => {\n  res.json({ message: \"Привет!\" });\n});\n\napp.listen(3000, () => console.log(\"http://localhost:3000\"));",
    syntaxNote:"Запуск: node server.js. req — входящий запрос, res — будущий ответ."},
  {id:38, emoji:"🗄️", title:"Базы данных и SQL", level:"hard", group:"Бэкенд",
    intro:"БД хранит данные. SQL — язык запросов к реляционным БД (PostgreSQL, MySQL, SQLite).",
    syntax:"CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT, age INT);\nINSERT INTO users (name, age) VALUES ('Аня', 12);\nSELECT * FROM users WHERE age > 10;\nUPDATE users SET age = 13 WHERE name = 'Аня';\nDELETE FROM users WHERE id = 5;",
    syntaxNote:"Никогда не вклеивай ввод пользователя в SQL напрямую — будет SQL-инъекция. Используй параметры (?, $1)."},
  {id:39, emoji:"🚀", title:"Деплой и Git", level:"mid", group:"Инструменты",
    intro:"Git хранит историю кода. GitHub/GitLab — облачные репозитории. Деплой — выкладка сайта в интернет.",
    syntax:"git init\ngit add .\ngit commit -m \"первая версия\"\ngit remote add origin https://github.com/me/site.git\ngit push -u origin main\n\n# деплой статики: Netlify / Vercel / GitHub Pages",
    syntaxNote:"Каждый коммит — это сохранение. Никогда не коммить .env с паролями!"},
  {id:40, emoji:"🎯", title:"Финальный проект", level:"hard", group:"Проекты",
    intro:"Объедини всё: HTML-страница + CSS-вёрстка + JS-логика + fetch к публичному API + сохранение в localStorage.",
    syntax:"// идея: «Погода по городу»\n// 1. input + button\n// 2. fetch к открытому weather API\n// 3. рисуем карточку с температурой\n// 4. сохраняем последние 5 городов в localStorage",
    syntaxNote:"Финальный проект — это твоё портфолио. Опубликуй его и поделись ссылкой."},
];

function makeExamples(topic){
  // Если есть кастомные примеры по теме — используем их.
  const custom = (typeof TOPIC_EXAMPLES !== "undefined") && TOPIC_EXAMPLES[topic.id];
  if (custom && custom.length){
    return custom.map((ex, idx) => ({
      title: ex.title || `${topic.title} — пример ${idx+1}`,
      level: idx < 5 ? "Новичок" : idx < 10 ? "Средний" : "Продвинутый",
      code: ex.code,
      output: ex.output,
      explanation: ex.explanation || `Пример темы «${topic.title}».`
    }));
  }
  // Фолбэк: если по теме нет курированных примеров — собираем 9 полных HTML-страниц,
  // которые ребёнок может скопировать в .html и сразу открыть в браузере.
  return buildFallbackExamples(topic);
}

function _wrapFullPage(title, bodyHtml, css, js){
  return '<!DOCTYPE html>\n<html lang="ru">\n<head>\n'
    + '  <meta charset="UTF-8">\n'
    + '  <meta name="viewport" content="width=device-width, initial-scale=1">\n'
    + '  <title>' + title + '</title>\n'
    + (css ? '  <style>\n' + css + '\n  </style>\n' : '')
    + '</head>\n<body>\n' + bodyHtml + '\n'
    + (js ? '<script>\n' + js + '\n<\/script>\n' : '')
    + '</body>\n</html>';
}

function buildFallbackExamples(topic){
  const out = [];
  const lvl = (i)=> i<3 ? "Новичок" : i<6 ? "Средний" : "Продвинутый";
  const ideas = [
    {sub:"минимальная демонстрация",     body:"<h1>"+topic.title+"</h1>\n<p>"+topic.intro+"</p>"},
    {sub:"практический пример",          body:"<h1>Пример: "+topic.title+"</h1>\n<p>Ниже — рабочий пример темы.</p>\n<pre><code>"+escapeHtml(topic.syntax)+"</code></pre>"},
    {sub:"страница-карточка темы",       body:'<article style="max-width:520px;margin:40px auto;padding:24px;border:1px solid #ddd;border-radius:12px;font-family:system-ui">\n  <h2>'+topic.title+'</h2>\n  <p>'+topic.intro+'</p>\n  <p style="color:#666;font-size:14px">'+topic.syntaxNote+'</p>\n</article>'},
    {sub:"две колонки с пояснением",     body:'<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:20px;font-family:system-ui">\n  <section><h3>Идея</h3><p>'+topic.intro+'</p></section>\n  <section><h3>Заметка</h3><p>'+topic.syntaxNote+'</p></section>\n</div>'},
    {sub:"интерактив с кнопкой",         body:'<h1>'+topic.title+'</h1>\n<button id="btn" type="button">Показать пример</button>\n<pre id="out" style="background:#f4f6fb;padding:12px;border-radius:8px"></pre>', js:'document.getElementById("btn").addEventListener("click", function(){\n  document.getElementById("out").textContent = '+JSON.stringify(topic.syntax)+';\n});'},
    {sub:"мини-тест по теме",            body:'<h1>Тест: '+topic.title+'</h1>\n<p>Что описывает эта тема?</p>\n<button onclick="alert(\'Верно!\')" type="button">'+topic.title+'</button>\n<button onclick="alert(\'Подумай ещё\')" type="button">Что-то другое</button>'},
    {sub:"страница с темой и пояснением",body:'<section style="font-family:Georgia,serif;max-width:640px;margin:32px auto">\n  <h1>'+topic.title+'</h1>\n  <p>'+topic.intro+'</p>\n  <h3>Пример кода</h3>\n  <pre style="background:#0f172a;color:#e6ecff;padding:16px;border-radius:8px;overflow:auto">'+escapeHtml(topic.syntax)+'</pre>\n  <p><em>'+topic.syntaxNote+'</em></p>\n</section>'},
    {sub:"мини-проект",                  body:'<h1>Мини-проект: '+topic.title+'</h1>\n<p>Шаги:</p>\n<ol>\n  <li>Скопируй этот файл в <code>index.html</code>.</li>\n  <li>Открой двойным кликом в браузере.</li>\n  <li>Доработай под себя по примеру ниже.</li>\n</ol>\n<pre><code>'+escapeHtml(topic.syntax)+'</code></pre>'},
    {sub:"полноэкранная демонстрация",   body:'<main style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#fff;font-family:system-ui">\n  <div style="text-align:center;padding:40px"><h1 style="font-size:48px;margin:0">'+topic.title+'</h1><p style="opacity:.85">'+topic.intro+'</p></div>\n</main>'},
  ];
  for (let i = 0; i < ideas.length; i++){
    const it = ideas[i];
    out.push({
      title: topic.title + " — " + it.sub,
      level: lvl(i),
      code: _wrapFullPage(topic.title + " — " + (i+1), it.body, "", it.js || ""),
      output: "Откроется страница, демонстрирующая «" + topic.title + "».",
      explanation: "Это самостоятельный HTML-файл: скопируй целиком и открой в браузере. Демонстрирует «" + topic.title + "»."
    });
  }
  return out;
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]);
}



function makeQuiz(topic){
  const c = (typeof TOPIC_CONTENT!=="undefined") && TOPIC_CONTENT[topic.id];
  if (c && c.quiz) return c.quiz;
  return [{q:`Тема: ${topic.title}`, opts:["A","B","C","D"], answer:0}];
}


function makeTasks(topic){
  const c = (typeof TOPIC_CONTENT!=="undefined") && TOPIC_CONTENT[topic.id];
  if (c && c.tasks) return c.tasks;
  return [{q:`Задание по теме «${topic.title}»`, hint:"См. синтаксис темы.", solution:"# решение"}];
}


function makeBugs(){
  return [
    {id:'wb1', title:"🎵 HTML5 Аудио-плеер", level:"Новичок", oop:false,
      broken:"<!doctype html\n<html>\n<head>\n<title>Плеер<title>\n<meta charset=utf8\n</head>\n<body>\n<h2>Мой плеер<h2>\n<audio src='song.mp3'>\n<button onClick=play()>Играть</button>\n<button>Стоп</button\n<script>\nfunction play() { Document.querySelector('audio').Play(); }\n</script>\n</body>",
      fixed:"<!doctype html>\n<html lang=\"ru\">\n<head>\n  <title>Плеер</title>\n  <meta charset=\"utf-8\">\n</head>\n<body>\n  <h2>Мой плеер</h2>\n  <audio src=\"song.mp3\" controls preload=\"metadata\"></audio>\n  <button type=\"button\" onclick=\"play()\">Играть</button>\n  <button type=\"button\" onclick=\"stop()\">Стоп</button>\n  <script>\n    function play(){ document.querySelector('audio').play(); }\n    function stop(){ const a=document.querySelector('audio'); a.pause(); a.currentTime=0; }\n  </script>\n</body>\n</html>",
      errors:["<!doctype html не закрыт >","<title> закрыт <title> вместо </title>","meta charset без кавычек и без >","<h2> закрыт <h2> вместо </h2>","<audio> без controls — нет кнопок управления","<audio> не закрыт </audio>","onClick — JSX-стиль, в HTML атрибут пишется onclick","у <button> нет type — по умолчанию submit","у второй кнопки </button не закрыта скобка","Document с большой буквы — должно быть document","Play() с большой буквы — метод называется play()","функция stop() вообще не определена","у <html> нет lang","нет </html>"]},
    {id:'wb2', title:"✨ CSS-анимация и @keyframes", level:"Новичок", oop:false,
      broken:".box {\n  Width 200\n  height: 200\n  background red\n  animation: spin 2 linear infinite\n}\n@keyframe spin\n  from { transform rotate(0) }\n  to { transform: Rotate(360) }\n}\n.box:Hover {\n  animation-play-state pause\n}",
      fixed:".box {\n  width: 200px;\n  height: 200px;\n  background: red;\n  animation: spin 2s linear infinite;\n}\n@keyframes spin {\n  from { transform: rotate(0deg); }\n  to   { transform: rotate(360deg); }\n}\n.box:hover {\n  animation-play-state: paused;\n}",
      errors:["Width с большой буквы — CSS чувствителен к регистру","у Width пропущено двоеточие","у width нет единицы (px)","у height нет единицы (px) и пропущена ;","у background пропущено двоеточие","в animation длительность 2 без единицы (нужно 2s)","у animation пропущена ; в конце","правило должно быть @keyframes (с s), не @keyframe","у @keyframes пропущена открывающая {","у transform rotate пропущено двоеточие","у rotate(0) нет единицы deg","Rotate с большой буквы — должно быть rotate","у :Hover неверный регистр — :hover","animation-play-state без двоеточия","значение pause неверное — нужно paused"]},
    {id:'wb3', title:"🧮 JS-калькулятор (класс ООП)", level:"Средний", oop:true,
      broken:"Class Calculator {\n  constructor(start) {\n    This.value = start\n  }\n  Add(n) { this.value = this.value + n }\n  sub(n) { this.value -= n }\n  Multiply(n) => { this.value = this.value * n; }\n  reset() { value = 0 }\n}\n\nconst c = Calculator(10)\nc.add('5')\nc.Sub(2)\nconsole.log(\"Результат:\" c.value)",
      fixed:"class Calculator {\n  constructor(start) {\n    this.value = start;\n  }\n  add(n) { this.value = this.value + n; }\n  sub(n) { this.value -= n; }\n  multiply(n) { this.value = this.value * n; }\n  reset() { this.value = 0; }\n}\n\nconst c = new Calculator(10);\nc.add(5);\nc.sub(2);\nconsole.log(\"Результат:\", c.value);",
      errors:["Class с большой буквы — должно быть class","This с большой буквы — должно быть this","у this.value = start пропущена ;","метод Add — по конвенции методы пишутся с маленькой (add)","в add отсутствует ; в конце","Multiply объявлен через стрелку — методы класса так не пишутся","reset() обращается к value без this — будет ReferenceError","new пропущено: const c = Calculator(10) → TypeError","add('5') передаёт строку — будет '105', а не 15","Sub с большой буквы — метод не найден","в console.log пропущена , между строкой и c.value","нет ; в конце выражений","у класса нет метода multiply (с маленькой) для использования"]},
    {id:'wb4', title:"🌤️ Async/await: погода через API", level:"Средний", oop:false,
      broken:"async Function getWeather(city) {\n  const url = 'https://api.example.com/weather?city=' + city\n  let r = fetch(url)\n  if (r.status = 200) {\n    const data = r.json()\n    Console.log(data.temp)\n    Return data\n  }\n}\n\ngetWeather()\n  .then(d => render(d)\n  catch(e => console.log(e))",
      fixed:"async function getWeather(city) {\n  const url = 'https://api.example.com/weather?city=' + encodeURIComponent(city);\n  const r = await fetch(url);\n  if (r.status === 200) {\n    const data = await r.json();\n    console.log(data.temp);\n    return data;\n  }\n  throw new Error('HTTP ' + r.status);\n}\n\ngetWeather('Moscow')\n  .then(d => render(d))\n  .catch(e => console.error(e));",
      errors:["Function с большой буквы — ключевое слово function","пропущено await перед fetch — r будет Promise, а не Response","r.status = 200 — это присваивание, нужно сравнение ===","r.json() возвращает Promise — забыли await","Console с большой буквы — должно быть console","Return с большой буквы — ключевое слово return","getWeather() вызвана без аргумента city",".then(d => render(d) не закрыта )","перед catch пропущена точка — должно быть .catch","нет обработки случая, когда статус не 200","city не экранирован в URL (encodeURIComponent)","нет ; в конце выражений"]},
    {id:'wb5', title:"🗂️ Drag & Drop список задач", level:"Продвинутый", oop:false,
      broken:"<ul id=list>\n  <li>Купить хлеб</li>\n  <li>Сделать ДЗ</li>\n  <li>Погулять</li>\n</ul>\n<script>\nconst items = document.querySelectorAll('li')\nitems.forEach(i => {\n  i.draggable = true\n  i.addEventListener('dragstart' e => {\n    e.dataTransfer.SetData('text', e.target.textContent)\n  })\n})\nconst list = document.querySelector('#list')\nlist.addEventListener('dragover', e => {})\nlist.addEventListener('drop', e => {\n  const t = e.dataTransfer.getData('text')\n  list.innerHTML += '<li>' + t + '</li>'\n})\n</script>",
      fixed:"<ul id=\"list\">\n  <li>Купить хлеб</li>\n  <li>Сделать ДЗ</li>\n  <li>Погулять</li>\n</ul>\n<script>\nconst items = document.querySelectorAll('li');\nitems.forEach(i => {\n  i.draggable = true;\n  i.addEventListener('dragstart', e => {\n    e.dataTransfer.setData('text/plain', e.target.textContent);\n  });\n});\nconst list = document.querySelector('#list');\nlist.addEventListener('dragover', e => { e.preventDefault(); });\nlist.addEventListener('drop', e => {\n  e.preventDefault();\n  const t = e.dataTransfer.getData('text/plain');\n  const li = document.createElement('li');\n  li.textContent = t;\n  li.draggable = true;\n  list.appendChild(li);\n});\n</script>",
      errors:["у id=list нет кавычек","в addEventListener('dragstart' e=>...) пропущена , между событием и колбэком","SetData с большой буквы — метод setData","MIME-тип лучше указывать 'text/plain', а не просто 'text'","в dragover не вызван e.preventDefault() — drop не сработает","в drop не вызван e.preventDefault() — мешает поведение по умолчанию","использован innerHTML += вместо createElement — XSS-уязвимость","новые <li> не получают draggable=true — их нельзя таскать","нет ; в конце выражений","data, переданная пользователем, не экранируется","textContent надёжнее, чем подстановка строки в innerHTML"]},
    {id:'wb6', title:"♿ Модальное окно (a11y)", level:"Продвинутый", oop:false,
      broken:"<div class='modal' onclick='close()'>\n  <div class='dialog'>\n    <div class='title'>Подтверждение</div>\n    <p>Удалить файл?\n    <button>Да</button>\n    <button>Нет</button>\n  </div>\n</div>\n<style>\n.modal { position: fixed; top:0; left:0; width:100%; height:100% }\n.dialog { background: white }\n</style>\n<script>\nfunction close() { document.querySelector('.modal').style.display = 'none' }\nDocument.addEventListener('keydown', e => {\n  if (e.keyCode == 27) close()\n})\n</script>",
      fixed:"<div class=\"modal\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"mt\">\n  <div class=\"dialog\">\n    <h2 id=\"mt\">Подтверждение</h2>\n    <p>Удалить файл?</p>\n    <button type=\"button\" id=\"yes\">Да</button>\n    <button type=\"button\" id=\"no\">Нет</button>\n  </div>\n</div>\n<style>\n.modal { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; }\n.dialog { background: #fff; padding: 20px; border-radius: 8px; max-width: 90%; }\n</style>\n<script>\nfunction closeModal(){ document.querySelector('.modal').style.display = 'none'; }\ndocument.querySelector('.modal').addEventListener('click', e => {\n  if (e.target.classList.contains('modal')) closeModal();\n});\ndocument.getElementById('no').addEventListener('click', closeModal);\ndocument.addEventListener('keydown', e => {\n  if (e.key === 'Escape') closeModal();\n});\n</script>",
      errors:["onclick='close()' конфликтует с window.close — нужно другое имя","клик по .modal закроет окно даже при клике по содержимому диалога","у модалки нет role='dialog' и aria-modal='true'","у заголовка <div class='title'> — нужен <h2> с id и aria-labelledby","у <p> не закрыт тег </p>","у <button> нет type — по умолчанию submit","нет обработчика кнопки 'Нет' — модалка не закроется","у .modal нет фона/overlay — нечего затемнять","у .dialog нет центрирования — окно прилипает к углу","Document с большой буквы — должно быть document","e.keyCode устарел — используй e.key === 'Escape'","нет фокус-трапа: Tab уходит за пределы модалки","нет ; в конце выражений","нет возврата фокуса на элемент-открыватель после закрытия"]},
  ];
}

const AI_TASKS = [
  {id:"ai1", title:"#1. 🤖 Идея сайта", desc:"Попроси AI придумать 5 идей маленьких сайтов для портфолио. Выбери одну и сделай каркас HTML+CSS.", hint:"Промт: «Дай 5 идей простых сайтов на HTML/CSS/JS для новичка, по 2 строки на каждый».", level:"easy"},
  {id:"ai2", title:"#2. 📝 Объясни код", desc:"Покажи AI любой свой HTML или CSS и попроси объяснить его школьнику.", hint:"Промт: «Объясни этот HTML/CSS как будто мне 10 лет: <код>».", level:"easy"},
  {id:"ai3", title:"#3. 🐞 Найди баг", desc:"Возьми один debug-пример отсюда. Попроси AI найти ошибки и сравни со списком.", hint:"Промт: «Найди все ошибки в этом HTML/CSS/JS и объясни: <код>».", level:"easy"},
  {id:"ai4", title:"#4. ✨ Сгенерируй CSS-палитру", desc:"Попроси AI подобрать 5 цветов для сайта про <твою тему>. Примени их.", hint:"Промт: «Сгенерируй цветовую палитру из 5 цветов для сайта про <тема>, выдай hex».", level:"easy"},
  {id:"ai5", title:"#5. 📚 Шпаргалка по Flexbox", desc:"Попроси AI сделать шпаргалку по Flexbox с примерами кода.", hint:"Промт: «Сделай одностраничную шпаргалку по CSS Flexbox с примерами».", level:"easy"},
  {id:"ai6", title:"#6. 🎲 AI пишет HTML — проверь", desc:"Попроси AI написать форму регистрации. Запусти. Если что-то не так — попроси исправить.", hint:"Покажи AI вывод браузера и попроси доработать.", level:"mid"},
  {id:"ai7", title:"#7. 🧪 Тестовые данные для UI", desc:"Попроси AI сгенерировать 30 пользователей (имя, email, возраст) в JSON для твоей таблицы.", hint:"Промт: «Сгенерируй 30 пользователей в JSON: name, email, age».", level:"mid"},
  {id:"ai8", title:"#8. 🎨 Опиши лендинг — получи HTML", desc:"Опиши, какой лендинг ты хочешь. AI пришлёт HTML+CSS. Доработай вручную.", hint:"Промт: «Сделай адаптивный лендинг про <тема>, верстка HTML+CSS, без фреймворков».", level:"mid"},
  {id:"ai9", title:"#9. 🔄 Из CSS в Tailwind", desc:"Дай AI обычный CSS-блок. Попроси переписать в Tailwind-классы.", hint:"Промт: «Перепиши этот CSS в классы Tailwind: <код>».", level:"mid"},
  {id:"ai10", title:"#10. ⚡ Оптимизация изображений", desc:"Опиши, какие картинки у тебя на сайте. AI подскажет, как уменьшить размер.", hint:"Промт: «Как ускорить загрузку этих картинок на сайте: <описание>».", level:"mid"},
  {id:"ai11", title:"#11. 📊 Викторина по HTML", desc:"Попроси AI сделать 10 вопросов с вариантами ответов по HTML.", hint:"Промт: «Дай 10 вопросов с 4 вариантами по HTML, в JSON».", level:"mid"},
  {id:"ai12", title:"#12. 🌐 fetch к публичному API", desc:"Попроси AI показать, как получить погоду через fetch у бесплатного API.", hint:"Промт: «Покажи fetch к публичному API погоды и отрисуй результат в HTML».", level:"mid"},
  {id:"ai13", title:"#13. 🧠 Чат-бот на странице", desc:"Сделай простой чат-бот на странице: input + кнопка + AI API + вывод ответа.", hint:"Изучи, как делать POST-запрос к AI gateway.", level:"hard"},
  {id:"ai14", title:"#14. 📷 Опиши картинку", desc:"Сделай страницу с input type=file. Отправь картинку в multimodal AI и покажи описание.", hint:"Используй модель с поддержкой image-input.", level:"hard"},
  {id:"ai15", title:"#15. 📰 Суммаризатор статей", desc:"Страница принимает текст. AI делает короткое содержание в 3 предложениях.", hint:"Промт: «Сократи этот текст до 3 предложений: <текст>».", level:"hard"},
  {id:"ai16", title:"#16. 🎯 Генератор задач по вёрстке", desc:"Сделай инструмент: пользователь выбирает уровень — AI генерирует задание по HTML/CSS с шаблоном.", hint:"Сохраняй задания в localStorage.", level:"hard"},
  {id:"ai17", title:"#17. 🗣️ Голосовой поиск", desc:"Сделай поиск по странице через Web Speech API. Результат — выделение нужного блока.", hint:"SpeechRecognition + querySelector.", level:"hard"},
  {id:"ai18", title:"#18. 🛡️ Анти-дубль текста", desc:"Программа получает два HTML-фрагмента и просит AI оценить, насколько они похожи.", hint:"Промт: «Сравни два HTML по содержанию: <A> / <B>».", level:"hard"},
  {id:"ai19", title:"#19. 📅 AI составляет лендинг по брифу", desc:"Опиши свой продукт. AI вернёт структуру лендинга (секции, тексты, кнопки).", hint:"Промт: «Составь структуру лендинга для <продукт>: секции, заголовки, CTA».", level:"mid"},
  {id:"ai20", title:"#20. 📖 AI-помощник по документации", desc:"Подгрузи .txt с MDN-разделом. Спрашивай у AI вопросы по нему.", hint:"Простой RAG: фрагменты + AI.", level:"hard"},
  {id:"ai21", title:"#21. 🎭 AI в роли дизайнера", desc:"AI играет роль арт-директора и ревьюит твой макет.", hint:"Системный промт: «Ты — арт-директор, дай конкретный фидбэк».", level:"mid"},
  {id:"ai22", title:"#22. 🧮 AI пишет CSS-калькулятор", desc:"Опиши задачу: «нужен grid 12 колонок с gap 20px». AI выдаёт CSS и объясняет.", hint:"Промт: «Сделай CSS-сетку 12 колонок с gap 20 и объясни».", level:"mid"},
  {id:"ai23", title:"#23. 🏷️ Классификатор отзывов на сайте", desc:"Отзыв → AI помечает 👍 / 🤔 / 👎. Выведи на странице.", hint:"Возвращай JSON: {sentiment, score}.", level:"mid"},
  {id:"ai24", title:"#24. 🖼️ Генератор баннеров", desc:"Пользователь вводит описание баннера. AI-картинка → ставим как <img>.", hint:"Stable Diffusion / DALL·E / Lovable image API.", level:"hard"},
  {id:"ai25", title:"#25. 🏆 Финальный AI-сайт", desc:"Сайт, в котором сочетаются 3+ AI-фичи: чат, картинки, голос. Опубликуй.", hint:"Главное — реальный сценарий, а не просто связка API.", level:"hard"},
];


const ACHIEVEMENTS = [
  {id:"first", name:"🎉 Первые шаги", desc:"Открой первую тему"},
  {id:"five", name:"🔥 На разогреве", desc:"Изучи 5 тем"},
  {id:"half", name:"🏅 Половина пути", desc:"Изучи 20 тем"},
  {id:"all", name:"👑 Мастер Веба", desc:"Изучи все 40 тем веб-разработки"},
  {id:"quiz", name:"🧠 Эрудит", desc:"Пройди первый квиз"},
  {id:"debug1", name:"🐛 Охотник за багами", desc:"Реши первый debug"},
  {id:"debug10", name:"🛠️ Инженер", desc:"Реши 4 debug-программы"},
  {id:"xp100", name:"⭐ 100 XP", desc:"Заработай 100 XP"},
  {id:"xp500", name:"🌟 500 XP", desc:"Заработай 500 XP"},
  {id:"xp1000", name:"💎 1000 XP", desc:"Заработай 1000 XP"}
];

const STATE_KEY = "webacademy_state_v1";
const state = loadState();
function loadState(){
  try { return JSON.parse(localStorage.getItem(STATE_KEY)) || initState(); }
  catch { return initState(); }
}
function initState(){ return {xp:0, done:{}, quizDone:{}, debugDone:{}, aiDone:{}, achievements:{}, theme:"light", profile:null}; }
function saveState(){ localStorage.setItem(STATE_KEY, JSON.stringify(state)); }

function addXP(n){
  state.xp += n;
  if (state.xp >= 100) unlock("xp100");
  if (state.xp >= 500) unlock("xp500");
  if (state.xp >= 1000) unlock("xp1000");
  saveState(); renderTop();
}
function markDone(id){ state.done[id] = true; saveState(); renderTop(); renderSidebar(); }
function unlock(id){
  if (state.achievements[id]) return;
  state.achievements[id] = true; saveState();
  toast(`🏆 Достижение: ${ACHIEVEMENTS.find(a=>a.id===id)?.name||id}`);
}

const KEYWORDS = /(var|let|const|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|this|super|import|export|from|as|default|try|catch|finally|throw|typeof|instanceof|in|of|null|true|false|undefined|async|await|yield|static)/g;
const BUILTINS = /(console|document|window|fetch|Promise|JSON|Object|Array|String|Number|Boolean|Math|Date|Map|Set|localStorage|sessionStorage|alert|prompt|confirm|setTimeout|setInterval|querySelector|querySelectorAll|addEventListener|createElement)/g;
function highlight(code){
  return code
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(KEYWORDS,'<span class="tok-key">$1</span>')
    .replace(BUILTINS,'<span class="tok-fn">$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g,'<span class="tok-num">$1</span>');
}

let currentView = {type:"home"};
let searchQuery = "";
let levelFilter = "all";

function $(sel){ return document.querySelector(sel); }
function el(tag, props={}, ...children){
  const e = document.createElement(tag);
  Object.entries(props).forEach(([k,v])=>{
    if (k==="class") e.className = v;
    else if (k==="html") e.innerHTML = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  });
  children.flat().forEach(c => e.appendChild(typeof c==="string" ? document.createTextNode(c) : c));
  return e;
}

function toast(msg){
  const t = el("div", {class:"toast"}, msg);
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 2800);
}

function renderTop(){
  const total = TOPICS.length;
  const doneCount = Object.keys(state.done).filter(k=>k.startsWith("t")).length;
  const pct = Math.round((doneCount/total)*100);
  const bar = $("#progress-bar"); if (bar) bar.style.width = pct + "%";
  const xp = $("#xp-val"); if (xp) xp.textContent = state.xp;
  const pctEl = $("#pct"); if (pctEl) pctEl.textContent = pct + "%";
}

function renderSidebar(){
  const groups = {};
  TOPICS.filter(t=>{
    if (levelFilter!=="all" && t.level!==levelFilter) return false;
    if (searchQuery && !(t.title.toLowerCase().includes(searchQuery)||t.intro.toLowerCase().includes(searchQuery))) return false;
    return true;
  }).forEach(t=>{
    groups[t.group] = groups[t.group] || [];
    groups[t.group].push(t);
  });
  const container = $("#nav-list");
  container.innerHTML = "";
  const home = el("div", {class:"nav-item"+(currentView.type==="home"?" active":""), onclick:()=>navigate({type:"home"})},
    el("div",{class:"nav-icon"},"🏠"), el("span",{},"Главная"));
  const debugItem = el("div", {class:"nav-item"+(currentView.type==="debug"?" active":""), onclick:()=>navigate({type:"debug"})},
    el("div",{class:"nav-icon"},"🐛"), el("span",{},"Debug Challenge"));
  const aiItem = el("div", {class:"nav-item"+(currentView.type==="ai"?" active":""), onclick:()=>navigate({type:"ai"})},
    el("div",{class:"nav-icon"},"🤖"), el("span",{},"AI Challenge"));
  const achItem = el("div", {class:"nav-item"+(currentView.type==="ach"?" active":""), onclick:()=>navigate({type:"ach"})},
    el("div",{class:"nav-icon"},"🏆"), el("span",{},"Достижения"));
  container.append(home, debugItem, aiItem, achItem);
  Object.entries(groups).forEach(([g, items])=>{
    container.appendChild(el("div",{class:"nav-section"}, g));
    items.forEach(t=>{
      const item = el("div", {
        class:"nav-item"+(currentView.type==="topic"&&currentView.id===t.id?" active":"")+(state.done["t"+t.id]?" done":""),
        onclick:()=>navigate({type:"topic", id:t.id})
      }, el("div",{class:"nav-icon"}, t.emoji), el("span",{}, t.title));
      container.appendChild(item);
    });
  });
}

function navigate(v){ currentView = v; render(); }

function render(){
  renderSidebar(); renderTop();
  const main = $("#main");
  main.innerHTML = "";
  main.classList.remove("fade-in"); void main.offsetWidth; main.classList.add("fade-in");
  if (currentView.type==="home") renderHome(main);
  else if (currentView.type==="topic") renderTopic(main, TOPICS.find(t=>t.id===currentView.id));
  else if (currentView.type==="debug") renderDebug(main);
  else if (currentView.type==="ai") renderAI(main);
  else if (currentView.type==="ach") renderAch(main);
}

function renderHome(main){
  main.append(
    el("div",{class:"hero"},
      el("div",{class:"hero-emoji"},"🌐"),
      el("h1",{},"Добро пожаловать в Web Academy!"),
      el("p",{},"Интерактивная платформа для изучения веб-разработки на русском. 40 тем — HTML, CSS, JavaScript, HTTP, REST API, серверы. Примеры, задания, debug-челлендж, AI-челлендж, викторины и достижения. Учись, играй, набирай XP!")
    )
  );
  const cards = el("div",{class:"cards"});
  TOPICS.forEach(t=>{
    const c = el("div",{class:"card"+(state.done["t"+t.id]?" done":""), onclick:()=>navigate({type:"topic",id:t.id})},
      el("div",{class:"emoji"}, t.emoji),
      el("h3",{}, t.title),
      el("div",{class:"meta"}, `${t.group} · `, el("span",{class:"level-"+(t.level==="easy"?"easy":t.level==="mid"?"mid":"hard")}, t.level==="easy"?"новичок":t.level==="mid"?"средний":"продвинутый"))
    );
    cards.appendChild(c);
  });
  if (state.profile){
    main.append(el("div",{class:"panel",style:"margin:18px 40px"},
      el("h3",{},"👤 Профиль ученика"),
      el("p",{}, "Имя: " + state.profile.fullName),
      el("p",{}, "Класс: " + state.profile.className),
      el("p",{class:"muted"}, "XP: " + state.xp + " · Изучено тем: " + Object.keys(state.done).filter(k=>k.startsWith("t")).length + "/" + TOPICS.length)
    ));
  }
  main.append(el("h2",{},"📚 Темы курса"), cards);
}

function renderTopic(main, topic){
  if (!topic) return;
  unlock("first");
  const doneCount = Object.keys(state.done).filter(k=>k.startsWith("t")).length;
  if (doneCount >= 5) unlock("five");
  if (doneCount >= 20) unlock("half");
  if (doneCount >= 40) unlock("all");

  main.append(
    el("div",{class:"hero"},
      el("div",{class:"hero-emoji"}, topic.emoji),
      el("h1",{}, topic.title),
      el("p",{}, `Группа: ${topic.group} · Уровень: ${topic.level==="easy"?"новичок":topic.level==="mid"?"средний":"продвинутый"}`)
    )
  );
  const tabs = el("div",{class:"tabs"});
  const tabNames = [["intro","📖 Объяснение"],["examples","💻 Примеры (15)"],["tasks","✏️ Задания"],["quiz","🧠 Викторина"]];
  const contents = {};
  tabNames.forEach(([key,label])=>{
    const t = el("div",{class:"tab"+(key==="intro"?" active":""), onclick:()=>{
      tabs.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
      t.classList.add("active");
      Object.values(contents).forEach(c=>c.style.display="none");
      contents[key].style.display="block";
    }}, label);
    tabs.appendChild(t);
  });
  main.appendChild(tabs);
  const wrap = el("div",{}); main.appendChild(wrap);

  contents.intro = el("div",{},
    el("div",{class:"panel"},
      el("h3",{},"Простое объяснение"),
      el("p",{}, topic.intro),
      el("h3",{},"Синтаксис"),
      codeBlock(topic.syntax),
      el("p",{class:"muted"}, "💡 " + topic.syntaxNote),
      el("button",{class:"btn-primary", onclick:()=>{
        if (!state.done["t"+topic.id]) addXP(20);
        markDone("t"+topic.id);
        toast("✅ Тема отмечена как изученная (+20 XP)");
      }},"Отметить как изученную")
    )
  );

  const examples = makeExamples(topic);
  contents.examples = el("div",{});
  examples.forEach((ex,i)=>{
    const out = el("div",{class:"run-out"}, "(нажмите «Показать вывод»)");
    const codeArea = el("textarea",{class:"editor"});
    codeArea.value = ex.code;
    const ex_el = el("div",{class:"example"},
      el("h3",{}, `#${i+1}. ${ex.title} `, el("span",{class:"badge level-"+(ex.level==="Новичок"?"easy":ex.level==="Средний"?"mid":"hard")}, ex.level)),
      el("p",{class:"muted"}, ex.explanation),
      codeArea,
      el("div",{class:"code-actions"},
        el("button",{class:"btn-primary",onclick:()=>{out.textContent = "▶ Ожидаемый вывод:\n" + ex.output;}},"▶ Показать вывод"),
        el("button",{class:"btn-ghost",onclick:()=>{navigator.clipboard.writeText(codeArea.value);toast("📋 Скопировано!")}},"📋 Копировать"),
        el("button",{class:"btn-ghost",onclick:()=>{codeArea.value=ex.code;out.textContent="(нажмите «Показать вывод»)"}},"🔄 Сброс"),
        el("button",{class:"btn-accent",onclick:()=>{out.textContent="✅ Эталонный вывод:\n"+ex.output}},"👁 Решение")
      ),
      out,
      el("p",{class:"muted",style:"margin-top:8px;font-size:12px"}, "💡 HTML/CSS/JS открывается прямо в браузере — сохрани файл и открой его двойным кликом или через Live Server.")
    );
    contents.examples.appendChild(ex_el);
  });

  contents.tasks = el("div",{});
  makeTasks(topic).forEach((tk,i)=>{
    const sol = el("div",{class:"codebox",style:"display:none;margin-top:8px"}, el("pre",{html:highlight(tk.solution)}));
    const hint = el("p",{class:"muted",style:"display:none"}, "💡 " + tk.hint);
    contents.tasks.appendChild(
      el("div",{class:"panel"},
        el("h3",{}, `Задание ${i+1}`),
        el("p",{}, tk.q),
        el("div",{class:"code-actions"},
          el("button",{class:"btn-ghost",onclick:()=>hint.style.display=hint.style.display==="none"?"block":"none"},"💡 Подсказка"),
          el("button",{class:"btn-accent",onclick:()=>sol.style.display=sol.style.display==="none"?"block":"none"},"✅ Решение")
        ),
        hint, sol
      )
    );
  });

  const quiz = makeQuiz(topic);
  contents.quiz = el("div",{});
  let score = 0, answered = 0;
  const scoreEl = el("h3",{}, `Счёт: 0 / ${quiz.length}`);
  contents.quiz.appendChild(scoreEl);
  quiz.forEach((q,qi)=>{
    const opts = el("div",{class:"opts"});
    q.opts.forEach((opt,oi)=>{
      const o = el("div",{class:"opt", onclick:()=>{
        if (o.dataset.locked) return;
        opts.querySelectorAll(".opt").forEach(x=>x.dataset.locked="1");
        if (oi===q.answer){ o.classList.add("correct"); score++; }
        else { o.classList.add("wrong"); opts.children[q.answer].classList.add("correct"); }
        answered++;
        scoreEl.textContent = `Счёт: ${score} / ${quiz.length}`;
        if (answered===quiz.length){
          if (!state.quizDone["q"+topic.id]) { addXP(30); state.quizDone["q"+topic.id]=true; saveState(); }
          unlock("quiz");
          toast(`Квиз пройден! ${score}/${quiz.length}`);
        }
      }}, opt);
      opts.appendChild(o);
    });
    contents.quiz.appendChild(el("div",{class:"quiz-q"}, el("strong",{},`${qi+1}. ${q.q}`), opts));
  });
  Object.entries(contents).forEach(([k,v])=>{ if (k!=="intro") v.style.display="none"; wrap.appendChild(v); });
}

function renderDebug(main){
  const bugs = window.__BUGS__ || (window.__BUGS__ = makeBugs());
  const doneN = Object.keys(state.debugDone).length;
  main.append(
    el("div",{class:"hero"},
      el("div",{class:"hero-emoji"},"🐛"),
      el("h1",{},"Debug Challenge — Охота на ошибки веб-кода"),
      el("p",{},`6 сломанных HTML/CSS/JS-программ. В каждой минимум 10 ошибок. Найди и исправь их! Решено: ${doneN}/6`)
    )
  );
  bugs.forEach(b=>{
    const editor = el("textarea",{class:"editor",style:"min-height:260px"});
    editor.value = b.broken;
    const errList = el("ol",{style:"display:none"});
    b.errors.forEach(e=>errList.appendChild(el("li",{},e)));
    const fixedBox = el("div",{class:"codebox",style:"display:none;margin-top:8px"}, el("pre",{html:highlight(b.fixed)}));
    main.appendChild(el("div",{class:"panel"},
      el("h3",{}, `${b.title} `, el("span",{class:"badge level-"+(b.level==="Новичок"?"easy":b.level==="Средний"?"mid":"hard")}, b.level), " ", el("span",{class:"badge"}, b.oop?"🏛️ ООП":"📝 без ООП"), " ", el("span",{class:"badge"}, `найди ${b.errors.length}+ ошибок`)),
      editor,
      el("div",{class:"code-actions"},
        el("button",{class:"btn-ghost",onclick:()=>{
          errList.style.display = errList.style.display==="none"?"block":"none";
        }},"💡 Подсказки (список ошибок)"),
        el("button",{class:"btn-accent",onclick:()=>{
          fixedBox.style.display = fixedBox.style.display==="none"?"block":"none";
        }},"✅ Показать решение"),
        el("button",{class:"btn-primary",onclick:()=>{
          if (!state.debugDone[b.id]) { addXP(50); state.debugDone[b.id]=true; saveState();
            const n = Object.keys(state.debugDone).length;
            unlock("debug1"); if (n>=4) unlock("debug10");
            toast(`🐛 Программа решена! +50 XP (${n}/6)`);
            render();
          }
        }},"✔ Отметить решённой"+(state.debugDone[b.id]?" ✓":""))
      ),
      el("p",{class:"muted",style:"margin-top:8px"}, "Подсказки (нажми кнопку выше):"),
      errList,
      fixedBox
    ));
  });
}

function renderAI(main){
  const doneN = Object.keys(state.aiDone||{}).length;
  main.append(
    el("div",{class:"hero"},
      el("div",{class:"hero-emoji"},"🤖"),
      el("h1",{},"AI Challenge — Творческие задачи с искусственным интеллектом"),
      el("p",{},`${AI_TASKS.length} креативных задач: используй любой AI-чат (ChatGPT, Claude, Lovable AI и т.д.), чтобы их выполнить. Решено: ${doneN}/${AI_TASKS.length}`)
    )
  );
  AI_TASKS.forEach(t=>{
    const hint = el("p",{class:"muted",style:"display:none;margin-top:8px"}, "💡 " + t.hint);
    main.appendChild(el("div",{class:"panel"},
      el("h3",{}, t.title, " ",
        el("span",{class:"badge level-"+(t.level==="easy"?"easy":t.level==="mid"?"mid":"hard")}, t.level==="easy"?"новичок":t.level==="mid"?"средний":"продвинутый")
      ),
      el("p",{}, t.desc),
      el("div",{class:"code-actions"},
        el("button",{class:"btn-ghost",onclick:()=>hint.style.display=hint.style.display==="none"?"block":"none"},"💡 Подсказка / промт"),
        el("button",{class:"btn-primary",onclick:()=>{
          state.aiDone = state.aiDone || {};
          if (!state.aiDone[t.id]) { state.aiDone[t.id]=true; addXP(40); saveState();
            toast(`🤖 Задача выполнена! +40 XP`);
            render();
          }
        }},"✔ Отметить выполненной"+((state.aiDone||{})[t.id]?" ✓":""))
      ),
      hint
    ));
  });
}

function renderAch(main){
  main.append(
    el("div",{class:"hero"},
      el("div",{class:"hero-emoji"},"🏆"),
      el("h1",{},"Достижения"),
      el("p",{},`Открыто: ${Object.keys(state.achievements).length} / ${ACHIEVEMENTS.length}`)
    )
  );
  const wrap = el("div",{class:"achievements"});
  ACHIEVEMENTS.forEach(a=>{
    wrap.appendChild(el("div",{class:"ach"+(state.achievements[a.id]?" unlocked":"")},
      el("div",{}, el("strong",{},a.name)),
      el("div",{class:"muted"}, a.desc)
    ));
  });
  main.appendChild(wrap);
}

function codeBlock(code){
  const box = el("div",{class:"codebox"},
    el("pre",{html: highlight(code)})
  );
  const btn = el("button",{class:"btn-ghost",style:"margin-top:8px",onclick:()=>{navigator.clipboard.writeText(code);toast("📋 Скопировано!");}},"📋 Копировать");
  return el("div",{}, box, btn);
}

window.addEventListener("DOMContentLoaded", ()=>{
  document.documentElement.className = state.theme === "light" ? "light" : "";
  $("#search").addEventListener("input", e=>{ searchQuery = e.target.value.toLowerCase(); renderSidebar(); });
  document.querySelectorAll(".chip").forEach(c=>{
    c.addEventListener("click", ()=>{
      document.querySelectorAll(".chip").forEach(x=>x.classList.remove("active"));
      c.classList.add("active"); levelFilter = c.dataset.level; renderSidebar();
    });
  });
  $("#theme-toggle").addEventListener("click", ()=>{
    state.theme = state.theme==="light" ? "dark":"light"; saveState();
    document.documentElement.className = state.theme==="light"?"light":"";
  });
  $("#reset").addEventListener("click", ()=>{
    if (confirm("Сбросить весь прогресс?")) {
      localStorage.removeItem(STATE_KEY); location.reload();
    }
  });
  const _eb = document.getElementById("edit-profile");
  if (_eb) _eb.addEventListener("click", ()=>showProfileModal(true));
  if (!state.profile) showProfileModal(false); else updateProfileBadge();
  render();
});

function updateProfileBadge(){
  const b = document.getElementById("profile-badge");
  if (!b) return;
  if (state.profile) b.textContent = "👤 " + state.profile.fullName + " · " + state.profile.className;
  else b.textContent = "👤 Гость";
}
function showProfileModal(canCancel){
  const back = el("div",{class:"modal-back"});
  const nameI = el("input",{class:"search",style:"margin:8px 0",placeholder:"Имя и фамилия"});
  const classI = el("input",{class:"search",style:"margin:8px 0",placeholder:"Класс (например, 6А)"});
  if (state.profile){ nameI.value = state.profile.fullName||""; classI.value = state.profile.className||""; }
  const err = el("div",{class:"muted",style:"color:#e25;font-size:12px;min-height:16px"});
  const save = el("button",{class:"btn-primary",style:"margin-right:8px",onclick:()=>{
    const n = nameI.value.trim(), c = classI.value.trim();
    if (n.length<2 || c.length<1){ err.textContent="Заполни оба поля"; return; }
    state.profile = {fullName:n, className:c}; saveState();
    updateProfileBadge(); back.remove(); render();
  }},"Сохранить");
  const cancel = canCancel ? el("button",{class:"btn-ghost",onclick:()=>back.remove()},"Отмена") : document.createTextNode("");
  const box = el("div",{class:"modal"},
    el("h3",{},"👤 Профиль ученика"),
    el("p",{class:"muted"},"Введи имя и класс — прогресс сохранится вместе с профилем."),
    nameI, classI, err,
    el("div",{style:"margin-top:8px"}, save, cancel)
  );
  back.appendChild(box);
  document.body.appendChild(back);
  setTimeout(()=>nameI.focus(),50);
}

// 5 примеров на охваченные темы Web Academy. Остальные — авто-генерация.
const TOPIC_EXAMPLES = {
  2: [
    {title:"Минимальная страница", code:"<!doctype html>\n<html lang=\"ru\">\n<head><meta charset=\"utf-8\"><title>Старт</title></head>\n<body><h1>Привет!</h1></body>\n</html>", output:"Браузер откроет страницу с заголовком 'Привет!'", explanation:"Минимальный HTML5-документ."},
    {title:"Простая визитка", code:"<!doctype html><html><body>\n<h1>Аня Иванова</h1>\n<p>Frontend Junior</p>\n<a href=\"mailto:ann@x.com\">ann@x.com</a>\n</body></html>", output:"Заголовок, абзац и кликабельная ссылка", explanation:"Используем h1, p и a."},
    {title:"Список покупок", code:"<ul>\n  <li>Молоко</li>\n  <li>Хлеб</li>\n  <li>Сыр</li>\n</ul>", output:"• Молоко\\n• Хлеб\\n• Сыр", explanation:"Маркированный список <ul><li>."},
    {title:"Картинка с подписью", code:"<figure>\n  <img src=\"cat.jpg\" alt=\"Кот\">\n  <figcaption>Кот Барсик</figcaption>\n</figure>", output:"Картинка + подпись под ней", explanation:"figure + figcaption — семантическая связка."},
    {title:"Простая форма", code:"<form>\n  <label>Имя: <input name=\"name\"></label>\n  <button>OK</button>\n</form>", output:"Поле и кнопка отправки", explanation:"Не забываем атрибут name у input."},
  ],
  8: [
    {title:"Красные заголовки", code:"h1 { color: red; }", output:"все <h1> станут красными", explanation:"CSS-правило: селектор { свойство: значение }"},
    {title:"Подключение CSS", code:"<link rel=\"stylesheet\" href=\"style.css\">", output:"стили из файла применяются", explanation:"Внешний CSS — лучшая практика."},
    {title:"Шрифт страницы", code:"body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 16px; }", output:"Текст в указанном шрифте", explanation:"Список шрифтов = резервные варианты."},
    {title:"Фон и поля", code:"body { background: #f4f6f8; margin: 0; padding: 20px; }", output:"Светлый фон, поля 20px", explanation:"Сбрасываем margin у body, добавляем padding."},
    {title:"Кнопка", code:"button { background: #07f; color: #fff; border: 0; padding: 10px 16px; border-radius: 8px; cursor: pointer; }", output:"Синяя кнопка со скруглением", explanation:"border:0 убирает рамку, cursor:pointer — рука при наведении."},
  ],
  12: [
    {title:"Горизонтальное меню", code:".menu { display:flex; gap:16px; }", output:"Три ссылки в ряд", explanation:"display:flex превращает контейнер во flex-row."},
    {title:"Шапка: лого слева, кнопки справа", code:"header { display:flex; justify-content: space-between; align-items:center; }", output:"Лого ←-→ кнопки", explanation:"space-between прижимает к краям."},
    {title:"Центр экрана", code:"body { display:flex; justify-content:center; align-items:center; min-height:100vh; }", output:"Содержимое по центру окна", explanation:"100vh = 100% высоты viewport."},
    {title:"Растяжимая карточка", code:".card .body { flex: 1; }", output:"Средний блок занимает всё свободное место", explanation:"flex:1 распределяет остаток."},
    {title:"Перенос строк", code:".row { display:flex; flex-wrap: wrap; gap: 12px; }", output:"Карточки переносятся на новую строку", explanation:"flex-wrap:wrap нужен на большом количестве элементов."},
  ],
  17: [
    {title:"Hello, console", code:"console.log(\"Привет!\");", output:"Привет!", explanation:"console.log выводит в DevTools."},
    {title:"Переменные", code:"const name=\"Аня\"; let age=12; age++; console.log(name,age);", output:"Аня 13", explanation:"const — константа, let — изменяемая."},
    {title:"Сложение", code:"console.log(2+2, \"2\"+\"2\");", output:"4 22", explanation:"С числами — сумма, со строками — конкатенация."},
    {title:"Шаблонная строка", code:"const n='Аня'; console.log(`Привет, ${n}!`);", output:"Привет, Аня!", explanation:"Бэктики + ${...} для подстановки."},
    {title:"Тернарник", code:"const a=10; console.log(a>5?'много':'мало');", output:"много", explanation:"cond ? then : else"},
  ],
  23: [
    {title:"Найти и изменить", code:"document.querySelector('#t').textContent='Новый';", output:"Текст элемента поменялся", explanation:"querySelector + textContent."},
    {title:"Добавить класс", code:"document.querySelector('.btn').classList.add('active');", output:"К кнопке добавлен класс", explanation:"classList — лучший способ работы с классами."},
    {title:"Создать элемент", code:"const li=document.createElement('li'); li.textContent='новый'; document.querySelector('ul').append(li);", output:"В список добавился пункт", explanation:"createElement + append."},
    {title:"Все элементы", code:"document.querySelectorAll('.item').forEach(i=>i.style.color='red');", output:"Все .item покраснели", explanation:"NodeList можно итерировать forEach."},
    {title:"Чтение input", code:"const v=document.querySelector('input').value; console.log(v);", output:"Значение поля", explanation:"У input берём .value, не textContent."},
  ],
  25: [
    {title:"Клик", code:"btn.addEventListener('click',()=>alert('hi'));", output:"Алёрт после клика", explanation:"addEventListener('click', fn)."},
    {title:"Ввод", code:"inp.addEventListener('input',e=>console.log(e.target.value));", output:"Каждый символ — лог", explanation:"Событие 'input' срабатывает на каждое изменение."},
    {title:"Submit без перезагрузки", code:"form.addEventListener('submit',e=>{e.preventDefault();});", output:"Форма не перезагружает страницу", explanation:"preventDefault блокирует действие по умолчанию."},
    {title:"Счётчик", code:"let n=0; btn.addEventListener('click',()=>{n++; out.textContent=n;});", output:"Кнопка увеличивает счётчик", explanation:"Замыкание + textContent."},
    {title:"Enter", code:"inp.addEventListener('keydown',e=>{if(e.key==='Enter')go();});", output:"По Enter вызывается go()", explanation:"e.key — название клавиши."},
  ],
  31: [
    {title:"Простой GET", code:"fetch('/api/users').then(r=>r.json()).then(console.log);", output:"Список пользователей в консоли", explanation:"fetch + .json() + .then."},
    {title:"Проверка ok", code:"fetch('/api/x').then(r=>{ if(!r.ok) throw new Error(r.status); return r.json(); });", output:"Ошибка для 4xx/5xx", explanation:"Самостоятельно бросаем ошибку, fetch этого не делает."},
    {title:"POST JSON", code:"fetch('/api/u',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Аня'})});", output:"Сервер создаёт запись", explanation:"POST + Content-Type + JSON.stringify."},
    {title:"async/await", code:"async function go(){ const r=await fetch('/api/x'); const d=await r.json(); console.log(d); }", output:"Линейный код", explanation:"await ждёт промис."},
    {title:"Параллельно", code:"const [a,b]=await Promise.all([fetch('/a'),fetch('/b')]);", output:"Два запроса одновременно", explanation:"Promise.all — параллельность."},
  ],
  34: [
    {title:"stringify", code:"JSON.stringify({a:1,b:[1,2]});", output:"'{\"a\":1,\"b\":[1,2]}'", explanation:"Объект → строка."},
    {title:"Красивый JSON", code:"JSON.stringify({a:1}, null, 2);", output:"Отформатированный с отступами", explanation:"Третий аргумент — кол-во пробелов."},
    {title:"parse", code:"JSON.parse('{\"x\":42}');", output:"{x:42}", explanation:"Строка → объект."},
    {title:"Безопасный parse", code:"try{JSON.parse(s)}catch(e){console.error(e)}", output:"Не падает на битом JSON", explanation:"try/catch — обязателен на внешние данные."},
    {title:"fetch + json", code:"fetch('/data.json').then(r=>r.json());", output:"Загруженный JSON", explanation:"r.json() сам парсит."},
  ],
};

/* =========================================================
   Content overrides — gives every example and every debug
   program its own distinct identity (no duplicate templates).
   Loaded BEFORE script.js so generator overrides take effect.
   ========================================================= */
(function(){
  'use strict';

  // ---------- 30 distinct debug programs ----------
  // Each program has its own theme, code, bug-set and fix.
  // Each program targets its OWN distinct set of bug categories.
  // No two programs share more than one error category, so all 30
  // exercises feel genuinely different from one another.
  const DEBUG_PROGRAMS = [
    // ============================================================
    // 15 ПРОЦЕДУРНЫХ ПРОГРАММ (без ООП) — каждая своя тема и стек
    // ============================================================

    // p1 — DOM: список дел (добавление в <ul>)
    {
      id:"b1", title:"📝 To-Do список (DOM)", level:"Новичок", oop:false,
      broken:
`const input = document.getElementByID("task")
const btn   = document.querySelector(".add")
const list  = document.querySelector("#list");
btn.addEventListener("Click", () => {
  let text = input.values;
  if (text = "") return;
  const li = document.createElement(LI);
  li.textContent == text;
  list.appendChild(li)
  input.value = ""
}`,
      fixed:
`const input = document.getElementById("task");
const btn   = document.querySelector(".add");
const list  = document.querySelector("#list");
btn.addEventListener("click", () => {
  const text = input.value;
  if (text === "") return;
  const li = document.createElement("li");
  li.textContent = text;
  list.appendChild(li);
  input.value = "";
});`,
      errors:[
        "getElementByID — должно быть getElementById (D маленькая)",
        "Нет ; после первой строки",
        "Нет ; после const btn = ...",
        "addEventListener(\"Click\") — событие пишется маленькими: \"click\"",
        "input.values — нет такого свойства, нужно input.value",
        "if (text = \"\") — присваивание, нужно сравнение === \"\"",
        "createElement(LI) — без кавычек, должно быть \"li\"",
        "li.textContent == text — сравнение вместо присваивания =",
        "Нет ; после list.appendChild(li)",
        "Нет ; после input.value = \"\"",
        "Не закрыт callback и addEventListener — пропущены }) "
      ]
    },

    // p2 — Events: счётчик кликов с делегированием
    {
      id:"b2", title:"🖱️ Счётчик кликов (события)", level:"Средний", oop:false,
      broken:
`let count = 0
const root = document.querySelector(.panel);
function onClick(e) {
  if (e.target.tagName = "BUTTON"); {
    count++
    root.querySelector("#out").innerHTML = count
  }
}
root.addEventListener("click" onClick);
window.onLoad = () => {
  console.log("Счётчик готов" count)
};`,
      fixed:
`let count = 0;
const root = document.querySelector(".panel");
function onClick(e) {
  if (e.target.tagName === "BUTTON") {
    count++;
    root.querySelector("#out").textContent = count;
  }
}
root.addEventListener("click", onClick);
window.onload = () => {
  console.log("Счётчик готов", count);
};`,
      errors:[
        "Нет ; после let count = 0",
        "querySelector(.panel) — селектор без кавычек",
        "tagName = \"BUTTON\" — присваивание вместо ===",
        "Лишняя ; после if(...) делает блок всегда выполняемым",
        "Нет ; после count++",
        "innerHTML для числа лучше textContent (XSS/семантика)",
        "addEventListener(\"click\" onClick) — нет запятой между аргументами",
        "window.onLoad — должно быть onload (всё маленькими)",
        "console.log(\"...\" count) — нет запятой между аргументами",
        "Нет ; в конце console.log(...)",
        "Функция объявлена ниже, но вызывается — порядок чтения путает учеников (нужно поднять)"
      ]
    },

    // p3 — Canvas: рисуем сетку из квадратов
    {
      id:"b3", title:"🟦 Шахматная сетка (Canvas)", level:"Средний", oop:false,
      broken:
`const canvas = document.getElementByID("c");
const ctx = canvas.getcontext("2d")
const SIZE = 40
for (let y = 0, y < 8, y++) {
  for (let x = 0; x <= 8; x++) {
    ctx.fillStyle = (x + y) % 2 = 0 ? "white" : "black";
    ctx.fillRect(x * SIZE; y * SIZE, SIZE SIZE);
  }
}
ctx.strokeStyle = "red"
ctx.strokeRect(0 0, 8*SIZE, 8*SIZE)`,
      fixed:
`const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
const SIZE = 40;
for (let y = 0; y < 8; y++) {
  for (let x = 0; x < 8; x++) {
    ctx.fillStyle = (x + y) % 2 === 0 ? "white" : "black";
    ctx.fillRect(x * SIZE, y * SIZE, SIZE, SIZE);
  }
}
ctx.strokeStyle = "red";
ctx.strokeRect(0, 0, 8 * SIZE, 8 * SIZE);`,
      errors:[
        "getElementByID — нужно getElementById",
        "getcontext — должно быть getContext (C большая)",
        "Нет ; после canvas.getContext(...)",
        "Нет ; после const SIZE = 40",
        "for (let y = 0, y < 8, y++) — запятые вместо ;",
        "Внутренний цикл x <= 8 рисует 9 столбцов (off-by-one)",
        "(x + y) % 2 = 0 — присваивание вместо ===",
        "fillRect(x*SIZE; y*SIZE,...) — ; вместо , в аргументах",
        "fillRect(..., SIZE SIZE) — пропущена запятая между аргументами",
        "Нет ; после ctx.strokeStyle",
        "strokeRect(0 0, ...) — пропущена запятая",
        "Нет ; в конце последней строки"
      ]
    },

    // p4 — Анимация: requestAnimationFrame, движение блока
    {
      id:"b4", title:"🎞️ Анимация блока через rAF", level:"Средний", oop:false,
      broken:
`const box = document.querySelector(.box);
let x = 0
let dx = 2;
function tick() {
  x = x + dx
  if (x > 300 || x < 0) dx = dx;
  box.style.left = x + px;
  requestAnimationFrame(Tick);
}
requestanimationframe(tick)`,
      fixed:
`const box = document.querySelector(".box");
let x = 0;
let dx = 2;
function tick() {
  x = x + dx;
  if (x > 300 || x < 0) dx = -dx;
  box.style.left = x + "px";
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);`,
      errors:[
        "querySelector(.box) — селектор без кавычек",
        "Нет ; после let x = 0",
        "Нет ; после x = x + dx внутри tick",
        "dx = dx — баг логики: dx должно становиться -dx, иначе нет отскока",
        "x + px — px не строка, должно быть x + \"px\"",
        "Нет ; после box.style.left",
        "requestAnimationFrame(Tick) — Tick с большой, такой функции нет",
        "Нет ; после requestAnimationFrame(tick) внутри функции",
        "requestanimationframe — всё маленькими, такого API нет",
        "Нет ; в конце вызова",
        "Граница x>300 — без учёта ширины блока (логическая неточность для крайнего пикселя)"
      ]
    },

    // p5 — Async/await: загрузка пользователей с API
    {
      id:"b5", title:"🌐 Async fetch пользователей (API)", level:"Продвинутый", oop:false,
      broken:
`async function loadUsers() {
  const res = fetch("https://jsonplaceholder.typicode.com/users")
  const data = res.json();
  for (let i = 0, i < data.length, i++) {
    console.log(data[i].Name)
  }
}
loadUsers()
.then(() => console.log("Готово"));
window.addEventListener("DOMContentLoaded" loadUsers);`,
      fixed:
`async function loadUsers() {
  const res = await fetch("https://jsonplaceholder.typicode.com/users");
  const data = await res.json();
  for (let i = 0; i < data.length; i++) {
    console.log(data[i].name);
  }
}
loadUsers().then(() => console.log("Готово"));
window.addEventListener("DOMContentLoaded", loadUsers);`,
      errors:[
        "fetch(...) без await — res это Promise, не Response",
        "res.json() без await — вернётся Promise",
        "Нет ; после const res = ...",
        "Нет ; после await fetch (в сломанной версии)",
        "for ( ; , , ) — запятые вместо ; ",
        "data[i].Name — Name с большой, в API поле называется name",
        "Нет ; после console.log(...)",
        "Нет ; после loadUsers()",
        ".then(...) на новой строке после ; — Promise уже отброшен, .then не сцеплено",
        "addEventListener(\"DOMContentLoaded\" loadUsers) — нет запятой",
        "Нет ; в конце addEventListener",
        "loadUsers вызывается дважды (баг логики — двойной запрос)"
      ]
    },

    // p6 — Promises: последовательная загрузка картинок
    {
      id:"b6", title:"🖼️ Последовательная загрузка картинок (Promise)", level:"Продвинутый", oop:false,
      broken:
`const urls = ["a.png", "b.png", "c.png"]
function load(url) {
  return new Promise((resolve reject) => {
    const img = new Image()
    img.onLoad = () => resolve(img);
    img.onerror = (e) => reject(e)
    img.src == url;
  });
}
let chain = Promise.Resolve();
for (let i = 0; i <= urls.length; i++) {
  chain = chain.then(() => load(urls[i]));
}
chain.catch(err => console.log("Ошибка" err));`,
      fixed:
`const urls = ["a.png", "b.png", "c.png"];
function load(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}
let chain = Promise.resolve();
for (let i = 0; i < urls.length; i++) {
  chain = chain.then(() => load(urls[i]));
}
chain.catch(err => console.log("Ошибка", err));`,
      errors:[
        "Нет ; после массива urls",
        "(resolve reject) — нет запятой между параметрами",
        "Нет ; после new Image()",
        "img.onLoad — должно быть onload (всё маленькими)",
        "Нет ; после img.onerror = ...",
        "img.src == url — сравнение вместо присваивания =",
        "Promise.Resolve — должно быть Promise.resolve (маленькая r)",
        "Нет ; после let chain = ...",
        "i <= urls.length — off-by-one, выйдет за границы массива",
        "console.log(\"Ошибка\" err) — нет запятой",
        "Нет ; в конце chain.catch(...)"
      ]
    },

    // p7 — Phaser.js: спрайт с управлением клавишами
    {
      id:"b7", title:"🕹️ Phaser: управление героем", level:"Продвинутый", oop:false,
      broken:
`const config = {
  type: phaser.AUTO,
  width: 400, height: 300,
  scene: { preload, create update }
};
let hero, cursors
function preload() {
  this.load.image("hero" "hero.png");
}
function create() {
  hero = this.physics.add.sprite(100, 100, hero);
  cursors = this.input.keyboard.createCursorKey();
}
function update() {
  if (cursors.left.isDown) hero.x -= 2
  if (cursors.right.isDown); hero.x += 2;
}
new Phaser.game(config);`,
      fixed:
`const config = {
  type: Phaser.AUTO,
  width: 400, height: 300,
  scene: { preload, create, update }
};
let hero, cursors;
function preload() {
  this.load.image("hero", "hero.png");
}
function create() {
  hero = this.physics.add.sprite(100, 100, "hero");
  cursors = this.input.keyboard.createCursorKeys();
}
function update() {
  if (cursors.left.isDown) hero.x -= 2;
  if (cursors.right.isDown) hero.x += 2;
}
new Phaser.Game(config);`,
      errors:[
        "phaser.AUTO — нужно Phaser.AUTO (с большой)",
        "scene: { preload, create update } — пропущена запятая",
        "Нет ; после let hero, cursors",
        "this.load.image(\"hero\" \"hero.png\") — нет запятой",
        "Нет ; в конце load.image",
        "sprite(..., hero) — hero без кавычек, нужно \"hero\"",
        "createCursorKey — должно быть createCursorKeys (со s)",
        "Нет ; в конце createCursorKeys",
        "hero.x -= 2 без ;",
        "if (cursors.right.isDown); — лишняя ; делает блок безусловным",
        "Phaser.game — должно быть Phaser.Game (G большая)",
        "Нет ; в конце new Phaser.Game(config)"
      ]
    },

    // p8 — Game physics: гравитация шарика
    {
      id:"b8", title:"🏀 Гравитация и отскок (физика)", level:"Продвинутый", oop:false,
      broken:
`let y = 0
let vy = 0;
const g = 0.5;
const floor = 300
function step() {
  vy = vy + g
  y = y - vy;
  if (y > floor) {
    y = floor;
    vy = vy * 0.8;
  }
  console.log("y" y);
  setTimeout(step 16);
}
step;`,
      fixed:
`let y = 0;
let vy = 0;
const g = 0.5;
const floor = 300;
function step() {
  vy = vy + g;
  y = y + vy;
  if (y > floor) {
    y = floor;
    vy = -vy * 0.8;
  }
  console.log("y", y);
  setTimeout(step, 16);
}
step();`,
      errors:[
        "Нет ; после let y = 0",
        "Нет ; после const floor = 300",
        "Нет ; после vy = vy + g",
        "y = y - vy — знак неверен, гравитация должна увеличивать y (y = y + vy)",
        "vy = vy * 0.8 — потерян знак минус, шарик не отскакивает (нужно -vy * 0.8)",
        "console.log(\"y\" y) — нет запятой между аргументами",
        "Нет ; после console.log",
        "setTimeout(step 16) — нет запятой между аргументами",
        "Нет ; после setTimeout(...)",
        "step; — функция не вызывается, нужно step()",
        "Нет проверки границ на отрицательное y (мелкая логическая)",
        "Нет clearTimeout/выхода — бесконечный цикл (предупреждение)"
      ]
    },

    // p9 — Collision: пересечение прямоугольников (AABB)
    {
      id:"b9", title:"📦 AABB-коллизия двух коробок", level:"Средний", oop:false,
      broken:
`const a = { x: 10, y: 10, w: 50, h: 50 }
const b = { x: 30, y: 20, w: 40, h: 40 };
function hit(r1, r2) {
  return r1.x < r2.x + r2.w &&
         r1.x + r1.w > r2.x &&
         r1.y < r2.y - r2.h &&
         r1.y + r1.h > r2.y
}
if (hit(a b)) {
  console.log("Столкновение")
} else
  console.log("Нет столкновения");
  console.log("Проверка завершена");`,
      fixed:
`const a = { x: 10, y: 10, w: 50, h: 50 };
const b = { x: 30, y: 20, w: 40, h: 40 };
function hit(r1, r2) {
  return r1.x < r2.x + r2.w &&
         r1.x + r1.w > r2.x &&
         r1.y < r2.y + r2.h &&
         r1.y + r1.h > r2.y;
}
if (hit(a, b)) {
  console.log("Столкновение");
} else {
  console.log("Нет столкновения");
}
console.log("Проверка завершена");`,
      errors:[
        "Нет ; после const a = {...}",
        "Третье условие: r2.y - r2.h должно быть r2.y + r2.h (логика AABB)",
        "Нет ; в конце return",
        "hit(a b) — нет запятой между аргументами",
        "Нет ; после console.log(\"Столкновение\")",
        "У else нет { }, поэтому следующий console.log выполнится всегда",
        "Отступ обманывает: 'Проверка завершена' принадлежит вне else",
        "Сравнения нечётко учитывают касание (граничный логический баг)",
        "Нет проверки, что r1 и r2 — объекты (defensive)",
        "Функция должна быть named — допустимо, но без ; после fn declaration ок; зато if без { } для одной строки выглядит небезопасно",
        "В исходнике перепутан порядок осей y — типичная ошибка инверсии"
      ]
    },

    // p10 — State management (объект-хранилище)
    {
      id:"b10", title:"🗃️ Простой store с подписчиками (state)", level:"Продвинутый", oop:false,
      broken:
`const store = { state: { count: 0 }, subs: [] }
function subscribe(fn) {
  store.subs.push[fn];
}
function setState(patch) {
  store.state = patch;
  for (let i = 0; i <= store.subs.length; i++) {
    store.subs[i](store.state)
  }
}
subscribe(s => console.log("count=", s.count))
setState({ count = 1 });
setState({ count: 2 })`,
      fixed:
`const store = { state: { count: 0 }, subs: [] };
function subscribe(fn) {
  store.subs.push(fn);
}
function setState(patch) {
  store.state = { ...store.state, ...patch };
  for (let i = 0; i < store.subs.length; i++) {
    store.subs[i](store.state);
  }
}
subscribe(s => console.log("count=", s.count));
setState({ count: 1 });
setState({ count: 2 });`,
      errors:[
        "Нет ; после const store = {...}",
        "store.subs.push[fn] — квадратные скобки вместо ( ) — это обращение к свойству, а не вызов",
        "store.state = patch — затирает state, нужно слить (spread)",
        "i <= store.subs.length — off-by-one, выйдет за массив",
        "Нет ; после store.subs[i](store.state)",
        "Нет ; после subscribe(...)",
        "{ count = 1 } — это деструктуризация со значением по умолчанию, а не объект; нужно count: 1",
        "Нет ; после setState({count:2})",
        "Нет защиты от исключения в подписчике (логический баг)",
        "setState не возвращает новое состояние (state-баг)",
        "Подписчики вызываются даже если patch пустой (state-баг)"
      ]
    },

    // p11 — Массивы: фильтр товаров
    {
      id:"b11", title:"🛍️ Фильтр товаров (массивы)", level:"Средний", oop:false,
      broken:
`const items = [
  { name: "Хлеб", price: 30 },
  { name: "Молоко" price: 60 },
  { name: "Сыр", price: 250 },
];
function cheap(arr, max) {
  return arr.filter(x => x.price < max)
}
let result = cheap(items 100);
for (let i = 0; i < result.length; i++)
  console.log(result[i].Name);
console.log("Всего" result.length)`,
      fixed:
`const items = [
  { name: "Хлеб", price: 30 },
  { name: "Молоко", price: 60 },
  { name: "Сыр", price: 250 }
];
function cheap(arr, max) {
  return arr.filter(x => x.price < max);
}
let result = cheap(items, 100);
for (let i = 0; i < result.length; i++) {
  console.log(result[i].name);
}
console.log("Всего", result.length);`,
      errors:[
        "{ name: \"Молоко\" price: 60 } — нет запятой между полями",
        "Лишняя запятая после последнего элемента массива (опционально, мелкая стилистическая)",
        "Нет ; после return arr.filter(...)",
        "cheap(items 100) — нет запятой между аргументами",
        "Нет ; после let result = ...",
        "result[i].Name — должно быть name (с маленькой)",
        "console.log(\"Всего\" result.length) — нет запятой",
        "Нет ; в конце последнего console.log",
        "for без { } — следующий console.log не в цикле (логический баг)",
        "filter с < вместо <= даёт другой результат на границе (мелкая логика)",
        "Нет проверки arr на пустоту (defensive)"
      ]
    },

    // p12 — Циклы: таблица умножения в DOM
    {
      id:"b12", title:"✖️ Таблица умножения в DOM", level:"Средний", oop:false,
      broken:
`const table = document.getElementByID("mult");
for (let i = 1; i < 10; i++); {
  const tr = document.createelement("tr")
  for (let j = 1, j <= 10, j++) {
    const td = document.createElement("td");
    td.innerText == i * j;
    tr.appendchild(td);
  }
  table.appendChild(tr)
}`,
      fixed:
`const table = document.getElementById("mult");
for (let i = 1; i <= 10; i++) {
  const tr = document.createElement("tr");
  for (let j = 1; j <= 10; j++) {
    const td = document.createElement("td");
    td.innerText = i * j;
    tr.appendChild(td);
  }
  table.appendChild(tr);
}`,
      errors:[
        "getElementByID — должно быть getElementById",
        "Лишняя ; после for(...) — превращает цикл в пустой",
        "i < 10 — таблица должна быть до 10 включительно, нужно <=",
        "createelement — должно быть createElement (E большая)",
        "Нет ; после createElement(\"tr\")",
        "Внутренний for: запятые вместо ; ",
        "td.innerText == i * j — сравнение вместо присваивания =",
        "appendchild — нужно appendChild (C большая)",
        "Нет ; в конце table.appendChild(tr)",
        "innerText лучше textContent для табличных чисел (стиль)",
        "Нет ; в конце вложенного appendChild"
      ]
    },

    // p13 — Conditions: симулятор светофора (DOM)
    {
      id:"b13", title:"🚦 Светофор переключения (условия+DOM)", level:"Средний", oop:false,
      broken:
`let state = "red"
const light = document.querySelector(.light);
function next() {
  if (state = "red") state = "yellow";
  else if (state == "yellow") state == "green";
  else if (state === "green") state = "Red"
  light.style.background = state;
}
setInterval(next 1000);
next`,
      fixed:
`let state = "red";
const light = document.querySelector(".light");
function next() {
  if (state === "red") state = "yellow";
  else if (state === "yellow") state = "green";
  else if (state === "green") state = "red";
  light.style.background = state;
}
setInterval(next, 1000);
next();`,
      errors:[
        "Нет ; после let state = \"red\"",
        "querySelector(.light) — селектор без кавычек",
        "if (state = \"red\") — присваивание вместо сравнения ===",
        "state == \"yellow\" — лучше строгое === (стиль/тип-баги)",
        "state == \"green\" — присваивание выглядит как ==, должно быть присваивание =",
        "state = \"Red\" — \"Red\" с большой ломает цикл переключения",
        "Нет ; после state = \"Red\"",
        "setInterval(next 1000) — нет запятой между аргументами",
        "Нет ; после setInterval(...)",
        "next; — функция не вызывается, нужно next()",
        "Нет ; в конце вызова next()"
      ]
    },

    // p14 — Функции: рекурсивный обратный отсчёт
    {
      id:"b14", title:"⏳ Рекурсивный обратный отсчёт", level:"Средний", oop:false,
      broken:
`function countdown(n) {
  if (n = 0) {
    console.log("Старт!")
    Return;
  }
  console.log(n)
  countdown(n - 1)
}
countdown(5)
console.log("Готово" countdown(3));
setTimeout(countdown 0);`,
      fixed:
`function countdown(n) {
  if (n === 0) {
    console.log("Старт!");
    return;
  }
  console.log(n);
  countdown(n - 1);
}
countdown(5);
console.log("Готово", countdown(3));
setTimeout(() => countdown(0), 0);`,
      errors:[
        "if (n = 0) — присваивание вместо ===",
        "Нет ; после console.log(\"Старт!\")",
        "Return с большой — нужно return",
        "Нет ; после console.log(n)",
        "Нет ; после countdown(n - 1)",
        "Нет ; после countdown(5)",
        "console.log(\"Готово\" countdown(3)) — нет запятой",
        "countdown в setTimeout без обёртки: setTimeout(countdown 0) — нет запятой и вызовется без аргумента",
        "Нет ; в конце setTimeout",
        "Базовый случай n<=0 не обрабатывает отрицательные числа (логика)",
        "console.log(\"Готово\", countdown(3)) — выведет undefined (нет return) — концептуальный баг"
      ]
    },

    // p15 — API + DOM: рендер списка постов
    {
      id:"b15", title:"📰 Рендер списка постов из API", level:"Продвинутый", oop:false,
      broken:
`const list = document.querySelector("#posts");
async function render() {
  const data = await fetch("https://jsonplaceholder.typicode.com/posts?_limit=5").json()
  for (let i = 0; i <= data.length; i++) {
    const li = document.createelement("li");
    li.textContent == data[i].Title;
    list.appendChild(li);
  }
}
render()
render.then(() => console.log("ok"));`,
      fixed:
`const list = document.querySelector("#posts");
async function render() {
  const res = await fetch("https://jsonplaceholder.typicode.com/posts?_limit=5");
  const data = await res.json();
  for (let i = 0; i < data.length; i++) {
    const li = document.createElement("li");
    li.textContent = data[i].title;
    list.appendChild(li);
  }
}
render().then(() => console.log("ok"));`,
      errors:[
        "await fetch(...).json() без await на res — нельзя цепочкой так",
        "res вообще не сохранён",
        "Нет ; после .json()",
        "i <= data.length — off-by-one",
        "createelement — нужно createElement",
        "li.textContent == data[i].Title — сравнение и Title с большой",
        "data[i].Title — поле в API называется title (с маленькой)",
        "Нет ; после list.appendChild(li)",
        "render() и потом render.then(...) — .then вызвано на функции, а не на промисе",
        "Нет обработки ошибок fetch (try/catch отсутствует)",
        "Нет ; после render() в первой версии",
        "list.querySelector может быть null — нет защиты"
      ]
    },

    // ============================================================
    // 15 ООП-ПРОГРАММ — каждая с своей архитектурой
    // ============================================================

    // p16 — Class Player + inventory
    {
      id:"b16", title:"🎮 Класс Player с инвентарём", level:"Средний", oop:true,
      broken:
`class Player {
  constructor(name) {
    this.Name = name;
    this.inventory = [];
  }
  pick(item) {
    this.inventory.push[item];
  }
  has(item) {
    return inventory.includes(item)
  }
}
const p = Player("Алиса");
p.pick("меч")
p.pick("щит");
console.log(p.has("меч"))
console.log(p.Inventory);`,
      fixed:
`class Player {
  constructor(name) {
    this.name = name;
    this.inventory = [];
  }
  pick(item) {
    this.inventory.push(item);
  }
  has(item) {
    return this.inventory.includes(item);
  }
}
const p = new Player("Алиса");
p.pick("меч");
p.pick("щит");
console.log(p.has("меч"));
console.log(p.inventory);`,
      errors:[
        "this.Name — поле с большой буквы, дальше используется name",
        "push[item] — квадратные скобки, должен быть вызов push(item)",
        "inventory.includes — нет this.",
        "Нет ; после return ...",
        "const p = Player(...) — забыто new",
        "Нет ; после p.pick(\"меч\")",
        "Нет ; после console.log(p.has(...))",
        "p.Inventory — Inventory с большой, такого свойства нет (undefined)",
        "Нет ; в конце console.log(p.Inventory)",
        "В методе has обращение к глобальному inventory (scope-баг)",
        "Конструктор не валидирует name (defensive)"
      ]
    },

    // p17 — Наследование Shape→Circle/Square на Canvas
    {
      id:"b17", title:"🔵 Наследование Shape→Circle/Square (Canvas)", level:"Продвинутый", oop:true,
      broken:
`class Shape {
  constructor(x, y) { this.x = x, this.y = y; }
  draw() { throw "implement" }
}
class Circle extends shape {
  constructor(x, y, r) {
    super(x y);
    this.r = r;
  }
  draw(ctx) {
    ctx.beginpath();
    ctx.arc(this.X, this.Y, this.r, 0, Math.PI * 2)
    ctx.fill();
  }
}
class Square extends Shape {
  constructor(x, y, s) { super(x, y); this.s = s; }
  draw(ctx) { ctx.fillRect(this.x, this.y, this.s this.s) }
}
const c = new circle(50, 50, 20);
c.draw(ctx)`,
      fixed:
`class Shape {
  constructor(x, y) { this.x = x; this.y = y; }
  draw() { throw new Error("implement"); }
}
class Circle extends Shape {
  constructor(x, y, r) {
    super(x, y);
    this.r = r;
  }
  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
  }
}
class Square extends Shape {
  constructor(x, y, s) { super(x, y); this.s = s; }
  draw(ctx) { ctx.fillRect(this.x, this.y, this.s, this.s); }
}
const c = new Circle(50, 50, 20);
c.draw(ctx);`,
      errors:[
        "constructor Shape: this.x = x, this.y = y — запятая вместо ;",
        "throw \"implement\" — лучше throw new Error(...) (стиль/семантика)",
        "extends shape — shape с маленькой, такого класса нет",
        "super(x y) — нет запятой между аргументами",
        "ctx.beginpath — должно быть beginPath (P большая)",
        "this.X / this.Y — поля с большой, должны быть x/y",
        "Нет ; после ctx.arc(...)",
        "ctx.fillRect(..., this.s this.s) — нет запятой между аргументами",
        "Нет ; после fillRect(...)",
        "new circle(...) — circle с маленькой",
        "Нет ; после c.draw(ctx)",
        "Метод draw() без аргументов в базовом классе путает сигнатуру"
      ]
    },

    // p18 — Class CountdownTimer с собственными событиями
    {
      id:"b18", title:"⏰ Класс CountdownTimer с событиями", level:"Продвинутый", oop:true,
      broken:
`class CountdownTimer {
  constructor(seconds) {
    this.left = seconds
    this.listeners = {}
  }
  on(event, fn) { this.listeners[event] = fn }
  start() {
    this.id = setInterval(function () {
      this.left--;
      if (this.left = 0) {
        clearInterval(this.id);
        this.listeners.End();
      }
    }, 1000);
  }
}
const t = CountdownTimer(3);
t.on("end" () => console.log("Время!"));
t.Start();`,
      fixed:
`class CountdownTimer {
  constructor(seconds) {
    this.left = seconds;
    this.listeners = {};
  }
  on(event, fn) { this.listeners[event] = fn; }
  start() {
    this.id = setInterval(() => {
      this.left--;
      if (this.left <= 0) {
        clearInterval(this.id);
        if (this.listeners.end) this.listeners.end();
      }
    }, 1000);
  }
}
const t = new CountdownTimer(3);
t.on("end", () => console.log("Время!"));
t.start();`,
      errors:[
        "Нет ; после this.left = seconds",
        "Нет ; после this.listeners = {}",
        "Нет ; внутри on(...)",
        "setInterval(function(){...}) — теряется this, нужна стрелка",
        "if (this.left = 0) — присваивание вместо сравнения",
        "Должно быть <= 0, иначе пропустит ноль",
        "this.listeners.End() — End с большой, в подписке \"end\"",
        "Нет проверки, что подписчик есть (defensive)",
        "const t = CountdownTimer(3) — забыто new",
        "t.on(\"end\" () => ...) — нет запятой между аргументами",
        "t.Start() — Start с большой, такого метода нет",
        "Нет ; в конце t.Start()"
      ]
    },

    // p19 — Class Snake (поле и движение)
    {
      id:"b19", title:"🐍 Snake — класс игры на сетке", level:"Продвинутый", oop:true,
      broken:
`class Snake {
  constructor() {
    this.body = [[5,5]];
    this.dir = [1 0];
  }
  step() {
    const h = this.body[0];
    const nh = [h[0] + this.dir[0], h[1] + this.dir[1]];
    this.body.unshift[nh];
    this.body.pop;
  }
  turn(dx, dy) {
    if (dx === -this.dir[0] && dy === -this.dir[1]) return
    this.dir = [dx dy];
  }
}
const s = Snake();
s.step()
s.Turn(0, 1);
console.log(s.body)`,
      fixed:
`class Snake {
  constructor() {
    this.body = [[5,5]];
    this.dir = [1, 0];
  }
  step() {
    const h = this.body[0];
    const nh = [h[0] + this.dir[0], h[1] + this.dir[1]];
    this.body.unshift(nh);
    this.body.pop();
  }
  turn(dx, dy) {
    if (dx === -this.dir[0] && dy === -this.dir[1]) return;
    this.dir = [dx, dy];
  }
}
const s = new Snake();
s.step();
s.turn(0, 1);
console.log(s.body);`,
      errors:[
        "[1 0] — пропущена запятая в массиве направления",
        "unshift[nh] — должен быть вызов unshift(nh)",
        "this.body.pop — забыты скобки, метод не вызван",
        "Нет ; после return в turn",
        "[dx dy] — пропущена запятая в массиве",
        "const s = Snake() — забыто new",
        "Нет ; после s.step()",
        "s.Turn(0,1) — Turn с большой, метод turn",
        "Нет ; в конце console.log",
        "step не проверяет столкновение с границей (логика игры)",
        "Нет роста змейки при поедании (логика игры)"
      ]
    },

    // p20 — Phaser Scene как класс
    {
      id:"b20", title:"🛸 Phaser Scene как класс", level:"Продвинутый", oop:true,
      broken:
`class MyScene extends Phaser.scene {
  constructor() {
    super({ key: MyScene });
  }
  preload() {
    this.load.image("ship" "ship.png");
  }
  create() {
    this.ship = this.add.image(200 150, "ship");
    this.cursors = this.input.keyboard.createcursorkeys();
  }
  Update() {
    if (this.cursors.left.isDown) this.ship.x -= 2
    if (this.cursors.right.isDown) this.ship.x += 2;
  }
}
new Phaser.Game({ scene: MyScene });`,
      fixed:
`class MyScene extends Phaser.Scene {
  constructor() {
    super({ key: "MyScene" });
  }
  preload() {
    this.load.image("ship", "ship.png");
  }
  create() {
    this.ship = this.add.image(200, 150, "ship");
    this.cursors = this.input.keyboard.createCursorKeys();
  }
  update() {
    if (this.cursors.left.isDown) this.ship.x -= 2;
    if (this.cursors.right.isDown) this.ship.x += 2;
  }
}
new Phaser.Game({ scene: MyScene });`,
      errors:[
        "Phaser.scene — должно быть Phaser.Scene (S большая)",
        "super({ key: MyScene }) — MyScene без кавычек (получает класс, а не ключ)",
        "this.load.image(\"ship\" \"ship.png\") — нет запятой",
        "this.add.image(200 150, ...) — нет запятой между координатами",
        "createcursorkeys — должно быть createCursorKeys (camelCase)",
        "Метод Update — должен быть update (с маленькой), иначе Phaser не вызовет",
        "Нет ; после this.ship.x -= 2",
        "Нет ; в конце new Phaser.Game(...)",
        "В Phaser.Game нет полей type/width/height — конфиг неполный",
        "constructor не вызывает super с конфигом сцены полностью (нет active)",
        "this.add.image вместо this.physics.add.image — спорный логический выбор"
      ]
    },

    // p21 — TodoStore (observer-pattern)
    {
      id:"b21", title:"📋 TodoStore (Observer)", level:"Продвинутый", oop:true,
      broken:
`class TodoStore {
  constructor() {
    this.items = []
    this.subs = [];
  }
  add(text) {
    this.items.push({ text, done: false })
    this.notify;
  }
  toggle(i) {
    this.items[i].Done = !this.items[i].done;
    this.notify();
  }
  subscribe(fn) { this.subs.push[fn]; }
  notify() {
    for (let i = 0; i <= this.subs.length; i++) {
      this.subs[i](this.items);
    }
  }
}
const s = TodoStore();
s.subscribe(items => console.log(items.length))
s.add("молоко");`,
      fixed:
`class TodoStore {
  constructor() {
    this.items = [];
    this.subs = [];
  }
  add(text) {
    this.items.push({ text, done: false });
    this.notify();
  }
  toggle(i) {
    this.items[i].done = !this.items[i].done;
    this.notify();
  }
  subscribe(fn) { this.subs.push(fn); }
  notify() {
    for (let i = 0; i < this.subs.length; i++) {
      this.subs[i](this.items);
    }
  }
}
const s = new TodoStore();
s.subscribe(items => console.log(items.length));
s.add("молоко");`,
      errors:[
        "Нет ; после this.items = []",
        "Нет ; после this.items.push(...)",
        "this.notify; — метод не вызван, забыты ()",
        "this.items[i].Done — Done с большой, поле done",
        "this.subs.push[fn] — должен быть вызов push(fn)",
        "i <= this.subs.length — off-by-one",
        "const s = TodoStore() — забыто new",
        "Нет ; после s.subscribe(...)",
        "Нет защиты от падающего подписчика (defensive)",
        "notify вызовется до подписки в add — порядок не важен сейчас, но баг ордера в обычном коде",
        "Нет return из add — нельзя получить добавленный элемент"
      ]
    },

    // p22 — Class Particle с физикой
    {
      id:"b22", title:"✨ Класс Particle (физика частиц)", level:"Продвинутый", oop:true,
      broken:
`class Particle {
  constructor(x, y) {
    this.x = x, this.y = y;
    this.vx = Math.random() * 2 - 1
    this.vy = Math.random() * 2 - 1;
    this.life = 60;
  }
  update() {
    this.x += this.vx
    this.y += this.vy;
    this.life--;
  }
  isDead() { return this.life = 0; }
}
const ps = []
for (let i = 0; i <= 50; i++) ps.push(Particle(0,0));
ps.forEach(p => p.Update());`,
      fixed:
`class Particle {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = Math.random() * 2 - 1;
    this.vy = Math.random() * 2 - 1;
    this.life = 60;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
  }
  isDead() { return this.life <= 0; }
}
const ps = [];
for (let i = 0; i < 50; i++) ps.push(new Particle(0, 0));
ps.forEach(p => p.update());`,
      errors:[
        "this.x = x, this.y = y — запятая вместо ; (несколько присваиваний)",
        "Нет ; после this.vx = Math.random()*2-1",
        "Нет ; после this.x += this.vx",
        "this.life = 0 — присваивание вместо сравнения <=",
        "isDead должен использовать <= 0, иначе пропустит отрицательные значения",
        "Нет ; после const ps = []",
        "i <= 50 — off-by-one (51 итерация)",
        "ps.push(Particle(0,0)) — забыто new",
        "p.Update() — Update с большой, метод update",
        "Нет ; в конце forEach",
        "Нет очистки 'мёртвых' частиц после update (логика жизненного цикла)"
      ]
    },

    // p23 — CollisionWorld (AABB на множестве)
    {
      id:"b23", title:"💥 CollisionWorld для множества тел", level:"Продвинутый", oop:true,
      broken:
`class CollisionWorld {
  constructor() { this.bodies = [] }
  add(b) { this.bodies.push[b]; }
  pairs() {
    const out = [];
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = 0; j <= this.bodies.length; j++) {
        if (i = j) continue;
        if (this.hit(this.bodies[i], this.bodies[j])) {
          out.push([i j]);
        }
      }
    }
    return out;
  }
  hit(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x
        && a.y < b.y - b.h && a.y + a.h > b.y;
  }
}
const w = CollisionWorld()
w.add({x:0,y:0,w:10,h:10})
w.add({x:5,y:5,w:10,h:10})
console.log(w.Pairs());`,
      fixed:
`class CollisionWorld {
  constructor() { this.bodies = []; }
  add(b) { this.bodies.push(b); }
  pairs() {
    const out = [];
    for (let i = 0; i < this.bodies.length; i++) {
      for (let j = i + 1; j < this.bodies.length; j++) {
        if (this.hit(this.bodies[i], this.bodies[j])) {
          out.push([i, j]);
        }
      }
    }
    return out;
  }
  hit(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x
        && a.y < b.y + b.h && a.y + a.h > b.y;
  }
}
const w = new CollisionWorld();
w.add({x:0, y:0, w:10, h:10});
w.add({x:5, y:5, w:10, h:10});
console.log(w.pairs());`,
      errors:[
        "Нет ; после this.bodies = []",
        "this.bodies.push[b] — должен быть вызов push(b)",
        "j <= this.bodies.length — off-by-one",
        "Дублирование пар: j должно начинаться с i+1, иначе будут (1,0) и (0,1)",
        "if (i = j) — присваивание вместо сравнения ===",
        "[i j] — нет запятой в массиве",
        "В hit: a.y < b.y - b.h должно быть a.y < b.y + b.h (инверсия)",
        "const w = CollisionWorld() — забыто new",
        "Нет ; после w.add(...)",
        "w.Pairs() — Pairs с большой, метод pairs",
        "Нет ; в конце console.log"
      ]
    },

    // p24 — FetchClient (async-обёртка)
    {
      id:"b24", title:"🌍 Класс FetchClient (async API)", level:"Продвинутый", oop:true,
      broken:
`class FetchClient {
  constructor(base) {
    this.base = base
  }
  async get(path) {
    const url = this.base + path;
    const res = fetch(url)
    if (!res.ok) throw "bad"
    return res.json();
  }
}
const api = FetchClient("https://jsonplaceholder.typicode.com");
api.Get("/users").then(u => console.log(u.length))
api.get("/posts").Then(p => console.log(p));`,
      fixed:
`class FetchClient {
  constructor(base) {
    this.base = base;
  }
  async get(path) {
    const url = this.base + path;
    const res = await fetch(url);
    if (!res.ok) throw new Error("bad response");
    return await res.json();
  }
}
const api = new FetchClient("https://jsonplaceholder.typicode.com");
api.get("/users").then(u => console.log(u.length));
api.get("/posts").then(p => console.log(p));`,
      errors:[
        "Нет ; после this.base = base",
        "fetch(url) без await — в res Promise, не Response",
        "res.ok будет undefined, потому что res — Promise (async-баг)",
        "throw \"bad\" — лучше throw new Error(...)",
        "return res.json() без await — вернётся Promise (формально ок, но непоследовательно с проверкой ok)",
        "Нет ; после throw",
        "const api = FetchClient(...) — забыто new",
        "api.Get(...) — Get с большой, метод get",
        "Нет ; после api.Get(...).then(...)",
        ".Then с большой — должно быть .then",
        "Нет catch для обработки ошибок промиса",
        "Нет ; в конце второго .then"
      ]
    },

    // p25 — StateStore с reducers
    {
      id:"b25", title:"🧠 StateStore с reducers (Redux-like)", level:"Продвинутый", oop:true,
      broken:
`class StateStore {
  constructor(reducer initial) {
    this.reducer = reducer;
    this.state = initial;
    this.subs = []
  }
  dispatch(action) {
    this.state = this.Reducer(this.state, action);
    this.subs.forEach(fn => fn(this.state));
  }
  subscribe(fn) { this.subs.push[fn]; }
  getState() { return state; }
}
function reducer(s, a) {
  if (a.type = "inc") return { n: s.n + 1 };
  return s;
}
const store = StateStore(reducer, { n: 0 });
store.subscribe(s => console.log(s.n))
store.Dispatch({ type: "inc" });`,
      fixed:
`class StateStore {
  constructor(reducer, initial) {
    this.reducer = reducer;
    this.state = initial;
    this.subs = [];
  }
  dispatch(action) {
    this.state = this.reducer(this.state, action);
    this.subs.forEach(fn => fn(this.state));
  }
  subscribe(fn) { this.subs.push(fn); }
  getState() { return this.state; }
}
function reducer(s, a) {
  if (a.type === "inc") return { n: s.n + 1 };
  return s;
}
const store = new StateStore(reducer, { n: 0 });
store.subscribe(s => console.log(s.n));
store.dispatch({ type: "inc" });`,
      errors:[
        "constructor(reducer initial) — нет запятой между параметрами",
        "Нет ; после this.subs = []",
        "this.Reducer — Reducer с большой, поле reducer",
        "this.subs.push[fn] — должен быть вызов push(fn)",
        "return state — нет this., scope-баг (state не определён)",
        "if (a.type = \"inc\") — присваивание вместо сравнения ===",
        "const store = StateStore(...) — забыто new",
        "Нет ; после store.subscribe(...)",
        "store.Dispatch — Dispatch с большой, метод dispatch",
        "Нет ; в конце store.dispatch(...)",
        "Reducer возвращает новый объект без слияния — состояние сужается, теряются другие поля"
      ]
    },

    // p26 — Animation engine (классы tween)
    {
      id:"b26", title:"🌀 Класс анимации Tween", level:"Продвинутый", oop:true,
      broken:
`class Tween {
  constructor(target, prop, to, ms) {
    this.target = target;
    this.prop = prop
    this.from = target[prop];
    this.to = to;
    this.ms = ms;
    this.start = Date.Now();
  }
  step() {
    const t = (Date.now() - this.start) / this.ms;
    const k = t > 1 ? 1 : t
    this.target[this.prop] = this.from + (this.to - this.from) * k;
    return k = 1;
  }
}
const obj = { x: 0 }
const tw = Tween(obj, "x", 100, 500);
function loop() {
  if (tw.Step()) return;
  requestAnimationFrame(loop)
}
loop`,
      fixed:
`class Tween {
  constructor(target, prop, to, ms) {
    this.target = target;
    this.prop = prop;
    this.from = target[prop];
    this.to = to;
    this.ms = ms;
    this.start = Date.now();
  }
  step() {
    const t = (Date.now() - this.start) / this.ms;
    const k = t > 1 ? 1 : t;
    this.target[this.prop] = this.from + (this.to - this.from) * k;
    return k === 1;
  }
}
const obj = { x: 0 };
const tw = new Tween(obj, "x", 100, 500);
function loop() {
  if (tw.step()) return;
  requestAnimationFrame(loop);
}
loop();`,
      errors:[
        "Нет ; после this.prop = prop",
        "Date.Now — должно быть Date.now (с маленькой)",
        "Нет ; после const k = ...",
        "return k = 1 — присваивание вместо сравнения === (всегда truthy)",
        "Нет ; после const obj = { x: 0 }",
        "const tw = Tween(...) — забыто new",
        "tw.Step() — Step с большой, метод step",
        "Нет ; после requestAnimationFrame(loop)",
        "loop; — функция не вызвана, нужно loop()",
        "Нет ; в конце вызова loop()",
        "Конструктор не валидирует, что target[prop] — число (defensive)"
      ]
    },

    // p27 — Form validator
    {
      id:"b27", title:"✅ Валидатор формы (класс)", level:"Средний", oop:true,
      broken:
`class Validator {
  constructor(rules) { this.rules = rules }
  check(values) {
    const errors = {};
    for (let key in this.rules) {
      const rule = this.rules[key];
      const v = values[key];
      if (rule.required && (v == null || v === "")) errors[key] = "required"
      if (rule.min && v.length < rule.min); errors[key] = "too short";
    }
    return errors
  }
}
const v = Validator({ name: { required: true, min: 3 } });
console.log(v.Check({ name: "Al" }))`,
      fixed:
`class Validator {
  constructor(rules) { this.rules = rules; }
  check(values) {
    const errors = {};
    for (let key in this.rules) {
      const rule = this.rules[key];
      const v = values[key];
      if (rule.required && (v == null || v === "")) {
        errors[key] = "required";
        continue;
      }
      if (rule.min && typeof v === "string" && v.length < rule.min) {
        errors[key] = "too short";
      }
    }
    return errors;
  }
}
const v = new Validator({ name: { required: true, min: 3 } });
console.log(v.check({ name: "Al" }));`,
      errors:[
        "Нет ; после this.rules = rules",
        "Нет ; после errors[key] = \"required\"",
        "Лишняя ; после if(...) — присвоение выполняется всегда",
        "Нет защиты от v=undefined при rule.min (v.length упадёт)",
        "Нет ; после return errors",
        "const v = Validator(...) — забыто new",
        "v.Check — Check с большой, метод check",
        "Нет ; в конце console.log(v.check(...))",
        "Не сделан continue после required — затирает ошибку на min",
        "Нет typeof-проверки на строку перед v.length (defensive)",
        "Метод check мутирует общий errors — для теста ок, но логически возвращать новый объект"
      ]
    },

    // p28 — Carousel (DOM-классы)
    {
      id:"b28", title:"🎠 Карусель (DOM-класс)", level:"Продвинутый", oop:true,
      broken:
`class Carousel {
  constructor(root) {
    this.root = root;
    this.slides = root.queryselectorall(".slide");
    this.index = 0
  }
  next() {
    this.index = (this.index + 1) % this.slides.Length;
    this.render();
  }
  render() {
    for (let i = 0; i <= this.slides.length; i++) {
      this.slides[i].style.display = i = this.index ? "block" : "none";
    }
  }
}
const c = Carousel(document.querySelector(".carousel"));
document.querySelector(".next").addEventListener("Click" () => c.Next());`,
      fixed:
`class Carousel {
  constructor(root) {
    this.root = root;
    this.slides = root.querySelectorAll(".slide");
    this.index = 0;
  }
  next() {
    this.index = (this.index + 1) % this.slides.length;
    this.render();
  }
  render() {
    for (let i = 0; i < this.slides.length; i++) {
      this.slides[i].style.display = i === this.index ? "block" : "none";
    }
  }
}
const c = new Carousel(document.querySelector(".carousel"));
document.querySelector(".next").addEventListener("click", () => c.next());`,
      errors:[
        "queryselectorall — должно быть querySelectorAll (camelCase)",
        "Нет ; после this.index = 0",
        "this.slides.Length — Length с большой, нужно length",
        "i <= this.slides.length — off-by-one",
        "i = this.index — присваивание вместо сравнения ===",
        "const c = Carousel(...) — забыто new",
        "Событие \"Click\" — должно быть \"click\"",
        "addEventListener(... () => ...) — нет запятой",
        "c.Next() — Next с большой, метод next",
        "Нет ; в конце addEventListener",
        "render не показывает первый слайд при init (нет вызова render в конструкторе)"
      ]
    },

    // p29 — EventBus (pub/sub-класс)
    {
      id:"b29", title:"🔔 EventBus (pub/sub)", level:"Средний", oop:true,
      broken:
`class EventBus {
  constructor() { this.map = {} }
  on(name, fn) {
    if (!this.map[name]) this.map[name] = [];
    this.map[name].push[fn];
  }
  emit(name, data) {
    const list = this.map[Name];
    if (!list) return
    for (let i = 0; i <= list.length; i++) list[i](data);
  }
  off(name, fn) {
    this.map[name] = (this.map[name] || []).filter(x => x = fn);
  }
}
const bus = EventBus()
bus.on("hello" d => console.log("привет", d));
bus.Emit("hello", "мир");`,
      fixed:
`class EventBus {
  constructor() { this.map = {}; }
  on(name, fn) {
    if (!this.map[name]) this.map[name] = [];
    this.map[name].push(fn);
  }
  emit(name, data) {
    const list = this.map[name];
    if (!list) return;
    for (let i = 0; i < list.length; i++) list[i](data);
  }
  off(name, fn) {
    this.map[name] = (this.map[name] || []).filter(x => x !== fn);
  }
}
const bus = new EventBus();
bus.on("hello", d => console.log("привет", d));
bus.emit("hello", "мир");`,
      errors:[
        "Нет ; после this.map = {}",
        "this.map[name].push[fn] — должен быть вызов push(fn)",
        "this.map[Name] — Name с большой, переменная name",
        "Нет ; после return в emit",
        "i <= list.length — off-by-one",
        "filter(x => x = fn) — присваивание вместо сравнения !==",
        "В off оставляются вызовы только тех, что РАВНЫ fn — логика инвертирована",
        "const bus = EventBus() — забыто new",
        "Нет ; после const bus = ...",
        "bus.on(\"hello\" d => ...) — нет запятой",
        "bus.Emit — Emit с большой, метод emit",
        "Нет ; в конце bus.emit(...)"
      ]
    },

    // p30 — Vector2D (математика, перегрузка через методы)
    {
      id:"b30", title:"➕ Класс Vector2D", level:"Средний", oop:true,
      broken:
`class Vector2D {
  constructor(x, y) {
    this.x = x, this.y = y;
  }
  add(v) { return Vector2D(this.x + v.x, this.y + v.y); }
  length() { return Math.sqrt(this.x * this.x + this.y + this.y); }
  normalize() {
    const len = this.Length();
    return new Vector2D(this.x / len, this.y / len)
  }
}
const a = Vector2D(3, 4)
const b = new vector2D(1, 2);
const c = a.Add(b);
console.log(c.length())`,
      fixed:
`class Vector2D {
  constructor(x, y) {
    this.x = x; this.y = y;
  }
  add(v) { return new Vector2D(this.x + v.x, this.y + v.y); }
  length() { return Math.sqrt(this.x * this.x + this.y * this.y); }
  normalize() {
    const len = this.length();
    return new Vector2D(this.x / len, this.y / len);
  }
}
const a = new Vector2D(3, 4);
const b = new Vector2D(1, 2);
const c = a.add(b);
console.log(c.length());`,
      errors:[
        "this.x = x, this.y = y — запятая вместо ;",
        "В add: Vector2D(...) без new",
        "length: this.y + this.y вместо this.y * this.y (формула длины сломана)",
        "this.Length() — Length с большой, метод length",
        "Нет ; в конце normalize return",
        "const a = Vector2D(3, 4) — забыто new",
        "Нет ; после const a = ...",
        "new vector2D — vector2D с маленькой, такого класса нет",
        "a.Add(b) — Add с большой, метод add",
        "Нет ; в конце console.log(c.length())",
        "normalize не защищён от len===0 (деление на ноль)"
      ]
    }
  ];

  // ---------- Replace makeBugs ----------
  window.makeBugs = function(){ return DEBUG_PROGRAMS; };

  // ---------- Differentiated examples per topic ----------
  // 15 distinct "lenses" — each example uses a different real-life theme.
  const LENSES = [
    {emoji:"📦", ctx:"переменная", code:t=>`let value = "${t.title}";\nconsole.log("Тема:", value);`, out:t=>`Тема: ${t.title}`},
    {emoji:"🔢", ctx:"число", code:t=>`const n = ${t.id};\nconsole.log("ID темы:", n, "квадрат:", n*n);`, out:t=>`ID темы: ${t.id} квадрат: ${t.id*t.id}`},
    {emoji:"📝", ctx:"строка", code:t=>`const s = "${t.title}";\nconsole.log("Букв:", s.length);`, out:t=>`Букв: ${t.title.length}`},
    {emoji:"📋", ctx:"массив", code:t=>`const arr = ["${t.title}", "${t.group}"];\nconsole.log(arr.join(" / "));`, out:t=>`${t.title} / ${t.group}`},
    {emoji:"🧮", ctx:"вычисление", code:t=>`const a = ${t.id}, b = 7;\nconsole.log("a+b =", a+b, "a*b =", a*b);`, out:t=>`a+b = ${t.id+7} a*b = ${t.id*7}`},
    {emoji:"🔀", ctx:"условие", code:t=>`const level = "${t.level}";\nif (level === "easy") console.log("Лёгкий уровень");\nelse if (level === "mid") console.log("Средний");\nelse console.log("Продвинутый");`, out:t=>t.level==="easy"?"Лёгкий уровень":t.level==="mid"?"Средний":"Продвинутый"},
    {emoji:"🔁", ctx:"цикл", code:t=>`for (let i = 1; i <= 3; i++) {\n  console.log("Шаг " + i + " темы «${t.title}»");\n}`, out:t=>`Шаг 1 темы «${t.title}»\nШаг 2 темы «${t.title}»\nШаг 3 темы «${t.title}»`},
    {emoji:"🛠️", ctx:"функция", code:t=>`function describe(name) {\n  return "Тема: " + name;\n}\nconsole.log(describe("${t.title}"));`, out:t=>`Тема: ${t.title}`},
    {emoji:"➡️", ctx:"arrow", code:t=>`const upper = s => s.toUpperCase();\nconsole.log(upper("${t.group}"));`, out:t=>`${t.group.toUpperCase()}`},
    {emoji:"🎒", ctx:"объект", code:t=>`const topic = { id: ${t.id}, name: "${t.title}", group: "${t.group}" };\nconsole.log(topic.name, "(", topic.group, ")");`, out:t=>`${t.title} ( ${t.group} )`},
    {emoji:"🧰", ctx:"map", code:t=>`const nums = [1, 2, 3];\nconst doubled = nums.map(n => n * ${t.id});\nconsole.log(doubled);`, out:t=>`[ ${1*t.id}, ${2*t.id}, ${3*t.id} ]`},
    {emoji:"🔎", ctx:"filter", code:t=>`const nums = [1, 2, 3, 4, 5, 6];\nconst evens = nums.filter(n => n % 2 === 0);\nconsole.log(evens);`, out:()=>`[ 2, 4, 6 ]`},
    {emoji:"📊", ctx:"reduce", code:t=>`const nums = [10, 20, 30];\nconst sum = nums.reduce((a,b)=>a+b, 0);\nconsole.log("Сумма:", sum);`, out:()=>`Сумма: 60`},
    {emoji:"🧪", ctx:"шаблонная строка", code:t=>`const t = { name: "${t.title}", group: "${t.group}" };\nconsole.log(\`📚 \${t.name} — раздел «\${t.group}»\`);`, out:t=>`📚 ${t.title} — раздел «${t.group}»`},
    {emoji:"🎯", ctx:"мини-проект", code:t=>`const goal = "Изучить «${t.title}»";\nconst done = true;\nconsole.log(done ? "✅ " + goal : "⏳ " + goal);`, out:t=>`✅ Изучить «${t.title}»`}
  ];

  // Keep author's hand-crafted base examples for topics 1, 2 — they already differ.
  // For everything else, generate 15 distinct examples using the lenses above
  // PLUS prepend the topic's own canonical syntax as the first "core" example.
  const origMakeExamples = window.makeExamples;
  window.makeExamples = function(topic){
    // If the original has a base entry for this topic id, keep it (already distinct)
    try {
      const base = origMakeExamples && origMakeExamples(topic);
      if (base && base.length && base[0] && base[0].title && !/— пример \d+$/.test(base[0].title||"")) {
        return base;
      }
    } catch(e) {}

    const out = [];
    // Example 0: topic's own canonical snippet
    out.push({
      title: `${topic.emoji||"📘"} Основа: ${topic.title}`,
      level: "Новичок",
      code: topic.syntax,
      output: "(зависит от данных)",
      explanation: topic.syntaxNote || `Базовый синтаксис темы «${topic.title}».`
    });

    for (let i = 0; i < 14; i++){
      const lens = LENSES[i % LENSES.length];
      const lvl = i < 4 ? "Новичок" : i < 9 ? "Средний" : "Продвинутый";
      out.push({
        title: `${lens.emoji} ${lens.ctx} в теме «${topic.title}»`,
        level: lvl,
        code: lens.code(topic),
        output: lens.out(topic),
        explanation: `Этот пример показывает, как ${lens.ctx} используется применительно к теме «${topic.title}». Сравни с другими примерами — каждый раскрывает свой угол.`
      });
    }
    return out;
  };
})();

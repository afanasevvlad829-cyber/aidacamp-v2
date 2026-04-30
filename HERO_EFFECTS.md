# Hero-эффекты на чистом CSS — библиотека для лендингов

**Цель документа:** дать любому разработчику возможность подключить наш набор анимированных hero-блоков на любой статический сайт. Никаких canvas, JS, библиотек — только CSS.

**Принципы:**
- 100% CSS, ноль JavaScript
- Нулевой LCP-impact (анимации `::before`/`::after`, не блокируют рендер)
- Mobile-first: на экранах ≤ 768px анимации **отключаются**, остаётся статичный градиент
- Уважение к `prefers-reduced-motion: reduce` (доступность)
- Production-tested на ~150 страницах сайта aidacamp.ru

---

## 1. Как это работает за 30 секунд

```html
<!-- HTML: один data-атрибут -->
<section data-hero-bg="quantum" class="hero">
  <h1>Ваш заголовок</h1>
  <p>Подзаголовок</p>
</section>
```

```css
/* CSS: только два правила-обёртки */
[data-hero-bg] {
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

@media (max-width: 768px), (prefers-reduced-motion: reduce) {
  [data-hero-bg] *,
  [data-hero-bg]::before,
  [data-hero-bg]::after { animation: none !important; }
}
```

Дальше — копируете нужный эффект из библиотеки ниже. Всё.

---

## 2. Библиотека эффектов (14 готовых)

Каждая запись:
- **Описание** — что показывает, для чего годится
- **Цвет/настроение**
- **CSS** — вставить как есть в свой stylesheet

### 2.1. `quantum` — оранжевые шары + сетка
**Настроение:** энергия, AI, тех. **Базовый цвет:** `#0d1a2b` + оранжевые акценты.
```css
[data-hero-bg="quantum"] {
  background:
    radial-gradient(circle 8px at 18% 30%, #ff8a00, transparent 70%),
    radial-gradient(circle 8px at 50% 60%, #f5a624, transparent 70%),
    radial-gradient(circle 8px at 80% 35%, #ff8a00, transparent 70%),
    radial-gradient(circle 8px at 30% 75%, #f5a624, transparent 70%),
    radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,138,0,0.18) 0%, transparent 60%),
    #0d1a2b;
}
[data-hero-bg="quantum"]::before {
  content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    linear-gradient(33deg, transparent 49.7%, rgba(255,138,0,0.25) 49.7% 50.3%, transparent 50.3%),
    linear-gradient(-12deg, transparent 49.7%, rgba(255,138,0,0.2) 49.7% 50.3%, transparent 50.3%);
  animation: hb-flicker 6s ease-in-out infinite;
}
@keyframes hb-flicker { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
```

### 2.2. `circuit` — синяя сетка с бегущими электронами
**Настроение:** код, программирование, инженерия. **Цвет:** глубокий чёрный `#050510`.
```css
[data-hero-bg="circuit"] {
  background:
    linear-gradient(rgba(56,189,248,0.18) 1px, transparent 1px) 0 0/40px 40px,
    linear-gradient(90deg, rgba(56,189,248,0.18) 1px, transparent 1px) 0 0/40px 40px,
    #050510;
}
[data-hero-bg="circuit"]::before {
  content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    radial-gradient(circle 4px at 0% 30%, rgba(186,230,253,1), transparent 70%),
    radial-gradient(circle 4px at 0% 60%, rgba(186,230,253,1), transparent 70%);
  filter: drop-shadow(0 0 8px rgba(56,189,248,0.7));
  animation: hb-electron 3s linear infinite;
}
@keyframes hb-electron {
  0% { transform: translateX(0); opacity: 0; }
  10% { opacity: 1; }
  100% { transform: translateX(120%); opacity: 0; }
}
```

### 2.3. `hexagons` — оранжевые точки + мягкое мерцание
**Настроение:** игры, конструктор, креатив. **Цвет:** очень тёмный `#050510`.
```css
[data-hero-bg="hexagons"] {
  background:
    radial-gradient(circle 4px at 25% 30%, #f5a624, transparent 70%),
    radial-gradient(circle 4px at 50% 50%, #f5a624, transparent 70%),
    radial-gradient(circle 4px at 75% 70%, #f5a624, transparent 70%),
    radial-gradient(circle 4px at 65% 25%, #ec7c00, transparent 70%),
    radial-gradient(circle 4px at 35% 75%, #ec7c00, transparent 70%),
    #050510;
}
[data-hero-bg="hexagons"]::before {
  content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background: inherit;
  animation: hb-flicker 6s ease-in-out infinite;
}
```

### 2.4. `interactive-stars` — звёздное небо с диагональными линиями
**Настроение:** ночь, исследование, Minecraft-вайб. **Цвет:** тёмно-синий градиент `#02021e → #08104d`.
```css
[data-hero-bg="interactive-stars"] {
  background:
    radial-gradient(circle 1.5px at 18% 25%, white, transparent 70%),
    radial-gradient(circle 1.5px at 38% 60%, white, transparent 70%),
    radial-gradient(circle 1.5px at 65% 35%, white, transparent 70%),
    radial-gradient(circle 1.5px at 88% 70%, white, transparent 70%),
    linear-gradient(180deg, #02021e, #08104d);
}
[data-hero-bg="interactive-stars"]::before {
  content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    linear-gradient(33deg, transparent 49.7%, rgba(150,200,255,0.15) 49.7% 50.3%, transparent 50.3%),
    linear-gradient(-12deg, transparent 49.7%, rgba(150,200,255,0.12) 49.7% 50.3%, transparent 50.3%);
  animation: hb-flicker 6s ease-in-out infinite;
}
```

### 2.5. `cosmic` — звёздное небо + туманность
**Настроение:** глубокое погружение, отзывы, истории. **Цвет:** угольный `#090a0f`.
```css
[data-hero-bg="cosmic"] {
  background:
    radial-gradient(circle 2px at 18% 25%, white, transparent 70%),
    radial-gradient(circle 2px at 38% 60%, white, transparent 70%),
    radial-gradient(circle 2px at 65% 35%, white, transparent 70%),
    radial-gradient(circle 2px at 88% 70%, white, transparent 70%),
    radial-gradient(circle 2px at 12% 85%, white, transparent 70%),
    radial-gradient(circle 2px at 50% 15%, white, transparent 70%),
    radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%);
}
[data-hero-bg="cosmic"]::before {
  content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background: inherit;
  animation: hb-flicker 6s ease-in-out infinite;
}
```

### 2.6. `star-genesis` — пульсирующая звёздная туманность
**Настроение:** запуск, начало, новый сезон. **Цвет:** чёрный с фиолетовым акцентом.
```css
[data-hero-bg="star-genesis"] {
  background:
    radial-gradient(ellipse 50% 40% at 50% 50%, rgba(127,0,255,0.25), transparent 60%),
    radial-gradient(circle 2px at 18% 25%, white, transparent 70%),
    radial-gradient(circle 2px at 38% 60%, white, transparent 70%),
    radial-gradient(circle 2px at 65% 35%, white, transparent 70%),
    radial-gradient(circle 2px at 88% 70%, white, transparent 70%),
    #000;
}
[data-hero-bg="star-genesis"]::before {
  content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background: inherit;
  animation: hb-breathe 6s ease-in-out infinite alternate;
  filter: blur(20px); opacity: 0.5;
}
@keyframes hb-breathe {
  from { transform: scale(1); }
  to   { transform: scale(1.08) rotate(8deg); }
}
```

### 2.7. `neon-network` — неоновая сетка узлов
**Настроение:** соцсеть, подростки, движение. **Цвет:** глубокий синий `#0d1a2b` + кислотные узлы.
```css
[data-hero-bg="neon-network"] {
  background:
    radial-gradient(circle 6px at 18% 30%, hsl(280,80%,60%), transparent 70%),
    radial-gradient(circle 6px at 50% 60%, hsl(180,80%,60%), transparent 70%),
    radial-gradient(circle 6px at 82% 35%, hsl(60,80%,60%), transparent 70%),
    #0d1a2b;
}
[data-hero-bg="neon-network"]::before {
  content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    linear-gradient(33deg, transparent 49.7%, rgba(196,181,253,0.25) 49.7% 50.3%, transparent 50.3%),
    linear-gradient(-12deg, transparent 49.7%, rgba(196,181,253,0.2) 49.7% 50.3%, transparent 50.3%);
  animation: hb-flicker 6s ease-in-out infinite;
}
```

### 2.8. `glass-orbs` — два светящихся шара с blur
**Настроение:** премиум, чисто, информационно. **Цвет:** тёмный сине-фиолетовый градиент.
```css
[data-hero-bg="glass-orbs"] {
  background:
    radial-gradient(circle 120px at 25% 25%, rgba(56,189,248,0.5), transparent 70%),
    radial-gradient(circle 140px at 75% 70%, rgba(129,140,248,0.5), transparent 70%),
    linear-gradient(to bottom right, #0f172a, #1e1b4b);
}
[data-hero-bg="glass-orbs"]::before,
[data-hero-bg="glass-orbs"]::after {
  content: ''; position: absolute; border-radius: 50%; filter: blur(80px); z-index: 1; pointer-events: none;
}
[data-hero-bg="glass-orbs"]::before {
  width: 320px; height: 320px; background: #38bdf8;
  top: -80px; left: -60px;
  animation: hb-orb 6s infinite ease-in-out alternate;
}
[data-hero-bg="glass-orbs"]::after {
  width: 380px; height: 380px; background: #818cf8;
  bottom: -100px; right: -80px;
  animation: hb-orb 6s infinite ease-in-out alternate -3s;
}
@keyframes hb-orb {
  0%   { transform: translate(0,0) scale(1); }
  50%  { transform: translate(60px,-40px) scale(1.1); }
  100% { transform: translate(-30px,50px) scale(0.95); }
}
```

### 2.9. `fireflies` — светлячки на тёмном фоне
**Настроение:** уют, тепло, природа. **Цвет:** тёмно-зелёный `#081210`.
```css
[data-hero-bg="fireflies"] {
  background:
    radial-gradient(ellipse 80% 60% at 50% 50%, rgba(180,220,80,0.18) 0%, transparent 60%),
    #081210;
}
[data-hero-bg="fireflies"]::before {
  content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    radial-gradient(circle 6px at 15% 25%, rgba(255,230,100,0.95), transparent 70%),
    radial-gradient(circle 5px at 38% 60%, rgba(255,230,100,0.85), transparent 70%),
    radial-gradient(circle 7px at 65% 35%, rgba(255,230,100,0.9), transparent 70%),
    radial-gradient(circle 5px at 88% 70%, rgba(255,230,100,0.8), transparent 70%);
  filter: drop-shadow(0 0 8px rgba(255,230,100,0.5));
  animation: hb-flicker 6s ease-in-out infinite alternate;
}
```

### 2.10. `aurora` — северное сияние
**Настроение:** свежесть, природа, мягкий хайтек. **Цвет:** почти чёрный с зелёно-синими отливами.
```css
[data-hero-bg="aurora"] {
  background:
    radial-gradient(ellipse 70% 50% at 30% 30%, rgba(34,197,94,0.3) 0%, transparent 60%),
    radial-gradient(ellipse 60% 50% at 70% 60%, rgba(56,189,248,0.25) 0%, transparent 60%),
    #000208;
}
[data-hero-bg="aurora"]::before {
  content: ''; position: absolute; inset: -10%; z-index: 1; pointer-events: none;
  background: inherit; filter: blur(40px);
  animation: hb-aurora 6s ease-in-out infinite alternate;
}
@keyframes hb-aurora {
  0%   { transform: translate(0,0) scale(1); }
  100% { transform: translate(3%,-2%) scale(1.05); }
}
```

### 2.11. `particle-flow` — разноцветные дрейфующие частицы
**Настроение:** креатив, дети, игра. **Цвет:** глубокий пурпур `#1a0e2a`.
```css
[data-hero-bg="particle-flow"] {
  background:
    radial-gradient(ellipse 80% 60%, rgba(15,5,25,0.6), transparent),
    #1a0e2a;
}
[data-hero-bg="particle-flow"]::before {
  content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background:
    radial-gradient(circle 8px at 15% 25%, #f472b6, transparent 70%),
    radial-gradient(circle 8px at 38% 60%, #fde047, transparent 70%),
    radial-gradient(circle 8px at 65% 35%, #22d3ee, transparent 70%),
    radial-gradient(circle 8px at 88% 70%, #84cc16, transparent 70%);
  filter: drop-shadow(0 0 6px rgba(255,255,255,0.3));
  animation: hb-drift 6s ease-in-out infinite alternate;
}
@keyframes hb-drift {
  0%   { transform: translate(0,0); }
  100% { transform: translate(15px,-12px); }
}
```

### 2.12. `fiber` — пульсирующий tunnel из колец
**Настроение:** скорость, фокус, интенсив. **Цвет:** оранжевый эпицентр на чёрном.
```css
[data-hero-bg="fiber"] {
  background:
    repeating-radial-gradient(circle at center, transparent 0 30px, rgba(255,138,0,0.18) 30px 32px),
    radial-gradient(ellipse at center, #ff8a00 0%, #050510 70%);
}
[data-hero-bg="fiber"]::before {
  content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none;
  background: radial-gradient(circle at center, rgba(255,138,0,0.5) 0%, transparent 40%);
  animation: hb-pulse 3s ease-in-out infinite;
}
@keyframes hb-pulse {
  0%,100% { opacity: 0.6; transform: scale(0.95); }
  50%     { opacity: 1; transform: scale(1.05); }
}
```

### 2.13. `ascendant` — восходящий луч
**Настроение:** триумф, финал, хакатон. **Цвет:** тёплый бежевый луч на тёмно-синем `#1a1a2e`.
```css
[data-hero-bg="ascendant"] {
  background:
    radial-gradient(ellipse 60% 80% at 50% 100%, rgba(255,238,204,0.35) 0%, transparent 70%),
    #1a1a2e;
}
[data-hero-bg="ascendant"]::before {
  content: ''; position: absolute; top: -20%; left: 50%; width: 300%; height: 150%;
  transform: translateX(-50%); z-index: 1; pointer-events: none;
  background: linear-gradient(45deg, transparent 40%, rgba(255,238,204,0.25) 48%, rgba(255,238,204,0.25) 52%, transparent 60%);
  mask-image: radial-gradient(ellipse at 50% -20%, #000 20%, transparent 70%);
  animation: hb-pan 6s infinite linear;
}
@keyframes hb-pan {
  from { transform: translateX(-50%) rotate(-40deg); }
  to   { transform: translateX(-50%) rotate(40deg); }
}
```

### 2.14. `synthwave` — ретро-сетка с заходящим солнцем
**Настроение:** ретро, 80-е, юношеский экстрим. **Цвет:** фиолетово-чёрный, неоново-розовый.
```css
[data-hero-bg="synthwave"] {
  background: linear-gradient(to bottom, #110022 0%, #050114 60%);
  perspective: 600px;
}
[data-hero-bg="synthwave"]::before {
  content: ''; position: absolute; top: 12%; left: 50%; transform: translateX(-50%);
  width: 200px; height: 200px;
  background: linear-gradient(to bottom, #ffea00 0%, #ff0055 60%, transparent 100%);
  border-radius: 50%; box-shadow: 0 0 50px #ff0055; z-index: 1;
  mask-image: repeating-linear-gradient(180deg, #000 0 10px, transparent 10px 12px, #000 12px 22px, transparent 22px 26px, #000 26px 100%);
}
[data-hero-bg="synthwave"]::after {
  content: ''; position: absolute; bottom: -50%; left: -50%;
  width: 200%; height: 200%;
  transform: rotateX(78deg); transform-origin: top center;
  background-image:
    linear-gradient(to right, #f0f 2px, transparent 2px),
    linear-gradient(to bottom, #f0f 2px, transparent 2px);
  background-size: 60px 60px;
  mask-image: linear-gradient(to bottom, transparent 0%, #000 60%);
  animation: hb-grid-rush 1.6s linear infinite;
  z-index: 1;
}
@keyframes hb-grid-rush {
  0%   { background-position: 0 0; }
  100% { background-position: 0 60px; }
}
@media (max-width: 768px) {
  [data-hero-bg="synthwave"] { perspective: none; }
  [data-hero-bg="synthwave"]::after { transform: none; mask-image: none; opacity: 0.3; }
}
```

---

## 3. Какой эффект под какой контент?

Это рекомендации, выработанные на нашем сайте. Не догма — но проверено визуально.

### 3.1. Курсы и образовательные продукты

| Тематика курса | Эффект | Почему |
|---|---|---|
| AI / нейросети / ChatGPT | `quantum` | оранжевый = энергия, частицы = идея квантовости |
| Программирование Python / JS | `circuit` | сетка кода + бегущие "электроны" |
| Минекрафт / Roblox / геймдев | `hexagons` или `interactive-stars` | кубики/звёзды = игровой вайб |
| Scratch / для младших | `particle-flow` | разноцветные частицы — детский, дружелюбный |
| 3D-моделирование / CAD | `fiber` | тоннель = глубина, перспектива |
| Подростковый продукт (13–17) | `neon-network` | кислотные узлы — современно, не «детсад» |
| Хакатон / марафон / интенсив | `ascendant` | восходящий луч = "поднимаемся к вершине" |
| Премиум-курс / Master Class | `glass-orbs` | мягкие шары = премиум, не агрессивно |

### 3.2. Статьи и блог

| Тема статьи | Эффект | Почему |
|---|---|---|
| Информационные / справочные | `glass-orbs` | спокойно, не отвлекает от текста |
| Истории / кейсы / отзывы | `cosmic` | глубокое небо = простор для повествования |
| Лонгрид о приключениях | `aurora` | мягкое, природа, эмоция |
| Анонс события / запуск | `star-genesis` | "рождение" = новое начало |
| Питание / уют / семья | `fireflies` | тепло, домашнее |
| Ретро / ностальгия | `synthwave` | 80-е, эмоция |

### 3.3. Технические страницы

| Назначение | Эффект |
|---|---|
| Документы / лицензия / правовое | `glass-orbs` (нейтрально) |
| Политика возврата / FAQ | `glass-orbs` |
| Цены / тарифы | `quantum` (привлекает внимание) или `glass-orbs` (классика) |
| About / о компании | `aurora` (свежо) |
| 404 / технические заглушки | `synthwave` (играет с пользователем) |
| Контакты | `glass-orbs` |

### 3.4. Главная страница

**Не ставить hero-эффект** на главную, если:
- На ней крупное hero-фото (CSS-эффект перебьёт фокус)
- Есть видео-фон
- Главная — продающий лендинг с фотографиями людей

CSS-эффекты лучше всего работают **БЕЗ фото в hero** — это их прямое назначение.

---

## 4. Как интегрировать на свой сайт за 5 минут

### Шаг 1. Подключите общие правила в свой stylesheet
```css
/* ОДИН РАЗ — общие правила для всех data-hero-bg */
[data-hero-bg] {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  min-height: 480px; /* подгоните под свой дизайн */
}

/* Mobile + reduced-motion: отключаем анимации */
@media (max-width: 768px), (prefers-reduced-motion: reduce) {
  [data-hero-bg] *,
  [data-hero-bg]::before,
  [data-hero-bg]::after { animation: none !important; }
}

/* Общая анимация мерцания (используется в нескольких эффектах) */
@keyframes hb-flicker { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
```

### Шаг 2. Скопируйте нужный эффект из раздела 2

Вставьте CSS только тех эффектов, которые реально используете на странице.

### Шаг 3. Разметка hero-блока

```html
<section data-hero-bg="quantum" class="hero">
  <div class="hero-inner">
    <h1 style="color:#fff;">Заголовок</h1>
    <p style="color:rgba(255,255,255,0.8);">Подзаголовок</p>
  </div>
</section>
```

```css
.hero {
  padding: 80px 24px;
  min-height: 480px;
}
.hero-inner {
  position: relative;
  z-index: 2; /* поверх ::before/::after эффекта */
  max-width: 1200px;
  margin: 0 auto;
}
```

⚠️ **Важно:** контент внутри `[data-hero-bg]` должен иметь `z-index: 2` или выше, иначе анимированный слой `::before`/`::after` (z-index:1) может его перекрыть.

---

## 5. Контраст текста на hero — WCAG AA

Все наши hero-эффекты тёмные. Для текста на них:

- **Заголовок:** `color: #fff` или `color: white` — контраст 14+:1, всегда PASS
- **Body:** `color: rgba(255,255,255,0.8)` — контраст ~9:1, PASS
- **Muted / caption:** `color: rgba(255,255,255,0.6)` минимум — контраст ~5.5:1, PASS

❌ Нельзя `rgba(255,255,255,0.4)` и ниже — FAIL WCAG AA (контраст < 4.5:1).

Если эффект очень яркий (например `synthwave` с розовым солнцем), добавьте полупрозрачный overlay:
```css
.hero::after {
  content: ''; position: absolute; inset: 0; z-index: 1.5;
  background: linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.6));
}
```

---

## 6. Производительность

- **LCP impact:** ноль. Все анимации в `::before`/`::after`, не блокируют первичный paint.
- **CPU impact:** низкий. CSS keyframes на свойствах `transform`, `opacity` — GPU-композитинг.
- **Mobile:** анимации **выключены** (см. media query). Видна статичная градиентная заливка.
- **Reduced-motion:** уважается автоматически.
- **Bundle size:** ~15 KB CSS на все 14 эффектов (gzipped — ~3 KB).

Размер каждого эффекта (gzipped):
| Эффект | ~ размер |
|---|---|
| `quantum`, `circuit`, `hexagons` | ~250 B |
| `glass-orbs`, `synthwave` | ~400 B |
| Остальные | ~200–300 B |

---

## 7. Кастомизация

### Сменить базовый цвет
В каждом эффекте есть основной фон — последняя строка `radial-gradient` или сплошной hex. Замените его:
```css
[data-hero-bg="quantum"] {
  background:
    radial-gradient(...),
    /* ... */
    #1a0e2a; /* ← было #0d1a2b, теперь пурпурный */
}
```

### Сменить акцентный цвет
В большинстве эффектов 2–4 акцентных цвета (точки, линии). Найдите их `rgb()` / `hsl()` / hex и замените на свой брендовый.

### Сменить скорость анимации
Найдите `animation: hb-XXX 6s ...`. Уменьшите для активного эффекта (3s), увеличьте для медленного (10s).

### Добавить свой эффект
Шаблон:
```css
[data-hero-bg="мой-эффект"] {
  background:
    /* статичные слои */
    #base-color;
}
[data-hero-bg="мой-эффект"]::before {
  content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none;
  /* анимируемые слои */
  animation: hb-моя-анимация 6s ease-in-out infinite;
}
@keyframes hb-моя-анимация { /* ... */ }
```

Стандарт префикса keyframe — `hb-` (hero-bg), чтобы избежать конфликтов.

---

## 8. Чек-лист перед публикацией

- [ ] CSS подключён в общий stylesheet
- [ ] HTML-блок имеет `data-hero-bg="..."` и `position: relative` (через общее правило)
- [ ] Контент внутри hero имеет `z-index: 2` или выше
- [ ] Текст контрастен (≥ 4.5:1) — белый или 80% white
- [ ] На мобиле проверено — анимация выключилась, фон читается
- [ ] `prefers-reduced-motion: reduce` уважается
- [ ] Один эффект на страницу (не нагромождать)

---

## 9. Лицензия

Эта библиотека эффектов разработана для проекта АйДаКемп (aidacamp.ru) и распространяется свободно. Используйте на любых сайтах. Указывать авторство не обязательно.

---

## Контакты автора

- Сайт-источник: https://aidacamp.ru
- Демо со всеми эффектами: https://aidacamp.ru/demo/hero-bg-mega
- Вопросы по интеграции: hello@codims.ru

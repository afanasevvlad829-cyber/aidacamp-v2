# Протокол вёрстки адаптивных HTML-презентаций

> Выведен из работы над `aidacamp-lanit-2026.html` / `aidacamp-mincifry-2026.html`  
> Дата: 2026-04-29 · Автор: рефакторинг с Claude

---

## ЧАСТЬ 1 — АРХИТЕКТУРА СЛАЙД-ДЕКИ

### Принцип работы

```
html, body { overflow: hidden; height: 100dvh; }

.deck  { position: relative; width: 100vw; height: 100dvh; }

.slide {
  position: absolute; inset: 0;
  opacity: 0; pointer-events: none;
  transition: opacity 0.4s ease;
  display: flex; flex-direction: column;
  overflow: hidden;              /* desktop: не скроллить */
  padding-bottom: clamp(68px, 10vh, 88px); /* место под nav */
}
.slide.active { opacity: 1; pointer-events: all; }
```

Слайды накладываются друг на друга через `position: absolute`.  
Видимый — только `.active`. Переключение через JS `goTo(n)`.

### JS — обязательные вещи

```js
function goTo(n) {
  slides[cur].classList.remove('active');
  cur = Math.max(0, Math.min(slides.length - 1, n));
  slides[cur].classList.add('active');
  slides[cur].scrollTop = 0;   // ← ОБЯЗАТЕЛЬНО: сброс скролла
  // обновить dots, счётчик...
}
```

**Без `scrollTop = 0`** пользователь возвращается на проскролленный слайд  
и видит середину контента, а не начало.

### Клавиатура + свайп

```js
// Клавиатура: →, ↓, Space = вперёд; ←, ↑ = назад
document.addEventListener('keydown', e => {
  if (['ArrowRight','ArrowDown',' '].includes(e.key)) { e.preventDefault(); go(1); }
  if (['ArrowLeft','ArrowUp'].includes(e.key))        { e.preventDefault(); go(-1); }
});

// Свайп: горизонталь > 50px = переключение слайда
let tx = 0;
document.addEventListener('touchstart', e => tx = e.touches[0].clientX, { passive: true });
document.addEventListener('touchend',   e => {
  const dx = e.changedTouches[0].clientX - tx;
  if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
}, { passive: true });
```

**Важно:** горизонтальный свайп конфликтует с горизонтальными каруселями внутри слайда.  
→ Поэтому карусели в презентациях **не использовать**. Только вертикальный скролл.

---

## ЧАСТЬ 2 — ДИЗАЙН-ТОКЕНЫ (ПЕРЕМЕННЫЕ)

### Обязательный набор

```css
:root {
  /* ── Цвета ── */
  --c-bg:           #0d1a2b;
  --c-surface:      #0f1e30;
  --c-card:         #162032;
  --c-border:       rgba(255,255,255,0.08);
  --c-text:         #ffffff;
  --c-muted:        rgba(255,255,255,0.65);
  --c-accent:       #ec7c00;
  --c-accent-dim:   rgba(236,124,0,0.10);
  --c-accent-line:  rgba(236,124,0,0.25);
  --c-green:        #22c55e;
  --c-green-dim:    rgba(34,197,94,0.08);
  --c-green-line:   rgba(34,197,94,0.20);

  /* ── Типографика ── */
  --fs-display: clamp(40px, 5vw, 72px);    /* hero H1 */
  --fs-h1:      clamp(32px, 4vw, 54px);    /* заголовки слайдов */
  --fs-h2:      clamp(22px, 2.5vw, 30px);  /* цифры, большие числа */
  --fs-h3:      20px;                       /* заголовки карточек */
  --fs-body:    18px;                       /* основной текст */
  --fs-label:   16px;                       /* бейджи, метки, таблицы */
  --fs-kicker:  13px;                       /* ALL-CAPS плашка над заголовком */
  --lh:         1.6;                        /* line-height по умолчанию */

  /* ── Отступы ── */
  --px:      clamp(20px, 7.5vw, 96px);   /* горизонт. padding страницы */
  --py-head: clamp(14px, 2.5vh, 40px);   /* блок заголовка сверху/снизу */
  --py-sec:  clamp(8px,  1.5vh, 20px);   /* gap между секциями */
  --gap:     clamp(8px,  1.2vh, 14px);   /* gap внутри сетки */

  /* ── Радиусы ── */
  --r-sm: 8px;    /* пилюли, мелкие элементы */
  --r-md: 14px;   /* карточки */
  --r-lg: 20px;   /* большие блоки, фото */

  /* ── Навигация ── */
  --nav-h: clamp(60px, 9vh, 80px);
}
```

### Запрещённые хардкоды

| ❌ Хардкод | ✅ Правильно |
|---|---|
| `padding: 64px 48px` | `var(--py-head) var(--px)` |
| `border-radius: 10px` | `var(--r-sm)` |
| `border-radius: 12px` | `var(--r-md)` |
| `font-size: 20px` (заголовок карточки) | `var(--fs-h3)` |
| `gap: 16px` | `var(--gap)` |
| `rgba(255,122,61,0.15)` | `var(--c-accent-dim)` |
| `rgba(255,122,61,0.40)` | `var(--c-accent-line)` |
| `padding-bottom: 88px` (под nav) | `clamp(68px, 10vh, 88px)` |

---

## ЧАСТЬ 3 — ТИПОГРАФИКА

### Desktop

| Элемент | Токен | Значение |
|---|---|---|
| Главный заголовок обложки | `--fs-display` | clamp(40–72px) |
| Заголовок слайда | `--fs-h1` | clamp(32–54px) |
| Большие цифры (64%, 3×) | `--fs-h2` | clamp(22–30px) |
| Заголовок карточки | `--fs-h3` | 20px |
| Основной текст | `--fs-body` | 18px |
| Лейблы, бейджи, таблицы | `--fs-label` | 16px |
| ALL-CAPS кикер | `--fs-kicker` | 13px |

### Mobile — НЕЛЬЗЯ опускать ниже

| Элемент | Минимум |
|---|---|
| Основной текст | **16px** |
| Заголовок карточки | **16px** |
| Лейблы, бейджи | **14px** |
| Вторичный текст (источники, даты) | **13px** |
| ALL-CAPS кикер | **12px** (uppercase визуально крупнее) |

### Что НЕЛЬЗЯ делать с типографикой

```
❌ Уменьшать шрифт чтобы контент "влез" на экран
❌ line-clamp чтобы не скроллить — пусть скроллится
❌ Обрезать текст через overflow: hidden без ellipsis
✅ Если не влезает — пусть слайд скроллится вертикально
✅ Минимум 16px для всего читаемого текста на мобилке
✅ line-height: 1.4–1.6 для нормального чтения
```

---

## ЧАСТЬ 4 — СЕТКИ И АДАПТИВНОСТЬ

### Как сетки растягиваются на десктопе

На десктопе карточки заполняют всю высоту слайда:
```css
.grid {
  flex: 1;             /* занимает всё свободное пространство */
  min-height: 0;       /* разрешает flex-элементу сжиматься */
  grid-auto-rows: 1fr; /* все строки одинаковой высоты */
  align-items: stretch;
}
```

### ОБЯЗАТЕЛЬНЫЙ сброс на мобилке

Если не сбросить — карточки растянутся на весь экран, контент не влезет:
```css
@media (max-width: 768px) {
  .grid {
    flex: unset;          /* ← сброс flex: 1 */
    min-height: unset;    /* ← сброс min-height: 0 */
    grid-auto-rows: auto; /* ← карточки по содержимому, не 1fr */
    align-items: start;   /* ← не stretch */
  }
}
```

### Сколько колонок на мобилке

| Контент | Desktop | Mobile | Почему |
|---|---|---|---|
| 6 статистических карточек | 3 кол | **2 кол** | короткие заголовки |
| 8 треков программы | 4 кол | **2 кол** | компактные карточки |
| 4 ценовые колонки | 4 кол | **2 кол** | данные читаемы в 2 кол |
| 6 форматов (длинные названия) | 3 кол | **1 кол** | "Корпоративные сертификаты" не влезет в 2 кол |
| 3 клиента | 3 кол | **2 кол** | 3-й занимает полную строку |
| 3 фото | 3 кол | **2 кол + 3-е span 2** | сохраняет пропорции |

### Правило выбора 1 vs 2 колонки на мобилке

```
Заголовок карточки > 20 символов → 1 колонка
Заголовок карточки ≤ 20 символов → 2 колонки

Пример:
  "Python"                    → 2 кол ✓
  "Корпоративные сертификаты" → 1 кол ✓ (иначе 3 строки)
```

---

## ЧАСТЬ 5 — МОБИЛЬНАЯ АДАПТАЦИЯ СЛАЙДОВ

### Общие правила

```css
@media (max-width: 768px) {
  :root {
    --fs-body:  16px;   /* минимум! */
    --fs-label: 14px;
    --fs-kicker: 12px;
    --py-head:  12px;
    --py-sec:   8px;
    --gap:      6px;
    --px:       16px;   /* фиксированный горизонт. padding */
  }

  /* Слайды скроллятся вертикально */
  .slide {
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    padding-bottom: calc(72px + env(safe-area-inset-bottom, 12px));
  }
}
```

### Split-слайд (фото + текст рядом) → стак

```css
@media (max-width: 768px) {
  .s-split { grid-template-columns: 1fr; }   /* было 1fr 1fr */

  .what-photo {
    height: 200px;   /* фиксированная высота фото сверху */
  }
  .what-photo img { object-position: center 25%; }
  .what-photo-overlay {
    /* Меняем направление градиента: снизу вверх */
    background: linear-gradient(0deg, var(--c-bg) 0%, transparent 60%);
  }
  .what-text {
    padding: var(--py-sec) var(--px) var(--py-head);
    justify-content: flex-start;  /* не center */
  }
}
```

### Контакты (абсолют. фото справа) → стак

```css
@media (max-width: 768px) {
  .contacts-slide { display: flex; flex-direction: column; }

  .contacts-bg {
    /* Убираем absolute позиционирование */
    position: relative; transform: none;
    right: auto; top: auto;
    height: 200px; width: 100%;
    overflow: hidden; flex-shrink: 0;
  }
  .contacts-bg img {
    width: 100%; height: 100%;
    object-fit: cover; object-position: center top;
    border-radius: 0;   /* на всю ширину, без радиуса */
  }

  .contacts-inner {
    max-width: 100%;   /* было max-width: 60% */
    padding: var(--py-head) var(--px) 0;
  }

  /* Контактные карточки: 2 колонки вместо flex-wrap */
  .contacts-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--gap);
  }
}
```

### Обложка (cover) на мобилке

```css
@media (max-width: 768px) {
  .cover-logo    { left: 12px; top: 10px; font-size: 15px; }
  .cover-partner {
    right: 44px; left: auto; top: 10px;
    max-width: calc(100% - 130px);   /* не перекрывает лого и кнопку */
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .cover-content { padding: 48px var(--px) 0; }  /* 48px = высота шапки */
}
```

### Короткие экраны (проекторы, ноутбуки)

```css
@media (max-height: 720px) {
  :root { --py-head: 12px; --py-sec: 6px; }
  .slide-h2  { font-size: clamp(20px, 3.5vw, 36px); }
  .why-card  { padding: 10px 14px; }
  .track-card { padding: 10px 12px; }
}
```

---

## ЧАСТЬ 6 — ЧТО НЕ ИСПОЛЬЗОВАТЬ

### ❌ Карусели в презентациях

```
Симптом: контент не влезает по высоте на мобилке
Соблазн: сделать горизонтальную карусель
Проблема:
  - touch swipe слайда конфликтует с touch swipe карусели
  - пользователь не видит сколько карточек внутри
  - большое пустое пространство под каруселью
  - overflow-y: hidden блокирует вертикальный скролл

Решение: уменьшить колонки (4→2, 3→1) + overflow-y: auto
```

### ❌ overflow-y: hidden на слайдах

```css
❌ .some-slide { overflow-y: hidden; }  /* убивает скролл на мобилке */
✅ .some-slide { overflow-y: auto; }    /* скроллится если надо */
```

### ❌ Inline hover через JS

```html
❌ <a onmouseover="this.style.borderColor='rgba(255,122,61,0.4)'"
      onmouseout="this.style.borderColor='rgba(255,255,255,0.08)'">

✅ CSS:
.contact-c:hover { border-color: var(--c-accent-line); }
```

### ❌ Дублирующиеся правила

Если в мобильном @media одно правило написано дважды — удалить дубль.  
Частая ошибка при копи-пасте переопределений.

---

## ЧАСТЬ 7 — СПЕЦИФИКА БРАУЗЕРОВ

### iOS Safari: высота экрана

```css
/* 100vh на iOS = высота с учётом скрытого адресбара → контент под адресбаром */
/* 100dvh (dynamic) = реальная видимая высота в данный момент */

.deck  { height: 100vh; height: 100dvh; }  /* fallback + современный */
html, body { height: 100%; }
```

### Safari: backdrop-filter

```css
/* Всегда оба варианта */
.nav-btn {
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);  /* Safari требует префикс */
}
```

### Safe Area (iPhone с чёлкой)

```css
/* Навигация */
.nav {
  bottom: max(8px, env(safe-area-inset-bottom, 0px) + 6px);
}

/* Padding слайда */
.slide {
  padding-bottom: calc(72px + env(safe-area-inset-bottom, 12px));
}
```

### Accessibility

```css
/* Не крутить анимации тем, кто их отключил в системе */
@media (prefers-reduced-motion: reduce) {
  .slide { transition: none; }
}
```

---

## ЧАСТЬ 8 — АУДИТ ПЕРЕД ДЕПЛОЕМ

### Чеклист CSS

- [ ] Все `padding`/`gap`/`border-radius` через `var(--*)`
- [ ] Нет голых цветов `rgba(255,122,61,...)` — только токены
- [ ] `--fs-body` на мобилке ≥ `16px`
- [ ] `flex: unset; min-height: unset; grid-auto-rows: auto` на всех grid в мобилке
- [ ] `overflow-y: auto` (не `hidden`) на `.slide` в мобилке
- [ ] `height: 100dvh` рядом с `height: 100vh`
- [ ] `-webkit-backdrop-filter` рядом с `backdrop-filter`
- [ ] `prefers-reduced-motion` добавлен
- [ ] Нет дублирующихся CSS-правил

### Чеклист HTML/JS

- [ ] Нет `onmouseover`/`onmouseout` атрибутов
- [ ] `goTo()` делает `slides[cur].scrollTop = 0`
- [ ] Комментарии `<!-- SLIDE N -->` совпадают с реальным порядком
- [ ] Нет `✓`, `★`, `🔥` в UI-элементах — только SVG/Bootstrap Icons

### Как проверить

```bash
# Скриншоты всех слайдов на мобилке 390x844
ssh server "node /opt/browser-agent/lanit-slides.js"
# Смотреть: не обрезается ли контент, читаем ли шрифт

# PDF всех слайдов (9 страниц, 16:9)
ssh server "node /opt/browser-agent/mincifry-pdf.js"
```

---

## ЧАСТЬ 9 — PDF ИЗ СЛАЙД-ДЕКИ

Стандартный `page.pdf()` = только 1 активный слайд.

Правильный подход: по слайду отдельно → merge через `pdfunite`:

```javascript
const SLIDES = 9;
const W = 1440, H = 810;  // 16:9 горизонтально

for (let i = 0; i < SLIDES; i++) {
  await page.evaluate((idx) => window.goTo(idx), i);
  await page.waitForTimeout(500);
  await page.pdf({
    path: `/tmp/slide_${i}.pdf`,
    width: `${W}px`, height: `${H}px`,
    printBackground: true,
    margin: { top: '0', bottom: '0', left: '0', right: '0' },
  });
}

execSync(`pdfunite /tmp/slide_*.pdf final.pdf`);
```

---

## ЧАСТЬ 10 — ТИПИЧНЫЕ ОШИБКИ И РЕШЕНИЯ

| Симптом | Причина | Решение |
|---|---|---|
| Мобилка не скроллит слайд | `overflow-y: hidden` на слайде или родителе | Убрать, поставить `auto` |
| Карточки растянуты на весь экран | Забыли сброс `flex: 1` / `grid-auto-rows: 1fr` | Добавить `flex: unset; grid-auto-rows: auto` |
| Шрифт нечитаемый | `font-size < 16px` на мобилке | Поднять до минимума 16px |
| Свайп переключает слайд вместо карусели | Горизонтальная карусель конфликтует с глобальным touch listener | Убрать карусель, сделать 2-колоночную сетку |
| Контент уходит под навигацию | `padding-bottom` не учитывает высоту nav | `padding-bottom: calc(72px + env(safe-area-inset-bottom, 12px))` |
| PDF только 1 страница | Стандартный `page.pdf()` снимает только активный слайд | Цикл по слайдам + pdfunite |
| Контакт-карточки без hover | Inline `onmouseover` не работает правильно | CSS `.contact-c:hover { border-color: var(--c-accent-line); }` |
| Нижняя часть слайда под адресбаром iOS | `100vh` не учитывает динамический адресбар | Добавить `height: 100dvh` |
| Возврат на слайд показывает середину | Нет сброса скролла в `goTo()` | `slides[cur].scrollTop = 0` |


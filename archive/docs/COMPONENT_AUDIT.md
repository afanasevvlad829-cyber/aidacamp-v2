# Архитектурный аудит Astro компонентов — монолит, модульность, хардкод

**Дата:** 24.04.2026  
**Статус:** Критические проблемы найдены

---

## 🔴 КРИТИЧЕСКИЕ ПРОБЛЕМЫ

### 1. Hero.astro — МОНОЛИТНЫЙ КОМПОНЕНТ (418 строк)

**Файл:** `src/components/Hero.astro`

#### Проблема 1.1: Inline скрипт с 150+ строк хардкода (линии 253–400)

```javascript
// ВСЕ эти 40+ вариантов жёстко закодированы в компоненте
variants = {
  camp:        { title: '...', subtitle: '...' },
  camp2026:    { title: '...', subtitle: '...' },
  result:      { title: '...', subtitle: '...' },
  // ... ещё 37 вариантов
  crm_leads:   { title: '...', subtitle: '...' },
}
```

**Последствия:**
- ❌ Любое изменение текста требует открытия Hero.astro и правки JS
- ❌ Сложно синхронизировать с маркетингом (текст живёт в разных местах)
- ❌ Для A/B тестов нужно редактировать JS-код, а не конфиг
- ❌ Git история засоряется при каждой правке маркетинга

**Должно быть:**  
`src/data/hero-variants.json` или `src/data/hero-variants.ts` — единственный источник истины

```json
{
  "camp": {
    "title": "Летний лагерь в Подмосковье...",
    "subtitle": "IT, бассейн, проживание..."
  }
}
```

---

#### Проблема 1.2: Микс мобильного и десктопного (две разные верстки)

```astro
<!-- MOBILE HERO (линии 24–125) -->
<div class="relative w-full bg-dark-navy md:hidden ...">

<!-- DESKTOP HERO (линии 127–248) -->
<div class="relative hidden ... md:block ...">
```

**Последствия:**
- ❌ Дублирование кода: одна и та же структура в двух местах
- ❌ Сложнее найти ошибку (нужно проверять обе версии)
- ❌ Изменение логики требует редактирования в двух местах
- ❌ 100+ строк мобильной версии можно выделить в отдельный компонент

**Должно быть:**
- `src/components/hero/HeroMobile.astro` — только мобильная версия
- `src/components/hero/HeroDesktop.astro` — только десктопная версия
- `src/components/Hero.astro` — wrapper, который выбирает нужный компонент через CSS display

```astro
<Hero.mobile />
<Hero.desktop />
```

---

#### Проблема 1.3: Event listeners внутри компонента (линии 402–417)

```javascript
// Тесно привязано к конкретным ID и структуре
document.getElementById('hero-callback-btn')?.addEventListener('click', () => {
  var m = document.getElementById('shiftBookModal'); if (m) m.showModal();
});

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('[data-feature]').forEach(function(btn) {
    // ...
  });
});
```

**Последствия:**
- ❌ Event listeners выполняются ПОСЛЕ того, как Astro отрендерил компонент
- ❌ Если модаль не загружена или ID не совпадает — обработчик молча падает
- ❌ Сложнее тестировать (логика размазана между компонентом и JS)
- ❌ `DOMContentLoaded` может уже произойти ко времени выполнения скрипта

**Должно быть:**  
Использовать специальный скрипт-модуль для инициализации глобальной логики, или перейти на встроенные обработчики событий Astro.

---

### 2. HeroModals.astro — ДУБЛИРОВАННЫЕ МОДАЛИ (374 строк)

**Файл:** `src/components/HeroModals.astro`

#### Проблема 2.1: Идентичная структура 4 модалей, только текст отличается

**Equipment Modal (строки 28–90):**
```astro
<dialog id="equipmentModal" class="fixed inset-0 m-auto w-[min(92vw,460px)] ...">
  <div class="p-6">
    <div class="flex items-start justify-between gap-3 mb-5">
      <div class="flex items-center gap-3">
        <i class="bi bi-laptop ..."></i>
        <h3>Почему ноутбук не нужен</h3>
      </div>
      <button type="button" data-equip-close>X</button>
    </div>
    <!-- Контент -->
  </div>
</dialog>
```

**Python Modal (строки 92–153):**
```astro
<dialog id="pythonModal" class="fixed inset-0 m-auto w-[min(92vw,460px)] ...">
  <div class="p-6">
    <div class="flex items-start justify-between gap-3 mb-5">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 ... bg-blue-100">
          <i class="bi bi-code-slash ..."></i>
        </div>
        <h3>Python</h3>
      </div>
      <button type="button" data-python-close>X</button>
    </div>
    <!-- Контент -->
  </div>
</dialog>
```

**Похоже для AI и Pool модалей (линии 204–310)**

**Последствия:**
- ❌ 374 строк для того, что можно сделать за 100 строк
- ❌ Изменение стиля модали требует редактирования в 4 местах
- ❌ Легко случайно изменить класс в одной модали и забыть в других
- ❌ Сложнее ддобавить новый модал (нужно копировать-вставить и менять 10 строк)

**Должно быть:**  
Компонент `FeatureModal.astro` с props, который рендерит любой модал:

```astro
---
import FeatureModal from './FeatureModal.astro';

const features = [
  {
    id: 'python',
    icon: 'bi-code-slash',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    title: 'Python',
    contentBg: 'bg-blue-50',
    whatIs: '...',
    whyMatters: [...],
    whatWeDo: '...',
  },
  {
    id: 'minecraft',
    // ...
  },
  // ...
];
---

{features.map(f => <FeatureModal {...f} />)}
```

Тогда HeroModals.astro будет 50 строк вместо 374.

---

#### Проблема 2.2: Хардкод контента всех 4 модалей

**Python модал (строки 92–153):**
```astro
<p class="text-[14px] font-semibold text-slate-800 mb-3">Что такое Python?</p>
<p class="text-[14px] text-slate-600 leading-[1.6] mb-5">
  Это один из самых популярных языков программирования. Его легко учить, и на нём работают везде — от веб-приложений до нейросетей.
</p>

<p class="text-[14px] font-semibold text-slate-800 mb-3">Зачем это нужно детям?</p>
<ul class="space-y-2.5 mb-5">
  <li class="flex items-start gap-3">
    <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-orange-500"><i class="bi bi-check-lg text-[14px]" aria-hidden="true"></i></span>
    <p class="text-[14px] text-slate-600"><span class="font-semibold text-slate-800">Популярность:</span> Python используют Google, Netflix, SpaceX...</p>
  </li>
  <!-- Ещё 2 пункта -->
</ul>

<div class="rounded-[14px] bg-blue-50 px-4 py-3.5">
  <p class="text-[14px] font-semibold text-slate-800 mb-2">Что мы с этим делаем</p>
  <p class="text-[14px] text-slate-700 leading-[1.5]">
    Дети пишут свой первый код на Python...
  </p>
</div>
```

**Последствия:**
- ❌ Этот контент невозможно редактировать без открытия компонента
- ❌ Маркетинг не может обновить текст самостоятельно
- ❌ Сложнее переводить на другие языки

**Должно быть:**  
`src/data/hero-features.json`:
```json
{
  "python": {
    "title": "Python",
    "whatIs": "Это один из самых популярных языков программирования...",
    "whyMatters": [
      {
        "title": "Популярность",
        "description": "Python используют Google, Netflix, SpaceX..."
      },
      {
        "title": "Простота",
        "description": "Синтаксис близок к человеческому языку..."
      },
      {
        "title": "Перспективы",
        "description": "AI, data science, backend — везде Python..."
      }
    ],
    "whatWeDo": "Дети пишут свой первый код на Python..."
  }
}
```

---

### 3. LeadForm, TaxCalculator, SchemaOrg и другие компоненты

**Размеры:**
```
226 строк: LeadForm.astro
288 строк: TaxCalculator.astro
321 строк: SchemaOrg.astro
327 строк: Shifts.astro
```

**Проблемы:**
- ❌ LeadForm смешивает UI, валидацию, API вызовы, стили — 226 строк в одном файле
- ❌ SchemaOrg — 321 строка чистого hardcoded JSON структура
- ❌ TaxCalculator содержит бизнес-логику расчётов, привязанную к компоненту

**Должно быть:**
- `LeadForm.astro` (только UI, ~80 строк)
- `src/lib/form-validation.ts` (валидация, 50 строк)
- `src/lib/api-client.ts` (API вызовы, 40 строк)
- `src/styles/forms.css` (стили форм, 100 строк)

---

## 📊 СТАТИСТИКА ПРОБЛЕМ

| Категория | Count | Сложность |
|---|---|---|
| Монолитные компоненты (250+ строк) | 8 | 🔴 Критическая |
| Hardcoded контент | 15+ мест | 🟠 Высокая |
| Дублированный код | 4+ паттерна | 🟠 Высокая |
| Inline скрипты с бизнес-логикой | 5 компонентов | 🟠 Высокая |
| Смешанные мобильные/десктопные версии | 6 компонентов | 🟡 Средняя |

---

## 🔧 ПЛАН РЕФАКТОРИНГА

### Phase 1: Экстракт данных (1–2 дня)

1. **Hero variants** → `src/data/hero-variants.json`
   - 40+ вариантов titles/subtitles
   - Одна функция для загрузки вместо inline-скрипта

2. **Feature modals** → `src/data/hero-features.json`
   - Python, Minecraft, AI, Pool информация
   - Одна общая структура для всех модалей

3. **Contact links, social links** → `src/data/socials.ts`
   - Уже частично в contacts.ts, но разбросано

### Phase 2: Компонентизация (2–3 дня)

1. **Hero компонент:**
   - `Hero.astro` → wrapper (выбор мобильного/десктопного)
   - `hero/Mobile.astro` → только мобильная версия
   - `hero/Desktop.astro` → только десктопная версия

2. **Модали:**
   - `components/FeatureModal.astro` — generic компонент с props
   - `HeroModals.astro` — только loop через data

3. **LeadForm:**
   - `forms/LeadForm.astro` — только UI
   - `lib/form-validation.ts` — валидация
   - `lib/form-api.ts` — API вызовы

### Phase 3: Логика инициализации (1 день)

1. Глобальный скрипт для event listeners:
   - `src/scripts/init-modals.ts`
   - `src/scripts/init-forms.ts`

2. Проверка что всё работает в dev и prod

### Phase 4: Тестирование и документация (1 день)

1. Verify all features work
2. Update component documentation
3. Add TypeScript types for data structures

---

## 📝 ПРИМЕРЫ РЕФАКТОРИНГА

### Пример 1: HeroModals → FeatureModal

**ДО (374 строк — дублирование):**
```astro
<!-- Модал 1 -->
<dialog id="pythonModal">
  <div class="p-6">
    <div class="flex items-start justify-between">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 ... bg-blue-100">
          <i class="bi bi-code-slash"></i>
        </div>
        <h3>Python</h3>
      </div>
      <button data-python-close>×</button>
    </div>
    <!-- 60 строк контента -->
  </div>
</dialog>

<!-- Модал 2 -->
<dialog id="minecraftModal">
  <div class="p-6">
    <div class="flex items-start justify-between">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 ... bg-green-100">
          <i class="bi bi-box"></i>
        </div>
        <h3>Minecraft</h3>
      </div>
      <button data-minecraft-close>×</button>
    </div>
    <!-- 60 строк контента (копирование) -->
  </div>
</dialog>
<!-- ... 2 модала ещё -->
```

**ПОСЛЕ (60 строк + JSON):**

`src/components/FeatureModal.astro`:
```astro
---
export interface Props {
  id: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  contentBg: string;
  whatIs: string;
  whyMatters: Array<{ title: string; description: string }>;
  whatWeDo: string;
}

const { id, icon, iconBg, iconColor, title, contentBg, whatIs, whyMatters, whatWeDo } = Astro.props;
const closeAttr = `data-${id}-close`;
---

<dialog {id} class="fixed inset-0 m-auto w-[min(92vw,460px)] rounded-[20px] border-0 outline-none bg-white p-0 shadow-[0_24px_64px_rgba(15,23,42,0.22)] backdrop:bg-black/45">
  <div class="p-6">
    <div class="flex items-start justify-between gap-3 mb-5">
      <div class="flex items-center gap-3">
        <div class={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
          <i class={`bi ${icon} text-[20px] ${iconColor}`} aria-hidden="true"></i>
        </div>
        <h3 class="text-[18px] font-bold text-slate-900 leading-[1.25]">{title}</h3>
      </div>
      <button type="button" {closeAttr}
        class="shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition outline-none focus:outline-none"
        aria-label="Закрыть">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <p class="text-[14px] font-semibold text-slate-800 mb-3">Что такое {title}?</p>
    <p class="text-[14px] text-slate-600 leading-[1.6] mb-5">{whatIs}</p>

    <p class="text-[14px] font-semibold text-slate-800 mb-3">Зачем это нужно детям?</p>
    <ul class="space-y-2.5 mb-5">
      {whyMatters.map(item => (
        <li class="flex items-start gap-3">
          <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-orange-500">
            <i class="bi bi-check-lg text-[14px]" aria-hidden="true"></i>
          </span>
          <p class="text-[14px] text-slate-600">
            <span class="font-semibold text-slate-800">{item.title}:</span> {item.description}
          </p>
        </li>
      ))}
    </ul>

    <div class={`rounded-[14px] ${contentBg} px-4 py-3.5`}>
      <p class="text-[14px] font-semibold text-slate-800 mb-2">Что мы с этим делаем</p>
      <p class="text-[14px] text-slate-700 leading-[1.5]">{whatWeDo}</p>
    </div>
  </div>
</dialog>

<script is:inline>
  document.getElementById('{id}')?.addEventListener('close', () => {
    console.log('{id} modal closed');
  });
  
  const closeBtn = document.querySelector('[data-{id}-close]');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('{id}')?.close();
    });
  }
</script>
```

`src/data/hero-features.json`:
```json
{
  "python": {
    "icon": "bi-code-slash",
    "iconBg": "bg-blue-100",
    "iconColor": "text-blue-600",
    "title": "Python",
    "contentBg": "bg-blue-50",
    "whatIs": "Это один из самых популярных языков программирования...",
    "whyMatters": [
      {
        "title": "Популярность",
        "description": "Python используют Google, Netflix, SpaceX..."
      },
      {
        "title": "Простота",
        "description": "Синтаксис близок к человеческому языку..."
      },
      {
        "title": "Перспективы",
        "description": "AI, data science, backend — везде Python..."
      }
    ],
    "whatWeDo": "Дети пишут свой первый код на Python..."
  }
  // ... minecraft, ai, pool
}
```

`src/components/HeroModals.astro`:
```astro
---
import BookingInfoModal from './BookingInfoModal.astro';
import FeatureModal from './FeatureModal.astro';
import { HERO_FEATURES } from '../data/hero-features.json';

interface Feature {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  contentBg: string;
  whatIs: string;
  whyMatters: Array<{ title: string; description: string }>;
  whatWeDo: string;
}
---

<BookingInfoModal />

{Object.entries(HERO_FEATURES).map(([id, feature]) => (
  <FeatureModal id={id} {...feature} />
))}
```

**Результат:**
- 374 строк → 60 строк компонента + 100 строк JSON
- Легко добавить новый модал (одна запись в JSON)
- Контент в одном месте, стиль в другом
- TypeScript-safe через props

---

## 🎯 ПРИОРИТЕТ

### 🔴 Критический (неделя 1)
1. Экстракт hero-variants в JSON (Hero.astro станет 250 строк)
2. Рефакторинг HeroModals → FeatureModal (374 → 60 строк)
3. Экстракт hero-features в JSON

### 🟠 Высокий (неделя 2)
4. Разбить LeadForm на компоненты + lib
5. Разбить Hero на Mobile/Desktop подкомпоненты

### 🟡 Средний (неделя 3)
6. Экстракт бизнес-логики из других больших компонентов
7. Документация и TypeScript types

---

## ✅ КРИТЕРИИ УСПЕХА

После рефакторинга:
- [ ] Все компоненты < 200 строк
- [ ] Все hardcoded контент в `src/data/`
- [ ] Нет дублирования кода (DRY principle)
- [ ] Event listeners инициализируются в отдельных скриптах
- [ ] Все данные типизированы (TypeScript interfaces)
- [ ] npm run build проходит без ошибок
- [ ] Функциональность не изменилась

---

## 📚 СВЯЗАННЫЕ ДОКУМЕНТЫ

- `AUDIT.md` — общая архитектура backend/data flow
- `.claude/memory/reference_site_structure.md` — структура проекта
- `src/data/contacts.ts` — где уже хранятся некоторые константы

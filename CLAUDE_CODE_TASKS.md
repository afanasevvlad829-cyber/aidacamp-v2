# Задачи Claude Code — 16 апреля 2026

## СРОЧНО: Обновить H1-подмены в Hero.astro

Файл: `src/components/Hero.astro` → объект `variants`

### Изменить существующие ключи:

```js
edu: {
  title: 'Лето без телефона — возможно',
  subtitle: 'Дети создают IT-проекты и живут в реальном мире. Смены от 2 недель.'
},
books: {
  title: 'Лето с пользой — это реально',
  subtitle: 'Дети учатся программировать и делают настоящие проекты. Без телефонов. 66 км.'
},
result: {
  title: 'Уехал геймером — вернулся разработчиком',
  subtitle: 'Опыт сложных задач, ошибок и решений. Ребёнок уезжает с ощущением: я справляюсь сам.'
},
parents: {
  title: 'Две недели без «мама, скучно»',
  subtitle: 'Ребёнок в IT-лагере: проекты, команда, бассейн. Без телефонов. 66 км от Москвы.'
},
```

### Деплой: dev → проверить → prod
```bash
./scripts/deploy.sh dev
# проверить: https://dev.aidacamp.ru/?utm_content=edu
# проверить: https://dev.aidacamp.ru/?utm_content=books
# проверить: https://dev.aidacamp.ru/?utm_content=result
# проверить: https://dev.aidacamp.ru/?utm_content=parents
./scripts/deploy.sh prod
```

---

## Обновить тексты объявлений Директ (если SSH недоступен через Claude)

```python
import json, urllib.request
TOKEN = # из /opt/etl/.env → DIRECT_TOKEN

ads = [
    {'Id': 17678933177, 'TextAd': {'Title': 'Уехал геймером — вернулся разработчиком', 'Text': 'Дети создают IT-проекты и живут в реальном мире. Смены от 2 недель.', 'Title2': 'Лагерь 66 км от Москвы', 'Href': 'https://aidacamp.ru/'}},
    {'Id': 17678933182, 'TextAd': {'Title': 'Лето без телефона — возможно', 'Text': 'Дети создают IT-проекты и живут в реальном мире. Смены от 2 недель.', 'Title2': 'Лагерь 66 км от Москвы', 'Href': 'https://aidacamp.ru/'}},
    {'Id': 17678933183, 'TextAd': {'Title': 'Лето с пользой — это реально', 'Text': 'Дети учатся программировать и делают настоящие проекты. Без телефонов. 66 км.', 'Title2': 'Лагерь для детей 8–14 лет', 'Href': 'https://aidacamp.ru/'}},
]
payload = json.dumps({'method': 'update', 'params': {'Ads': ads}})
req = urllib.request.Request('https://api.direct.yandex.com/json/v5/ads', data=payload.encode(),
    headers={'Authorization': f'Bearer {TOKEN}', 'Client-Login': 'kv145', 'Content-Type': 'application/json'})
print(json.loads(urllib.request.urlopen(req, timeout=15).read()))
```

## Добавить корректировки ставок РСЯ (708698819)

```python
import json, urllib.request
TOKEN = # из /opt/etl/.env → DIRECT_TOKEN

mods = [
    {'CampaignId': 708698819, 'DesktopAdjustment': {'BidModifier': 125}},
    {'CampaignId': 708698819, 'DemographicsAdjustments': [{'Gender':'GENDER_FEMALE','Age':'AGE_35_44','BidModifier':130}]},
    {'CampaignId': 708698819, 'DemographicsAdjustments': [{'Gender':'GENDER_FEMALE','Age':'AGE_45_54','BidModifier':120}]},
    {'CampaignId': 708698819, 'MobileAdjustment': {'BidModifier': 70}},
]
for m in mods:
    payload = json.dumps({'method': 'add', 'params': {'BidModifiers': [m]}})
    req = urllib.request.Request('https://api.direct.yandex.com/json/v5/bidmodifiers', data=payload.encode(),
        headers={'Authorization': f'Bearer {TOKEN}', 'Client-Login': 'kv145', 'Content-Type': 'application/json'})
    print(json.loads(urllib.request.urlopen(req, timeout=15).read()))
```

## Выключить объявление 17678933179

```python
payload = json.dumps({'method': 'suspend', 'params': {'SelectionCriteria': {'Ids': [17678933179]}}})
req = urllib.request.Request('https://api.direct.yandex.com/json/v5/ads', data=payload.encode(),
    headers={'Authorization': f'Bearer {TOKEN}', 'Client-Login': 'kv145', 'Content-Type': 'application/json'})
print(json.loads(urllib.request.urlopen(req, timeout=15).read()))
```

---

# Задачи — 17 апреля 2026

## 1а. Блок «Мягкий вход в IT» на главной странице

**Место:** между блоком «Телефонная система» и блоком «Смены».

**Файл:** `src/components/SoftStart.astro` (новый) → подключить в `index.astro`

**Текст (финальный, утверждён):**
```
Опыт программирования не нужен.
Каждый сам выберет глубину — попробует и поймёт.
Не понравится за первые 3 дня — вернём 50%.
```

**Требования:**
- Минималистичный стиль, светлый фон
- Не ломать ритм страницы — лёгкий, ненавязчивый блок
- Выдержать стиль в духе существующего текста «Опыт программирования не нужен» в блоке программы

---

## 1б. Страница `/попробовать` — посадочная для РСЯ-группы rsya_softstart

**Назначение:** посадочная для РСЯ-рекламы. Аудитория — родители которые сомневаются нужен ли ребёнку IT.
Поискового спроса нет (проверено в Wordstat: 38 показов/год по МО) — страница только под РСЯ-трафик, **не SEO**.

**URL:** `https://aidacamp.ru/попробовать`
**UTM:** `utm_content=softstart&utm_campaign=rsya&utm_medium=cpc&utm_source=yandex`

---

### Файл: `src/pages/попробовать.astro`

Паттерн — как `src/pages/lager-bez-telefonov.astro`.
Переиспользовать: `LandingLayout`, `LandingHero`, `LandingTwoCol`, `Shifts`, `LeadForm`, `Gallery`, `FAQ`, `ShiftBookModal`.

```astro
---
import '../styles/global.css';
import LandingLayout from '../layouts/LandingLayout.astro';
import LandingHero from '../components/LandingHero.astro';
import LandingTwoCol from '../components/LandingTwoCol.astro';
import Shifts from '../components/Shifts.astro';
import FAQ from '../components/FAQ.astro';
import LeadForm from '../components/LeadForm.astro';
import Gallery from '../components/Gallery.astro';
import ShiftBookModal from '../components/shifts/ShiftBookModal.astro';

const sections = [
  {
    h2: "Опыт программирования не нужен",
    text: "Большинство детей приезжают без единой строчки кода за плечами — и это норма. Программа построена так, чтобы начать с нуля и за смену дойти до работающего проекта. Ребёнок не будет чувствовать себя отстающим — все начинают с одной точки."
  },
  {
    h2: "Каждый сам выбирает глубину",
    text: "Лагерь — это не школа и не кружок. Нет оценок, нет домашних заданий, нет принуждения. Хочет погрузиться глубже — преподаватель поможет. Хочет сделать попроще и больше времени провести с командой — никто не давит. Ребёнок сам чувствует свой темп.",
    list: [
      "Занятия по расписанию, но без жёсткой нормы «должен успеть»",
      "Преподаватель рядом — не над душой",
      "Проект собирается в командном темпе, не индивидуальном"
    ]
  },
  {
    h2: "Это не про IT. Это про то, чтобы попробовать",
    text: "Мы не готовим профессиональных программистов. Мы даём ребёнку опыт — сделать что-то своими руками, понять как устроены игры и приложения, почувствовать что он способен создавать, а не только потреблять. Дальше он сам решит — продолжать или нет."
  },
  {
    h2: "Не понравится — вернём деньги",
    text: "Если за первые 3 дня ребёнку некомфортно — возвращаем 50% стоимости без вопросов. Это честно: мы уверены в формате, но понимаем что не всем подходит. Риск минимален — попробовать стоит."
  }
];
---

<LandingLayout
  title="Попробовать IT-лагерь — без опыта, без давления | АйДаКемп"
  description="Ребёнок никогда не программировал? Это норма. В АйДаКемп каждый начинает с нуля. Опыт не нужен — нужно только желание попробовать. Не понравится — вернём 50%."
  h1="Не знает, нужен ли ему IT? Пусть попробует."
  canonical="https://aidacamp.ru/попробовать"
  noindex={true}
>
  <LandingHero slot="hero"
    h1="Не знает, нужен ли ему IT? Пусть попробует."
    subtitle="Лагерь — это не кружок и не экзамен. Ребёнок сам выбирает глубину. Уедет с проектом или с друзьями — в любом случае не зря."
    breadcrumb="Попробовать IT"
    keywords={[
      "Опыт программирования не нужен — начинают с нуля",
      "Каждый сам выбирает нагрузку, никакого давления",
      "Не понравится за 3 дня — вернём 50% стоимости"
    ]}
  />
  <LandingTwoCol sections={sections} />
  <Gallery />
  <Shifts />
  <FAQ />
  <ShiftBookModal />
  <section id="lead-form" class="mx-auto max-w-[1312px] px-4 py-10">
    <LeadForm variant="mobile" />
  </section>
</LandingLayout>
```

**Важно:**
- `noindex={true}` — страница не для SEO, только для рекламы. Убедиться что `LandingLayout` поддерживает этот проп. Если нет — добавить в `<head>`: `<meta name="robots" content="noindex, nofollow">`
- Нет `RelatedPages` — не уводить трафик с конверсионной страницы
- Нет `heroImage` — без фонового фото (или поставить фото outdoor.jpg как на главной)

**Деплой:**
```bash
./scripts/deploy.sh dev
# проверить: https://dev.aidacamp.ru/попробовать
./scripts/deploy.sh prod
```

---

## 2. Раздел «Менторы» на сайте

**Компонент:** `src/components/Mentors.astro`
**Данные:** массив `{name, title, company, photo}`
**Контент:** Влад предоставит список людей и фото отдельно.

---

## 3. Видеообращение Дарьи

**Место:** после Hero или в блоке «О лагере»
**Компонент:** VideoFacade.astro (уже есть, с отложенной загрузкой)
**Статус:** видео ещё не снято — подготовить место заранее.

---

## 4. Мерч за друзей — подсветить раньше в воронке

**Место:** тизер в блоке выбора смен, до заявки.
**Текст:** «Едете вдвоём с другом? Каждый получит мерч в подарок»
**Фото:** `/images/merch-hoodie.avif`
**UTM:** `utm_source=refer&utm_medium=friend&utm_campaign=merch`

**Механика «шестая путёвка бесплатно»:** уточнить условия у Влада → оформить отдельным блоком.

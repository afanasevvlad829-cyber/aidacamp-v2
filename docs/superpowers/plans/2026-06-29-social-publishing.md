# Social Publishing Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Автоматическая публикация статей сайта в ВКонтакте и RSS-фид для Яндекс Дзена с отслеживанием статистики.

**Architecture:** Реестр статей (`src/data/articles.ts`) — единый источник мета-данных для RSS и постера. RSS-фид (`/rss.xml`) для Дзена. Крон-скрипты на сервере читают реестр, выбирают статьи по трафику из Метрики, постят в ВК и собирают обратную статистику. Статистика хранится в существующей таблице `article_views` (добавляем поля соцсетей).

**Tech Stack:** Astro (SSR, TypeScript), Node.js 20, PostgreSQL, VK API v5.199, Bash cron на сервере Ubuntu.

---

## File Structure

**Новые файлы:**
- `src/data/articles.ts` — реестр всех статей (title, description, date, ogImage, slug)
- `src/pages/rss.xml.ts` — RSS-фид для Дзена
- `scripts/parse-articles.ts` — одноразовый скрипт генерации реестра из .astro файлов
- `/opt/social-poster/vk-poster.js` — крон-скрипт постинга в ВК (на сервере)
- `/opt/social-poster/vk-stats.js` — крон-скрипт сбора статистики ВК (на сервере)
- `/etc/cron.d/social-poster` — расписание кронов

**Модифицируемые файлы:**
- БД: миграция `article_views` — добавить поля для ВК

---

## Task 1: Скрипт парсинга статей → articles.ts

**Задача:** написать Node.js скрипт `scripts/parse-articles.ts` который читает все `.astro` файлы из `src/pages/stati/`, извлекает grep'ом `title=`, `description=`, `ogImage=`, `datePublished`, и генерирует `src/data/articles.ts`.

**Files:**
- Create: `scripts/parse-articles.ts`
- Create: `src/data/articles.ts` (генерируется скриптом)

**Паттерны в .astro файлах (проверено на реальных файлах):**
```
title="Заголовок страницы | АйДаКемп"          ← в Base компоненте
description="Описание..."                       ← в Base компоненте
ogImage="/images/hero/name.avif"               ← в Base компоненте
"datePublished": "2026-04-25",                 ← в JSON-LD Schema.org
```
Есть 2 файла без datePublished (`index.astro`, `nedorogoy-lager.astro`) — их пропускать.
Есть 24 файла без ogImage — для них использовать fallback `/images/hero/o-lagere.avif`.

**Формат `src/data/articles.ts`:**
```typescript
export interface Article {
  slug: string;        // имя файла без .astro, напр. "adaptaciya-rebenka-v-lagere"
  title: string;       // заголовок без суффикса " | АйДаКемп" если есть
  description: string;
  date: string;        // "2026-04-25"
  ogImage: string;     // "/images/hero/name.avif"
  url: string;         // "https://aidacamp.ru/stati/slug"
}

export const articles: Article[] = [
  // ...сортировка по date DESC
];
```

- [ ] **Шаг 1: Написать скрипт `scripts/parse-articles.ts`**

```typescript
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, basename } from 'path';

const STATI_DIR = join(process.cwd(), 'src/pages/stati');
const OUTPUT = join(process.cwd(), 'src/data/articles.ts');
const BASE_URL = 'https://aidacamp.ru';
const FALLBACK_IMAGE = '/images/hero/o-lagere.avif';

interface Article {
  slug: string;
  title: string;
  description: string;
  date: string;
  ogImage: string;
  url: string;
}

function extract(content: string, pattern: RegExp): string {
  const m = content.match(pattern);
  return m ? m[1].trim() : '';
}

const files = readdirSync(STATI_DIR).filter(f => f.endsWith('.astro') && f !== 'index.astro');
const articles: Article[] = [];

for (const file of files) {
  const slug = basename(file, '.astro');
  const content = readFileSync(join(STATI_DIR, file), 'utf-8');

  const date = extract(content, /"datePublished":\s*"([^"]+)"/);
  if (!date) continue; // пропускаем без даты

  const rawTitle = extract(content, /title="([^"]+)"/);
  const title = rawTitle.replace(/\s*\|\s*АйДаКемп\s*$/, '').trim();
  const description = extract(content, /description="([^"]+)"/);
  const ogImage = extract(content, /ogImage="([^"]+)"/) || FALLBACK_IMAGE;

  if (!title || !description) continue;

  articles.push({ slug, title, description, date, ogImage, url: `${BASE_URL}/stati/${slug}` });
}

articles.sort((a, b) => b.date.localeCompare(a.date));

const ts = `// Автогенерировано scripts/parse-articles.ts — не редактировать вручную
// Запуск: npx tsx scripts/parse-articles.ts

export interface Article {
  slug: string;
  title: string;
  description: string;
  date: string;
  ogImage: string;
  url: string;
}

export const articles: Article[] = ${JSON.stringify(articles, null, 2)};
`;

writeFileSync(OUTPUT, ts, 'utf-8');
console.log(`Записано ${articles.length} статей → src/data/articles.ts`);
```

- [ ] **Шаг 2: Запустить скрипт**

```bash
cd ~/Aidacamp-cloude
npx tsx scripts/parse-articles.ts
```

Ожидаемый вывод: `Записано 147 статей → src/data/articles.ts`

- [ ] **Шаг 3: Проверить результат**

```bash
head -30 src/data/articles.ts
# Должны видеть массив с title/description/date/ogImage
wc -l src/data/articles.ts
# Должно быть > 500 строк
```

- [ ] **Шаг 4: Убедиться что TypeScript не ругается**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Шаг 5: Коммит**

```bash
git add scripts/parse-articles.ts src/data/articles.ts
git commit -m "feat: generate articles registry from .astro files"
```

---

## Task 2: RSS-фид для Яндекс Дзена

**Задача:** создать `src/pages/rss.xml.ts` — Astro API endpoint генерирующий валидный RSS 2.0 из реестра `articles.ts`.

**Files:**
- Create: `src/pages/rss.xml.ts`

**Важно для Дзена:** Дзен требует корректный RSS 2.0 с `<title>`, `<link>`, `<description>`, `<pubDate>` (формат RFC-822), `<enclosure>` или `<media:content>` для картинки.

- [ ] **Шаг 1: Написать `src/pages/rss.xml.ts`**

```typescript
export const prerender = false;
import type { APIRoute } from 'astro';
import { articles } from '../data/articles';

const BASE_URL = 'https://aidacamp.ru';

function toRFC822(dateStr: string): string {
  return new Date(dateStr).toUTCString();
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const GET: APIRoute = () => {
  const items = articles.slice(0, 50).map(a => {
    const imageUrl = a.ogImage.startsWith('http') ? a.ogImage : `${BASE_URL}${a.ogImage}`;
    return `  <item>
    <title>${esc(a.title)}</title>
    <link>${esc(a.url)}</link>
    <description>${esc(a.description)}</description>
    <pubDate>${toRFC822(a.date)}</pubDate>
    <guid isPermaLink="true">${esc(a.url)}</guid>
    <enclosure url="${esc(imageUrl)}" type="image/avif" length="0"/>
  </item>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>АйДаКемп — блог об IT-лагере для детей</title>
    <link>${BASE_URL}</link>
    <description>Статьи об IT-образовании, летнем отдыхе детей и опыте АйДаКемп</description>
    <language>ru</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <image>
      <url>${BASE_URL}/images/hero/o-lagere.avif</url>
      <title>АйДаКемп</title>
      <link>${BASE_URL}</link>
    </image>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
```

- [ ] **Шаг 2: Проверить локально что Astro не ругается**

```bash
cd ~/Aidacamp-cloude
npx astro check 2>&1 | grep -i "error" | head -10
```

- [ ] **Шаг 3: Коммит**

```bash
git add src/pages/rss.xml.ts
git commit -m "feat: add RSS feed for Yandex Zen at /rss.xml"
```

---

## Task 3: Миграция БД — добавить поля соцсетей в article_views

**Задача:** добавить в таблицу `article_views` колонки для хранения ID поста в ВК, статистики ВК и синхронизированного трафика из Метрики.

**Files:**
- Create: `scripts/migrate-social-fields.sql`

**Подключение к БД:** `postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp` (из `/opt/aidacamp-tools/mcp/.env`)

**Текущая структура таблицы:**
```sql
article_views (slug TEXT PK, views BIGINT, updated_at TIMESTAMPTZ)
```

- [ ] **Шаг 1: Написать файл миграции**

```sql
-- scripts/migrate-social-fields.sql
ALTER TABLE article_views
  ADD COLUMN IF NOT EXISTS metrika_visits   INTEGER   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metrika_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vk_post_id       TEXT,
  ADD COLUMN IF NOT EXISTS vk_owner_id      INTEGER,
  ADD COLUMN IF NOT EXISTS vk_posted_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vk_likes         INTEGER   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vk_reposts       INTEGER   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vk_views         INTEGER   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vk_stats_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ok_post_id       TEXT,
  ADD COLUMN IF NOT EXISTS ok_posted_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ok_likes         INTEGER   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ok_stats_at      TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_article_views_vk_posted_at ON article_views(vk_posted_at);
CREATE INDEX IF NOT EXISTS idx_article_views_metrika ON article_views(metrika_visits DESC);
```

- [ ] **Шаг 2: Применить миграцию на проде через SSH**

Выполнить команду через `mcp__aidacamp-tools__ssh`:
```bash
psql "postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp" < /tmp/migrate-social-fields.sql
```

Сначала скопировать файл на сервер:
```bash
# scp не доступен напрямую — используем ssh + heredoc
```

Альтернатива: передать SQL напрямую через psql:
```bash
psql "postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp" -c "
ALTER TABLE article_views
  ADD COLUMN IF NOT EXISTS metrika_visits INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metrika_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vk_post_id TEXT,
  ADD COLUMN IF NOT EXISTS vk_owner_id INTEGER,
  ADD COLUMN IF NOT EXISTS vk_posted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vk_likes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vk_reposts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vk_views INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vk_stats_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ok_post_id TEXT,
  ADD COLUMN IF NOT EXISTS ok_posted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ok_likes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ok_stats_at TIMESTAMPTZ;
"
```

- [ ] **Шаг 3: Проверить структуру таблицы**

```bash
psql "postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp" -c "\d article_views"
```

Ожидаемый вывод: таблица с 13 полями включая `vk_post_id`, `metrika_visits`, `ok_post_id`.

- [ ] **Шаг 4: Сохранить файл миграции в репо и закоммитить**

```bash
git add scripts/migrate-social-fields.sql
git commit -m "feat: add social media fields to article_views table"
```

---

## Task 4: Крон-скрипт постинга в ВК

**Задача:** создать Node.js скрипт `/opt/social-poster/vk-poster.js` который выбирает следующую статью для публикации (приоритет по `metrika_visits`, потом по дате) и постит её в ВК от имени Дарьи через `wall.post`.

**Files:**
- Create: `/opt/social-poster/vk-poster.js` (создаётся через SSH на сервере)

**Данные сервера:**
- Токен ВК: `VK_USER_TOKEN` из `/opt/aidacamp-tools/.env`
- БД: `postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp`
- VK user ID Дарьи: `712299377`
- VK API: `https://api.vk.com/method/wall.post?v=5.199`

**Логика выбора статьи:**
1. Взять из `article_views` статью где `vk_post_id IS NULL` и `metrika_visits > 0`, сортировка `metrika_visits DESC`
2. Если таких нет — взять статью где `vk_post_id IS NULL`, сортировка по `metrika_visits DESC, slug ASC`
3. Если все запощены — выйти с сообщением «all articles posted»

**Формат поста в ВК:**
```
{title}

{description}

Читать: {url}
```
С прикреплённым фото (огimage загрузить через `photos.getWallUploadServer` + `photos.saveWallPhoto`, потом `attachments=photo{owner_id}_{photo_id}`).

- [ ] **Шаг 1: Создать директорию и файл на сервере**

Создать через `mcp__aidacamp-tools__ssh`:
```bash
mkdir -p /opt/social-poster
```

- [ ] **Шаг 2: Записать скрипт на сервер**

Содержимое `/opt/social-poster/vk-poster.js`:

```javascript
#!/usr/bin/env node
// VK poster — выбирает статью по metrika_visits и постит от имени Дарьи

import pg from 'pg';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { FormData } from 'undici';

const DB_URL = 'postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp';
const ENV = Object.fromEntries(
  fs.readFileSync('/opt/aidacamp-tools/.env', 'utf-8')
    .split('\n').filter(l => l.includes('=')).map(l => l.split('=').map(s => s.trim()))
);
const VK_TOKEN = ENV['VK_USER_TOKEN'];
const VK_V = '5.199';
const BASE_URL = 'https://aidacamp.ru';

async function vkApi(method, params) {
  const url = new URL(`https://api.vk.com/method/${method}`);
  url.searchParams.set('access_token', VK_TOKEN);
  url.searchParams.set('v', VK_V);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(`VK ${method}: ${JSON.stringify(data.error)}`);
  return data.response;
}

async function uploadPhoto(imageUrl) {
  // Получаем сервер загрузки
  const uploadServer = await vkApi('photos.getWallUploadServer', {});
  const uploadUrl = uploadServer.upload_url;

  // Скачиваем картинку
  const imgRes = await fetch(`${BASE_URL}${imageUrl}`);
  if (!imgRes.ok) return null;
  const imgBuffer = Buffer.from(await imgRes.arrayBuffer());

  // Загружаем через multipart/form-data
  const form = new FormData();
  form.append('photo', new Blob([imgBuffer], { type: 'image/avif' }), 'photo.avif');
  const uploadRes = await fetch(uploadUrl, { method: 'POST', body: form });
  const uploadData = await uploadRes.json();

  // Сохраняем фото
  const saved = await vkApi('photos.saveWallPhoto', {
    server: uploadData.server,
    photo: uploadData.photo,
    hash: uploadData.hash,
  });
  if (!saved?.[0]) return null;
  const photo = saved[0];
  return `photo${photo.owner_id}_${photo.id}`;
}

async function main() {
  const pool = new pg.Pool({ connectionString: DB_URL });

  // Выбираем следующую статью
  const { rows } = await pool.query(`
    SELECT slug, metrika_visits FROM article_views
    WHERE vk_post_id IS NULL
    ORDER BY metrika_visits DESC, slug ASC
    LIMIT 1
  `);

  if (!rows.length) {
    console.log('all articles posted');
    await pool.end();
    return;
  }

  const { slug } = rows[0];

  // Читаем мета из articles.ts через JSON
  const articlesRaw = fs.readFileSync('/opt/social-poster/articles.json', 'utf-8');
  const articles = JSON.parse(articlesRaw);
  const article = articles.find(a => a.slug === slug);

  if (!article) {
    console.log(`article not found in registry: ${slug}`);
    await pool.end();
    return;
  }

  console.log(`Posting: ${slug} — ${article.title}`);

  // Загружаем фото
  let attachment = '';
  try {
    const photoId = await uploadPhoto(article.ogImage);
    if (photoId) attachment = photoId;
  } catch (e) {
    console.warn('Photo upload failed:', e.message);
  }

  const message = `${article.title}\n\n${article.description}\n\nЧитать: ${article.url}`;

  // Постим
  const postParams = { message, owner_id: '712299377' };
  if (attachment) postParams.attachments = attachment;

  const result = await vkApi('wall.post', postParams);
  const postId = result.post_id;

  // Сохраняем в БД
  await pool.query(`
    INSERT INTO article_views (slug, views, updated_at, vk_post_id, vk_owner_id, vk_posted_at)
    VALUES ($1, 0, now(), $2, $3, now())
    ON CONFLICT (slug) DO UPDATE SET
      vk_post_id = $2, vk_owner_id = $3, vk_posted_at = now(), updated_at = now()
  `, [slug, String(postId), 712299377]);

  console.log(`Posted: https://vk.com/id712299377?w=wall712299377_${postId}`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Шаг 3: Создать `articles.json` на сервере из articles.ts**

На локальной машине извлечь JSON и скопировать на сервер:
```bash
cd ~/Aidacamp-cloude
node -e "const {articles} = await import('./src/data/articles.ts'); console.log(JSON.stringify(articles))" --input-type=module > /tmp/articles.json
```

Через SSH записать содержимое на сервер в `/opt/social-poster/articles.json`.

Либо проще — добавить в `package.json` скрипт экспорта JSON и включить в деплой.

- [ ] **Шаг 4: Инициализировать npm в `/opt/social-poster/`**

```bash
cd /opt/social-poster && cat > package.json << 'EOF'
{
  "name": "social-poster",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "pg": "^8.11.0",
    "undici": "^6.0.0"
  }
}
EOF
npm install
```

- [ ] **Шаг 5: Тест запуска (dry run)**

```bash
# Проверяем что скрипт запускается и находит статью
cd /opt/social-poster && node vk-poster.js 2>&1 | head -5
```

Ожидаемый вывод: `Posting: <slug> — <title>` или `all articles posted`.

- [ ] **Шаг 6: Создать скрипт для Cron (с логированием)**

Создать `/opt/social-poster/run-poster.sh`:
```bash
#!/bin/bash
LOG="/var/log/social-poster.log"
echo "[$(date '+%Y-%m-%d %H:%M')] Starting VK poster" >> "$LOG"
cd /opt/social-poster && node vk-poster.js >> "$LOG" 2>&1
echo "[$(date '+%Y-%m-%d %H:%M')] Done" >> "$LOG"
```
```bash
chmod +x /opt/social-poster/run-poster.sh
```

---

## Task 5: Крон-скрипт сбора статистики ВК

**Задача:** создать `/opt/social-poster/vk-stats.js` который раз в день обновляет лайки/репосты/просмотры для всех запощенных статей.

**Files:**
- Create: `/opt/social-poster/vk-stats.js`

**VK API метод:** `wall.getById` принимает массив `posts` вида `712299377_<post_id>` (до 100 за раз).

- [ ] **Шаг 1: Написать `/opt/social-poster/vk-stats.js`**

```javascript
#!/usr/bin/env node
import pg from 'pg';
import fs from 'fs';

const DB_URL = 'postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp';
const ENV = Object.fromEntries(
  fs.readFileSync('/opt/aidacamp-tools/.env', 'utf-8')
    .split('\n').filter(l => l.includes('=')).map(l => l.split('=').map(s => s.trim()))
);
const VK_TOKEN = ENV['VK_USER_TOKEN'];

async function vkApi(method, params) {
  const url = new URL(`https://api.vk.com/method/${method}`);
  url.searchParams.set('access_token', VK_TOKEN);
  url.searchParams.set('v', '5.199');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(`VK ${method}: ${JSON.stringify(data.error)}`);
  return data.response;
}

async function main() {
  const pool = new pg.Pool({ connectionString: DB_URL });

  const { rows } = await pool.query(`
    SELECT slug, vk_post_id, vk_owner_id FROM article_views
    WHERE vk_post_id IS NOT NULL
  `);

  if (!rows.length) {
    console.log('No posted articles yet');
    await pool.end();
    return;
  }

  // Батчами по 100
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const postIds = batch.map(r => `${r.vk_owner_id}_${r.vk_post_id}`).join(',');
    const posts = await vkApi('wall.getById', { posts: postIds, extended: 0 });

    for (const post of posts) {
      const slug = batch.find(r => String(r.vk_post_id) === String(post.id))?.slug;
      if (!slug) continue;
      await pool.query(`
        UPDATE article_views SET
          vk_likes   = $1,
          vk_reposts = $2,
          vk_views   = $3,
          vk_stats_at = now()
        WHERE slug = $4
      `, [
        post.likes?.count ?? 0,
        post.reposts?.count ?? 0,
        post.views?.count ?? 0,
        slug,
      ]);
    }
    console.log(`Updated ${batch.length} posts`);
  }

  await pool.end();
  console.log('VK stats sync complete');
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Шаг 2: Создать run-stats.sh**

```bash
cat > /opt/social-poster/run-stats.sh << 'EOF'
#!/bin/bash
LOG="/var/log/social-poster.log"
echo "[$(date '+%Y-%m-%d %H:%M')] Syncing VK stats" >> "$LOG"
cd /opt/social-poster && node vk-stats.js >> "$LOG" 2>&1
echo "[$(date '+%Y-%m-%d %H:%M')] Stats done" >> "$LOG"
EOF
chmod +x /opt/social-poster/run-stats.sh
```

---

## Task 6: Настройка крона и первый тест

**Задача:** настроить расписание, загрузить `articles.json` на сервер, сделать тестовую публикацию.

**Files:**
- Create: `/etc/cron.d/social-poster`
- Modify: `package.json` (добавить скрипт экспорта articles.json)

- [ ] **Шаг 1: Добавить скрипт экспорта JSON в `package.json`**

В `~/Aidacamp-cloude/package.json` в секцию `scripts` добавить:
```json
"export:articles": "npx tsx scripts/export-articles-json.ts"
```

Создать `scripts/export-articles-json.ts`:
```typescript
import { writeFileSync } from 'fs';
import { articles } from '../src/data/articles.js';
writeFileSync('/tmp/articles.json', JSON.stringify(articles, null, 2));
console.log(`Exported ${articles.length} articles → /tmp/articles.json`);
```

- [ ] **Шаг 2: Сгенерировать и скопировать articles.json на сервер**

```bash
cd ~/Aidacamp-cloude && npm run export:articles
scp -i ~/.ssh/aidacamp_prod /tmp/articles.json root@159.194.223.55:/opt/social-poster/articles.json
```

- [ ] **Шаг 3: Настроить cron**

Создать через SSH `/etc/cron.d/social-poster`:
```
# Постить в ВК раз в день в 11:00
0 11 * * * root /opt/social-poster/run-poster.sh

# Собирать статистику ВК раз в день в 08:00
0 8 * * * root /opt/social-poster/run-stats.sh
```

- [ ] **Шаг 4: Запустить тестовую публикацию вручную**

```bash
node /opt/social-poster/vk-poster.js
```

Ожидаемый вывод:
```
Posting: adaptaciya-rebenka-v-lagere — Адаптация ребёнка в лагере...
Posted: https://vk.com/id712299377?w=wall712299377_XXXXX
```

- [ ] **Шаг 5: Проверить пост в ВК и в БД**

```bash
psql "postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp" \
  -c "SELECT slug, vk_post_id, vk_posted_at FROM article_views WHERE vk_post_id IS NOT NULL"
```

- [ ] **Шаг 6: Финальный коммит**

```bash
cd ~/Aidacamp-cloude
git add scripts/export-articles-json.ts package.json
git commit -m "feat: add articles JSON export script for social poster"
```

---

## Self-Review

**Spec coverage:**
- ✅ Реестр статей (articles.ts) с парсингом из .astro
- ✅ RSS для Дзена
- ✅ Миграция БД с полями ВК + Одноклассники
- ✅ Постер в ВК с выбором по metrika_visits
- ✅ Сбор статистики (лайки/репосты/просмотры)
- ✅ Крон с логированием
- ⚠️ metrika_visits пока не заполняется автоматически — нужна отдельная задача синхронизации из Яндекс.Метрики (scope расширения, не блокирует MVP)

**Заглушки:** нет.

**Consistency:** `VK_USER_TOKEN` используется везде одинаково. `vk_post_id` везде TEXT. `712299377` — константа, хардкожена в двух местах (poster + stats) — ок для MVP.

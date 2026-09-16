#!/usr/bin/env node
// Единый авто-постер: VK (стена Дарьи + группа АйДаКодить) + Дзен (через RSS-маркер).
// Очередь и идемпотентность — таблица article_views:
//   - VK:  постим статью с vk_post_id IS NULL (одна за прогон), после — проставляем vk_post_id.
//     Та же статья кросспостится в группу aida_codit (vk_group_post_id) в рамках того же прогона.
//   - Дзен: помечаем rss_published_at у ДРУГОЙ статьи → она попадает в /rss.xml → Дзен забирает.
// Идемпотентность: повторный запуск НЕ перепостит уже помеченные строки.
//
// DRY-RUN: DRY_RUN=1 node vk-poster.js  (или флаг --dry-run)
//   Ничего не постит в VK и НЕ пишет в БД — только логирует, что сделал бы.
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { FormData, File } from 'undici';

const DRY_RUN = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');

const ENV_RAW = fs.readFileSync('/opt/aidacamp-tools/.env', 'utf-8');
const ENV = Object.fromEntries(
  ENV_RAW.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);
const DB_URL = ENV['DATABASE_URL'];
const VK_TOKEN = ENV['VK_USER_TOKEN'];
const VK_V = '5.199';
const VK_OWNER_ID = 712299377;
const VK_GROUP_ID = 194976808; // vk.com/aida_codit — «АйДаКодить × АйДаКемп»

// --- Ретрай загрузки фото (2026-08-07) ---
// upload-сервер VK транзиентно отдаёт HTTP 504 «The page is temporarily unavailable»
// ровно через 20 с примерно на 15% попыток — проверено пробником: один и тот же файл
// в попытке #1 грузится, в #2 и #3 падает. Раньше ретраев не было, и один такой 504
// давал пост без картинки НАВСЕГДА (статья тут же помечалась в БД). См. main().
const UPLOAD_ATTEMPTS = 3;
const UPLOAD_RETRY_DELAY_MS = [3000, 8000]; // паузы между попытками 1→2 и 2→3
const UPLOAD_TIMEOUT_MS = 25000;            // чуть больше 20-секундного таймаута VK
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Контент-план: порядок статей (темы разведены) + фото каждой.
// Заменяет сортировку по трафику (из-за неё болезни шли подряд, инцидент 06-08.07.2026)
// и хэш-подбор фото (5 из 8 падали в дефолт-«атмосферу»). Файл vk_plan.json генерит zen-batch/build_plan.py.
let VK_PLAN = [];
try {
  VK_PLAN = JSON.parse(fs.readFileSync('/opt/social-poster/vk_plan.json', 'utf-8'));
} catch (e) {
  console.warn('vk_plan.json не найден — fallback на сортировку по трафику');
}
const PLAN_PHOTO = Object.fromEntries(VK_PLAN.map(p => [p.slug, p.photo]));
const BASE_URL = 'https://aidacamp.ru';

// --- Пул обработанных фото лагеря для постов (2026-07-03) ---
// /var/www/aidacamp-media/images/vk-pool/<категория>/*.jpg — залито с локального архива
// «Обработанные». Категория подбирается по слагу+заголовку, файл — детерминированно
// по хэшу слага (одна статья = всегда одно и то же фото, разные статьи — разные).
const PHOTO_POOL = '/var/www/aidacamp-media/images/vk-pool';
const POOL_RULES = [
  [/pitani|eda|menu|kaloriy|едой|еда|питани|меню/i, 'pitanie'],
  [/bassein|kupani|бассейн|купани/i, 'bassein'],
  [/sport|zaryadka|спорт|зарядк/i, 'sport'],
  [/razmeshchen|komnat|nomer|spal|размещени|комнат|жиль/i, 'razmeshchenie'],
  [/territor|bezopasn|dobratsya|adres|территори|безопасн|добраться/i, 'territoriya'],
  [/\bit\b|kod|program|neyroset|robot|kompyuter|ucheb|zanyat|hakaton|minecraft|roblox|scratch|ekrannoe|telefon|нейросет|программир|экранн|телефон/i, 'ucheba'],
];
export function pickPoolPhoto(slugAndTitle) {
  let cat = 'atmosfera';
  for (const [re, c] of POOL_RULES) if (re.test(slugAndTitle)) { cat = c; break; }
  const read = d => { try { return fs.readdirSync(d).filter(f => f.endsWith('.jpg')); } catch { return []; } };
  let dir = path.join(PHOTO_POOL, cat);
  let files = read(dir);
  if (!files.length) { dir = path.join(PHOTO_POOL, 'atmosfera'); files = read(dir); }
  if (!files.length) return null;
  files.sort();
  const h = [...slugAndTitle].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 0);
  return path.join(dir, files[h % files.length]);
}


const log = (...a) => console.log(DRY_RUN ? '[DRY-RUN]' : '[LIVE]', ...a);

// Алерт владельцу: молчаливый пропуск прогона хуже, чем пост без картинки.
async function tgAlert(text) {
  const tok = ENV['TELEGRAM_BOT_TOKEN'], chat = ENV['TELEGRAM_CHAT_ID'];
  if (!tok || !chat) return;
  try {
    await fetch(`https://api.telegram.org/bot${tok}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (e) { console.warn('TG alert failed:', e.message); }
}

async function vkApi(method, params) {
  const url = new URL(`https://api.vk.com/method/${method}`);
  url.searchParams.set('access_token', VK_TOKEN);
  url.searchParams.set('v', VK_V);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.error) throw new Error(`VK ${method}: ${JSON.stringify(data.error)}`);
  return data.response;
}

// Одна попытка загрузки. Бросает с внятной причиной — ретраем занимается uploadPhoto().
async function uploadPhotoOnce(imageUrl, groupId) {
  // groupId задан → фото грузится/сохраняется в сообщество (photo-<group>_<id>).
  // Иначе — в личный аккаунт владельца токена.
  const uploadServer = await vkApi('photos.getWallUploadServer', groupId ? { group_id: groupId } : {});
  let imgBuffer;
  if (!imageUrl.startsWith('http')) {
    // Локальный путь. Раньше отсутствующий файл молча уходил в fetch(BASE_URL + путь)
    // и превращался в 404 → «фото не загрузилось» без намёка на причину.
    if (!fs.existsSync(imageUrl)) throw new Error(`нет файла в пуле: ${imageUrl}`);
    imgBuffer = fs.readFileSync(imageUrl);
  } else {
    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS) });
    if (!imgRes.ok) throw new Error(`картинка не отдалась: HTTP ${imgRes.status} ${imageUrl}`);
    imgBuffer = Buffer.from(await imgRes.arrayBuffer());
  }
  const form = new FormData();
  form.append('photo', new File([imgBuffer], 'photo.jpg', { type: 'image/jpeg' }));
  const uploadRes = await fetch(uploadServer.upload_url, {
    method: 'POST', body: form, signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
  });
  const raw = await uploadRes.text();
  // Транзиентный сбой VK: вместо JSON прилетает HTML-заглушка «page is temporarily unavailable».
  if (raw.trimStart().startsWith('<')) throw new Error(`upload-сервер отдал HTML ${uploadRes.status}`);
  let uploadData;
  try { uploadData = JSON.parse(raw); }
  catch { throw new Error(`upload-сервер отдал не JSON: ${raw.slice(0, 80)}`); }
  // VK возвращает photo:"[]" когда файл не принят — это не валидная загрузка.
  if (!uploadData.photo || uploadData.photo === '[]') throw new Error('upload-сервер вернул пустой photo:"[]"');
  const saved = await vkApi('photos.saveWallPhoto', {
    ...(groupId ? { group_id: groupId } : {}),
    server: uploadData.server,
    photo: uploadData.photo,
    hash: uploadData.hash,
  });
  if (!saved?.[0]) throw new Error('saveWallPhoto вернул пустой ответ');
  return `photo${saved[0].owner_id}_${saved[0].id}`;
}

// Ретрай: каждая попытка берёт НОВЫЙ upload_url (он одноразовый и привязан к конкретному
// серверу VK — именно смена сервера и спасает от залипшего 504).
export async function uploadPhoto(imageUrl, groupId) {
  let lastErr;
  for (let attempt = 1; attempt <= UPLOAD_ATTEMPTS; attempt++) {
    try {
      return await uploadPhotoOnce(imageUrl, groupId);
    } catch (e) {
      lastErr = e;
      // Отсутствующий файл ретраить бессмысленно — это не транзиентный сбой.
      if (/нет файла в пуле/.test(e.message)) break;
      const where = groupId ? 'группа' : 'стена';
      console.warn(`VK upload (${where}) попытка ${attempt}/${UPLOAD_ATTEMPTS} не удалась: ${e.message}`);
      if (attempt < UPLOAD_ATTEMPTS) await sleep(UPLOAD_RETRY_DELAY_MS[attempt - 1] ?? 5000);
    }
  }
  throw lastErr;
}

async function main() {
  const pool = new pg.Pool({ connectionString: DB_URL });

  // --- Очередь VK: следующая по контент-плану невыложенная статья ---
  // Порядок из vk_plan.json (темы разведены). Fallback — сортировка по трафику.
  let rows;
  if (VK_PLAN.length) {
    const planSlugs = VK_PLAN.map(p => p.slug);
    const { rows: posted } = await pool.query(
      `SELECT slug FROM article_views WHERE slug = ANY($1) AND vk_post_id IS NOT NULL`,
      [planSlugs]
    );
    const postedSet = new Set(posted.map(r => r.slug));
    const next = planSlugs.find(s => !postedSet.has(s));
    rows = next ? [{ slug: next }] : [];
  } else {
    ({ rows } = await pool.query(`
      SELECT slug FROM article_views
      WHERE vk_post_id IS NULL
      ORDER BY metrika_visits DESC NULLS LAST, slug ASC
      LIMIT 1
    `));
  }

  if (!rows.length) {
    log('VK: очередь пуста — все статьи выложены');
  } else {
    const { slug } = rows[0];
    const articles = JSON.parse(fs.readFileSync('/opt/social-poster/articles.json', 'utf-8'));
    // Реестр мигрировал на Astro Content Collections: поле slug стало id (инцидент 15.07.2026).
    const article = articles.find(a => (a.id ?? a.slug) === slug);

    if (!article) {
      log(`VK: '${slug}' нет в реестре articles.json → помечаем skip`);
      if (!DRY_RUN) {
        await pool.query(`UPDATE article_views SET vk_post_id='skip', vk_posted_at=now() WHERE slug=$1`, [slug]);
      }
    } else {
      const utmUrl = `https://aidacamp.ru?utm_source=vk&utm_medium=social&utm_campaign=articles`;
      // Новый реестр отдаёт относительный url ("/stati/..."), старый — абсолютный. Нормализуем.
      const absArticleUrl = article.url.startsWith('http') ? article.url : `https://aidacamp.ru${article.url}`;
      // UTM и на ссылку статьи — иначе 95% переходов приходят без метки и атрибуция гадательная (инцидент 02.07.2026)
      const articleUtmUrl = `${absArticleUrl}${absArticleUrl.includes('?') ? '&' : '?'}utm_source=vk&utm_medium=social&utm_campaign=articles&utm_content=${slug}`;
      const message = `${article.title}\n\n${article.description}\n\nЧитать полностью: ${articleUtmUrl}\n\nАйДаКемп — IT-лагерь для детей: ${utmUrl}`;

      // Фото: из контент-плана (уникальное, по теме); fallback — старый хэш-подбор.
      const planPhoto = PLAN_PHOTO[slug]
        ? `${PHOTO_POOL}/${PLAN_PHOTO[slug]}`
        : pickPoolPhoto(`${slug} ${article.title || ''}`);
      const photoSrc = planPhoto || (/\.jpe?g$/i.test(article.ogImage || '') ? article.ogImage : null);

      if (DRY_RUN) {
        log(`VK: ВЫЛОЖИЛ БЫ '${slug}'`);
        log(`VK: og=${article.ogImage}`);
        log(`VK: фото=${photoSrc}${PLAN_PHOTO[slug] ? ' (из плана)' : ' (хэш-fallback)'}`);
        log(`VK: сообщение (первые 120): ${message.slice(0,120).replace(/\n/g,' ⏎ ')}...`);
        log(`VK: кросспост в группу aida_codit (owner_id=-${VK_GROUP_ID}) тем же текстом+фото`);
      } else {
        // Оба фото (стена + группа) грузим ДО любой публикации. Раньше загрузка шла
        // вперемешку с постингом, и транзиентный 504 давал пост без картинки, причём
        // статья тут же помечалась в БД → потеря навсегда (инцидент 08.2026, ~15% постов).
        // Теперь при неудаче не постим и не пишем в БД: статья остаётся в очереди на завтра.
        // Фото грузим в группу ОТДЕЛЬНО: VK нестабильно срезает из поста сообщества фото,
        // залитое в личный аккаунт (инцидент 07.2026, ~27% групповых постов без картинки).
        let attachment = '', groupAttachment = '', uploadFailed = null;
        if (!photoSrc) {
          console.warn(`VK: для '${slug}' фото не задано вообще — постим без картинки`);
        } else {
          try {
            attachment = await uploadPhoto(photoSrc);
            groupAttachment = await uploadPhoto(photoSrc, VK_GROUP_ID);
          } catch (e) {
            uploadFailed = e.message;
          }
        }

        if (uploadFailed) {
          console.warn(`VK: фото для '${slug}' не загрузилось за ${UPLOAD_ATTEMPTS} попыток — прогон пропущен, статья осталась в очереди. Причина: ${uploadFailed}`);
          await tgAlert(`⚠️ VK-постер пропустил прогон\n\nСтатья: ${slug}\nПричина: ${uploadFailed}\n\nНичего не опубликовано, статья осталась в очереди — завтрашний прогон попробует снова.`);
        } else {
          const postParams = { message, owner_id: String(VK_OWNER_ID) };
          if (attachment) postParams.attachments = attachment;
          const result = await vkApi('wall.post', postParams);
          const postId = result.post_id;

          // Сразу помечаем личную стену как опубликованную — иначе при сбое кросспоста
          // или записи group-полей статья репостится заново каждый день (инцидент 04-06.07.2026).
          await pool.query(`
            INSERT INTO article_views (slug, views, updated_at, vk_post_id, vk_owner_id, vk_posted_at)
            VALUES ($1, 0, now(), $2, $3, now())
            ON CONFLICT (slug) DO UPDATE SET
              vk_post_id=$2, vk_owner_id=$3, vk_posted_at=now(), updated_at=now()
          `, [slug, String(postId), VK_OWNER_ID]);
          log(`VK: выложен https://vk.com/wall${VK_OWNER_ID}_${postId}`);

          // Кросспост той же статьи в группу aida_codit, от имени сообщества.
          try {
            const groupPostParams = { message, owner_id: String(-VK_GROUP_ID), from_group: 1 };
            if (groupAttachment) groupPostParams.attachments = groupAttachment;
            const groupResult = await vkApi('wall.post', groupPostParams);
            const groupPostId = groupResult.post_id;
            await pool.query(`
              UPDATE article_views
              SET vk_group_post_id=$2::text, vk_group_id=$3, vk_group_posted_at=now()
              WHERE slug=$1
            `, [slug, String(groupPostId), VK_GROUP_ID]);
            log(`VK-группа: выложен https://vk.com/wall-${VK_GROUP_ID}_${groupPostId}`);
          } catch (e) {
            console.warn('Group post failed:', e.message);
          }
        }
      }
    }
  }

  // --- Очередь Дзен (RSS): помечаем ОДНУ ещё не отданную в RSS статью ---
  try {
    const { rows: rssRows } = await pool.query(`
      SELECT slug FROM article_views
      WHERE rss_published_at IS NULL
      ORDER BY metrika_visits DESC NULLS LAST, slug ASC
      LIMIT 1
    `);
    if (!rssRows.length) {
      log('Дзен/RSS: очередь пуста');
    } else {
      const rslug = rssRows[0].slug;
      if (DRY_RUN) {
        log(`Дзен/RSS: ОТКРЫЛ БЫ в фиде '${rslug}' (появится в /rss.xml → Дзен заберёт)`);
      } else {
        await pool.query(
          `INSERT INTO article_views (slug, views, updated_at, rss_published_at)
           VALUES ($1, 0, now(), now())
           ON CONFLICT (slug) DO UPDATE SET rss_published_at=now(), updated_at=now()`,
          [rslug]
        );
        log(`Дзен/RSS: открыт в фиде '${rslug}'`);
      }
    }
  } catch (e) {
    console.warn('RSS publish failed:', e.message);
  }

  await pool.end();
}

// main() только при прямом запуске — чтобы тест мог импортировать uploadPhoto,
// не опубликовав при этом пост.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(e => { console.error(e.message); process.exit(1); });
}

#!/usr/bin/env node
// Единый авто-постер: VK (стена Дарьи) + Дзен (через RSS-маркер).
// Очередь и идемпотентность — таблица article_views:
//   - VK:  постим статью с vk_post_id IS NULL (одна за прогон), после — проставляем vk_post_id.
//   - Дзен: помечаем rss_published_at у ДРУГОЙ статьи → она попадает в /rss.xml → Дзен забирает.
// Идемпотентность: повторный запуск НЕ перепостит уже помеченные строки.
//
// DRY-RUN: DRY_RUN=1 node vk-poster.js  (или флаг --dry-run)
//   Ничего не постит в VK и НЕ пишет в БД — только логирует, что сделал бы.
import pg from 'pg';
import fs from 'fs';
import path from 'path';
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
function pickPoolPhoto(slugAndTitle) {
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

async function uploadPhoto(imageUrl) {
  const uploadServer = await vkApi('photos.getWallUploadServer', {});
  let imgBuffer;
  if (!imageUrl.startsWith('http') && fs.existsSync(imageUrl)) {
    imgBuffer = fs.readFileSync(imageUrl); // локальный файл из пула
  } else {
    const imgRes = await fetch(imageUrl.startsWith('http') ? imageUrl : `${BASE_URL}${imageUrl}`);
    if (!imgRes.ok) return null;
    imgBuffer = Buffer.from(await imgRes.arrayBuffer());
  }
  const form = new FormData();
  form.append('photo', new File([imgBuffer], 'photo.jpg', { type: 'image/jpeg' }));
  const uploadRes = await fetch(uploadServer.upload_url, { method: 'POST', body: form });
  const uploadData = await uploadRes.json();
  // VK возвращает photo:"[]" когда файл не принят — это не валидная загрузка.
  if (!uploadData.photo || uploadData.photo === '[]') return null;
  const saved = await vkApi('photos.saveWallPhoto', {
    server: uploadData.server,
    photo: uploadData.photo,
    hash: uploadData.hash,
  });
  if (!saved?.[0]) return null;
  return `photo${saved[0].owner_id}_${saved[0].id}`;
}

async function main() {
  const pool = new pg.Pool({ connectionString: DB_URL });

  // --- Очередь VK: одна невыложенная статья, приоритет по трафику ---
  const { rows } = await pool.query(`
    SELECT slug FROM article_views
    WHERE vk_post_id IS NULL
    ORDER BY metrika_visits DESC NULLS LAST, slug ASC
    LIMIT 1
  `);

  if (!rows.length) {
    log('VK: очередь пуста — все статьи выложены');
  } else {
    const { slug } = rows[0];
    const articles = JSON.parse(fs.readFileSync('/opt/social-poster/articles.json', 'utf-8'));
    const article = articles.find(a => a.slug === slug);

    if (!article) {
      log(`VK: '${slug}' нет в реестре articles.json → помечаем skip`);
      if (!DRY_RUN) {
        await pool.query(`UPDATE article_views SET vk_post_id='skip', vk_posted_at=now() WHERE slug=$1`, [slug]);
      }
    } else {
      const utmUrl = `https://aidacamp.ru?utm_source=vk&utm_medium=social&utm_campaign=articles`;
      // UTM и на ссылку статьи — иначе 95% переходов приходят без метки и атрибуция гадательная (инцидент 02.07.2026)
      const articleUtmUrl = `${article.url}${article.url.includes('?') ? '&' : '?'}utm_source=vk&utm_medium=social&utm_campaign=articles&utm_content=${slug}`;
      const message = `${article.title}\n\n${article.description}\n\nЧитать полностью: ${articleUtmUrl}\n\nАйДаКемп — IT-лагерь для детей: ${utmUrl}`;

      if (DRY_RUN) {
        log(`VK: ВЫЛОЖИЛ БЫ '${slug}'`);
        log(`VK: og=${article.ogImage}`);
        log(`VK: фото из пула=${pickPoolPhoto(`${slug} ${article.title || ''}`)}`);
        log(`VK: сообщение (первые 120): ${message.slice(0,120).replace(/\n/g,' ⏎ ')}...`);
      } else {
        let attachment = '';
        try {
          const poolPhoto = pickPoolPhoto(`${slug} ${article.title || ''}`);
          const photoId = poolPhoto
            ? await uploadPhoto(poolPhoto)
            : /\.jpe?g$/i.test(article.ogImage || '') ? await uploadPhoto(article.ogImage) : null;
          if (photoId) attachment = photoId;
        } catch (e) { console.warn('Photo upload failed:', e.message); }

        const postParams = { message, owner_id: String(VK_OWNER_ID) };
        if (attachment) postParams.attachments = attachment;
        const result = await vkApi('wall.post', postParams);
        const postId = result.post_id;

        await pool.query(`
          INSERT INTO article_views (slug, views, updated_at, vk_post_id, vk_owner_id, vk_posted_at)
          VALUES ($1, 0, now(), $2, $3, now())
          ON CONFLICT (slug) DO UPDATE SET
            vk_post_id=$2, vk_owner_id=$3, vk_posted_at=now(), updated_at=now()
        `, [slug, String(postId), VK_OWNER_ID]);
        log(`VK: выложен https://vk.com/wall${VK_OWNER_ID}_${postId}`);
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

main().catch(e => { console.error(e.message); process.exit(1); });

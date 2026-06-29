#!/usr/bin/env node
import pg from 'pg';
import fs from 'fs';
import { FormData, File } from 'undici';

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
  const imgRes = await fetch(imageUrl.startsWith('http') ? imageUrl : `${BASE_URL}${imageUrl}`);
  if (!imgRes.ok) return null;
  const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
  const form = new FormData();
  form.append('photo', new File([imgBuffer], 'photo.jpg', { type: 'image/jpeg' }));
  const uploadRes = await fetch(uploadServer.upload_url, { method: 'POST', body: form });
  const uploadData = await uploadRes.json();
  if (!uploadData.photo) return null;
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
  const { rows } = await pool.query(`
    SELECT slug FROM article_views
    WHERE vk_post_id IS NULL
    ORDER BY metrika_visits DESC NULLS LAST, slug ASC
    LIMIT 1
  `);

  if (!rows.length) {
    console.log('all articles posted');
    await pool.end();
    return;
  }

  const { slug } = rows[0];
  const articlesRaw = fs.readFileSync('/opt/social-poster/articles.json', 'utf-8');
  const articles = JSON.parse(articlesRaw);
  const article = articles.find(a => a.slug === slug);

  if (!article) {
    await pool.query(`UPDATE article_views SET vk_post_id='skip', vk_posted_at=now() WHERE slug=$1`, [slug]);
    console.log(`Skipped (not in registry): ${slug}`);
    await pool.end();
    return;
  }

  console.log(`Posting: ${slug}`);

  let attachment = '';
  try {
    const photoId = await uploadPhoto(article.ogImage);
    if (photoId) attachment = photoId;
  } catch (e) {
    console.warn('Photo upload failed:', e.message);
  }

  const message = `${article.title}\n\n${article.description}\n\nЧитать полностью: ${article.url}`;
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

  console.log(`Posted: vk.com/wall${VK_OWNER_ID}_${postId}`);
  await pool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });

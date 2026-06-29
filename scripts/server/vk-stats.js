#!/usr/bin/env node
import pg from 'pg';
import fs from 'fs';

const ENV_RAW = fs.readFileSync('/opt/aidacamp-tools/.env', 'utf-8');
const ENV = Object.fromEntries(
  ENV_RAW.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()]; })
);
const VK_TOKEN = ENV['VK_USER_TOKEN'];
const DB_URL = ENV['DATABASE_URL'];

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
    WHERE vk_post_id IS NOT NULL AND vk_post_id != 'skip'
  `);

  if (!rows.length) {
    console.log('No posted articles yet');
    await pool.end();
    return;
  }

  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const postIds = batch.map(r => `${r.vk_owner_id}_${r.vk_post_id}`).join(',');

    let posts;
    try {
      posts = await vkApi('wall.getById', { posts: postIds, extended: 0 });
    } catch (e) {
      console.error('VK error:', e.message);
      continue;
    }

    for (const post of posts) {
      const row = batch.find(r => String(r.vk_post_id) === String(post.id));
      if (!row) continue;
      await pool.query(`
        UPDATE article_views SET
          vk_likes=$1, vk_reposts=$2, vk_views=$3, vk_stats_at=now()
        WHERE slug=$4
      `, [post.likes?.count ?? 0, post.reposts?.count ?? 0, post.views?.count ?? 0, row.slug]);
    }
    console.log(`Updated ${batch.length} posts`);
  }

  await pool.end();
  console.log('VK stats sync complete');
}

main().catch(e => { console.error(e.message); process.exit(1); });

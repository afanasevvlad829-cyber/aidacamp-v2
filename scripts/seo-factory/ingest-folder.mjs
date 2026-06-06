import fs from 'node:fs'; import path from 'node:path'; import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp', max: 2 });
const KEY = process.env.OPENAI_API_KEY;
const ROOT = process.argv[2];
function walk(d){let r=[];for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())r=r.concat(walk(p));else if(e.name.endsWith('.md'))r.push(p);}return r;}
async function embed(t){const r=await fetch('https://api.openai.com/v1/embeddings',{method:'POST',headers:{'Authorization':`Bearer ${KEY}`,'Content-Type':'application/json'},body:JSON.stringify({input:[t.slice(0,8000)],model:'text-embedding-3-small'})});const d=await r.json();return d.data[0].embedding;}
const files = walk(ROOT);
let total=0, skipped=0;
for (const f of files) {
  const rel = f.replace(ROOT+'/','').replace('.md','');
  const text = fs.readFileSync(f,'utf8');
  const parts = text.split(/\n(?=#{1,3} )/).filter(s=>s.trim().length>80);
  let n=0;
  for (const part of parts) {
    const src = `obsidian-seo:${rel}:${n}`;
    const ex = await pool.query("SELECT 1 FROM knowledge_chunks WHERE source=$1",[src]);
    if (ex.rows.length){skipped++;n++;continue;}
    const emb = await embed(part);
    await pool.query("INSERT INTO knowledge_chunks (source,text,embedding) VALUES ($1,$2,$3::vector)",[src,part.slice(0,2000).replace(/\u0000/g,'').replace(/[\uD800-\uDFFF]/g,''),'['+emb.join(',')+']']);
    total++;n++;
  }
}
console.log(`Залито ${total} новых чанков из ${files.length} файлов (пропущено ${skipped})`);
await pool.end();

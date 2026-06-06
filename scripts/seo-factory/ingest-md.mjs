import fs from 'node:fs'; import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp', max: 2 });
const KEY = process.env.OPENAI_API_KEY;
const [,, file, srcPrefix] = process.argv;
const text = fs.readFileSync(file, 'utf8');
const parts = text.split(/\n(?=#{1,3} )/).filter(s => s.trim().length > 50);
async function embed(t){const r=await fetch('https://api.openai.com/v1/embeddings',{method:'POST',headers:{'Authorization':`Bearer ${KEY}`,'Content-Type':'application/json'},body:JSON.stringify({input:[t.slice(0,8000)],model:'text-embedding-3-small'})});const d=await r.json();return d.data[0].embedding;}
let n=0;
for (const part of parts) {
  const src = `${srcPrefix}:${n}`;
  const ex = await pool.query("SELECT 1 FROM knowledge_chunks WHERE source=$1", [src]);
  if (ex.rows.length) { n++; continue; }
  const emb = await embed(part);
  await pool.query("INSERT INTO knowledge_chunks (source, text, embedding) VALUES ($1,$2,$3::vector)", [src, part.slice(0,2000), '['+emb.join(',')+']']);
  n++;
}
console.log(`Залито ${n} секций как ${srcPrefix}:*`);
await pool.end();

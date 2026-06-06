import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://aidacamp:aidacamp2026@localhost:5432/aidacamp', max: 2 });
const KEY = process.env.OPENAI_API_KEY;
async function embed(t){const r=await fetch('https://api.openai.com/v1/embeddings',{method:'POST',headers:{'Authorization':`Bearer ${KEY}`,'Content-Type':'application/json'},body:JSON.stringify({input:[t],model:'text-embedding-3-small'})});const d=await r.json();return d.data[0].embedding;}
const {rows} = await pool.query("SELECT id, text FROM knowledge_chunks WHERE embedding IS NULL");
console.log(`Без embedding: ${rows.length}`);
for (const row of rows) {
  const emb = await embed(row.text);
  await pool.query("UPDATE knowledge_chunks SET embedding = $1::vector WHERE id = $2", ['['+emb.join(',')+']', row.id]);
  console.log(`  ✅ ${row.id}`);
}
console.log('Готово');
await pool.end();

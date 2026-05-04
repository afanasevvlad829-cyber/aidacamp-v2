const https = require('https');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function generateEmbedding(text) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set');
  }

  const body = JSON.stringify({
    model: 'text-embedding-ada-002',
    input: text.substring(0, 8000)  // Limit to avoid token overflow
  });

  return new Promise((resolve, reject) => {
    const req = https.request('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`OpenAI API error: ${res.statusCode} - ${data.substring(0, 200)}`));
          return;
        }
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.data[0].embedding);
        } catch (e) {
          reject(new Error('Failed to parse OpenAI response'));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('OpenAI timeout')); });
    req.write(body);
    req.end();
  });
}

module.exports = { generateEmbedding };

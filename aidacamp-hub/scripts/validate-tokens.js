const https = require('https');

const TIMEOUT = 5000; // 5 seconds timeout

async function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Request timeout')), TIMEOUT);
    
    const req = https.request(options, (res) => {
      clearTimeout(timeout);
      
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    
    req.end();
  });
}

async function validateMetricaToken(token) {
  // Яндекс.Метрика OAuth
  if (!token) return { status: 'INVALID', reason: 'Token not provided' };
  
  try {
    const response = await makeRequest({
      hostname: 'analytics.api.yandex.com',
      path: '/stat/v1/data?ids=1&metrics=ym:s:visits',
      method: 'GET',
      headers: { 'Authorization': `OAuth ${token}` }
    });
    
    return response.status === 200 
      ? { status: 'VALID', code: 200 }
      : { status: 'INVALID', code: response.status };
  } catch (error) {
    return { status: 'ERROR', reason: error.message };
  }
}

async function validateDirectToken(token) {
  // Яндекс.Директ Bearer token
  if (!token) return { status: 'INVALID', reason: 'Token not provided' };
  
  try {
    const response = await makeRequest({
      hostname: 'api.direct.yandex.com',
      path: '/json/v5/campaigns',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    return (response.status === 200 || response.status === 400)
      ? { status: 'VALID', code: response.status }
      : { status: 'INVALID', code: response.status };
  } catch (error) {
    return { status: 'ERROR', reason: error.message };
  }
}

async function validateVKToken(token) {
  // VK Ads API key
  if (!token) return { status: 'INVALID', reason: 'Token not provided' };
  
  try {
    const response = await makeRequest({
      hostname: 'ads.vk.com',
      path: '/api/v2/campaigns',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    return (response.status === 200 || response.status === 401)
      ? { status: 'VALID', code: response.status }
      : { status: 'INVALID', code: response.status };
  } catch (error) {
    return { status: 'ERROR', reason: error.message };
  }
}

async function validateCRMToken(token) {
  // AlfaCRM X-API-KEY
  if (!token) return { status: 'INVALID', reason: 'Token not provided' };
  
  try {
    const response = await makeRequest({
      hostname: 'api.alfacrm.ru',
      path: '/v2/clients',
      method: 'GET',
      headers: { 'X-API-KEY': token }
    });
    
    return (response.status === 200 || response.status === 401)
      ? { status: 'VALID', code: response.status }
      : { status: 'INVALID', code: response.status };
  } catch (error) {
    return { status: 'ERROR', reason: error.message };
  }
}

async function validateAllTokens(vars) {
  console.log('🔐 Проверяю валидность токенов...\n');
  
  const tests = [
    { name: 'Яндекс.Метрика', fn: validateMetricaToken, envKey: 'YANDEX_METRICA_OAUTH' },
    { name: 'Яндекс.Директ', fn: validateDirectToken, envKey: 'YANDEX_DIRECT_TOKEN' },
    { name: 'VK Ads', fn: validateVKToken, envKey: 'VK_TOKEN' },
    { name: 'AlfaCRM', fn: validateCRMToken, envKey: 'ALFACRM_API_KEY' }
  ];

  const results = {};
  
  for (const test of tests) {
    const token = vars[test.envKey] || process.env[test.envKey];
    console.log(`  🔄 ${test.name}...`);
    
    const result = await test.fn(token);
    results[test.name] = result;
    
    const icon = result.status === 'VALID' ? '✅' : result.status === 'INVALID' ? '❌' : '⚠️';
    console.log(`    ${icon} Status: ${result.status} (code: ${result.code || result.reason})`);
  }
  
  console.log('\n✅ Валидация завершена\n');
  return results;
}

module.exports = { validateMetricaToken, validateDirectToken, validateVKToken, validateCRMToken, validateAllTokens };

// Перегенерация всех страниц из seo_factory_log с исправленным рендером
const fs = require('fs');
const path = require('path');
const F = require('/opt/seo-factory/seo-factory.js');
const PAGES = '/opt/aidacamp-site/src/pages';

(async () => {
  const client = F.getDbClient();
  await client.connect();
  const { rows } = await client.query("SELECT DISTINCT slug, main_keyword FROM seo_factory_log ORDER BY slug");
  let ok = 0, fail = 0;
  for (const r of rows) {
    try {
      const cluster = { clusterKey: r.main_keyword, mainKeyword: r.main_keyword, keywords: [r.main_keyword], maxFreq: 100 };
      const rag = await F.enrichFromRAG(client, cluster).catch(() => ({ insights: [], lsiWords: [] }));
      const type = F.detectType(cluster);
      const vars = type === 'geo' ? F.generateGeoContent(cluster, rag) : F.generateNchContent(cluster, rag);
      const content = F.renderTemplate('nch-landing.astro.tpl', vars);
      // Контроль: не осталось ли {{...}}
      if (/\{\{[A-Z]/.test(content)) { console.log(`  ⚠ ${r.slug}: остались {{}}`); fail++; continue; }
      fs.writeFileSync(path.join(PAGES, `${r.slug}.astro`), content, 'utf8');
      ok++;
    } catch (e) { console.log(`  ✗ ${r.slug}: ${e.message}`); fail++; }
  }
  console.log(`\nРегенерировано: ${ok} ОК, ${fail} ошибок`);
  await client.end();
})();

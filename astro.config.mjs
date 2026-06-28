// ⚠️ ВНИМАНИЕ: Partytown ЗАПРЕЩЁН — не возвращайте его. См. CLAUDE.md → раздел «Запрещённые зависимости»
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';
import compress from '@playform/compress';

export default defineConfig({
  site: 'https://aidacamp.ru',
  adapter: node({ mode: 'standalone' }),
  security: { checkOrigin: false },
  integrations: [
    sitemap({
      // Исключаем служебные и тестовые страницы из sitemap.xml
      // /admin/* — админка загрузки фото, /попробовать/ — внутренняя страница
      filter: (page) =>
        !page.includes('/admin/') &&
        !page.includes('/попробовать/') &&
        !page.includes('/%D0%BF%D0%BE%D0%BF%D1%80%D0%BE%D0%B1%D0%BE%D0%B2%D0%B0%D1%82%D1%8C/') &&
        !page.includes('/demo/') &&
        !page.includes('/dashboard/') &&
        !page.includes('/ask-test/') &&
        !page.includes('/ask/') &&
        !page.includes('/ai-studio/') &&
        !page.includes('/blog/') &&
        // Редирект-стабы и битые страницы — НЕ в sitemap (иначе смешанный сигнал
        // Яндексу: карта говорит «индексируй», страница — noindex/редирект → тормозит перенос)
        !/\/(deti-otdokhnuli-v-letnikh-lageryakh|detskie-letnie-lagerya-v-podmoskove|detskie-ozdorovitelnye-lagerya-2026|detskiy-letniy-lager-v-podmoskove|detskiy-ozdorovitelnyy-lager|kanikuly-otdykh-v-lagere|kupit-putevku-v-lager-2026|kupit-putevku-v-lager|lager-letniy-na-20-dney|lager-v-podmoskove-na-leto-2026-nedorogo|lagerya-v-podmoskove-na-leto-dlya-podrostkov|letnie-lagerya-podmoskove|letnie-lagerya|letniy-lager-dlya-detey-v-moskve|letniy-lager-v-moskve|luchshie-detskie-lagerya-podmoskovya|luchshie-lagerya-v-podmoskove|mesta-v-letniy-lager|nedorogoy-letniy-lager-dlya-detey-v-podmoskove|ob-organizacii-otdyha-detej-i-ozdarovleniya|popali-v-letniy-lager|programma-smeny|putevka-v-detskiy-lager-letom|putevka-v-lager-v-podmoskove-2026|putevki-v-detskiy-lager-na-leto-2026|fortune-fail|smena2-editor)\/?$/.test(page),
      // lastmod = дата деплоя. Даём Google понять, что страницы актуальны.
      // priority: P1=0.9, P2=0.7, P3=0.5 (на основе SEO-архитектуры 2026)
      serialize(item) {
        item.lastmod = new Date().toISOString().split('T')[0];

        // P1: главные коммерческие страницы (высокая частота, высокая конкурентность)
        const P1_EXACT = [
          '/', '/ceny', '/detskiy-lager', '/it-camp',
          '/lager-v-podmoskove', '/lager-na-leto-2026',
          '/kompyuternyy-lager', '/nalogovyj-vychet',
        ];

        // P2: возрастные + тематические + гео + регистрация (среднечастотные кластеры)
        const P2_EXACT = ['/zapisatsya', '/lager-programmirovaniya'];
        const P2_PREFIXES = [
          '/lager-', '/it-', '/python-', '/minecraft-', '/roblox-',
          '/scratch-', '/ai-', '/3d-', '/kompyuternyy-', '/kupit-', '/putevka-',
          '/luchshie-', '/zagorodnyj-', '/ozdorovitelnyj-', '/letnyj-',
          '/obrazovatelnyj-', '/tematicheskiy-', '/proverennyj-',
        ];

        const url = new URL(item.url);
        const path = url.pathname.replace(/\/$/, '') || '/';

        if (P1_EXACT.includes(path)) {
          item.priority = 0.9;
          item.changefreq = 'weekly';
        } else if (P2_EXACT.includes(path) || P2_PREFIXES.some(p => path.startsWith(p))) {
          item.priority = 0.7;
          item.changefreq = 'monthly';
        } else if (path.startsWith('/stati/')) {
          item.priority = 0.6;
          item.changefreq = 'monthly';
        } else {
          item.priority = 0.5;
          item.changefreq = 'monthly';
        }

        return item;
      },
    }),
    compress({
      CSS: true,
      HTML: true,
      JavaScript: true,
      Image: false,
      SVG: false,
    }),
  ],
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
    build: {
      // P2: убираем ненужные полифиллы (Legacy JavaScript −10KB в PageSpeed)
      // esnext = нет транспиляции под старые браузеры, только современный синтаксис
      target: 'esnext',
    },
  },
  build: {
    // CSS инлайнится полностью в HTML — нет блокирующих запросов к CDN за CSS.
    // Было: 'auto' (threshold 4KB) → Base.css 37KB уходил на CDN → блокировал рендер 1350мс.
    // Теперь: 'always' → CSS в <style> в HTML → рендер начинается сразу.
    // Минус: HTML тяжелее на ~70KB, но это компенсируется gzip и отсутствием round-trip к CDN.
    inlineStylesheets: 'always',
    // CDN отключён: cross-origin overhead (DNS+TCP+TLS к huhodirekeka.begetcdn.cloud)
    // замедляет LCP с 1.6s до 3.7s на мобильном тесте. Сервер в России → CDN не даёт
    // выигрыша в latency, только overhead. Откат 2026-05-24.
  },
});
// ⚠️ ВНИМАНИЕ: Partytown ЗАПРЕЩЁН — не возвращайте его. См. CLAUDE.md → раздел «Запрещённые зависимости»
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';

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
        !page.includes('/blog/'),
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
    // Инлайним ВСЕ CSS в <style> в HTML — убирает render-blocking external stylesheet fetch (~400ms)
    // Риск FOUC минимален: Astro гарантирует <style> в <head> до body
    inlineStylesheets: 'always',
  },
});
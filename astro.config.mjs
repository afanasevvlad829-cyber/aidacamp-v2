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
        !page.includes('/%D0%BF%D0%BE%D0%BF%D1%80%D0%BE%D0%B1%D0%BE%D0%B2%D0%B0%D1%82%D1%8C/'),
    }),
  ],
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
  },
});
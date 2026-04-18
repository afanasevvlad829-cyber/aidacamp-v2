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
    sitemap(),
  ],
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()],
  },
});
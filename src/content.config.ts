import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';

// Каталог статей /stati/ — данные генерируются scripts/gen-articles.mjs в articles.json,
// схема здесь только для типизации/валидации при чтении через getCollection('articles').
const articles = defineCollection({
  loader: file('src/data/articles.json'),
  schema: z.object({
    url: z.string(),
    title: z.string(),
    description: z.string(),
    cluster: z.string(),
    tag: z.string(),
    tagColor: z.string(),
    readTime: z.string(),
    date: z.string(),
    ogImage: z.string(),
    ogImageJpg: z.string(),
    contentHtml: z.string(),
  }),
});

export const collections = { articles };

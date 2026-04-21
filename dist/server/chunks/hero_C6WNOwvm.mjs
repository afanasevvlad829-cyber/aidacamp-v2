import { c as createComponent } from './astro-component_BmS5qpDl.mjs';
import 'piccolore';
import { h as renderHead, f as addAttribute, r as renderTemplate } from './server_QJKZbavQ.mjs';
import 'clsx';
import { r as renderScript } from './script_jmqgl5kj.mjs';
import { existsSync } from 'fs';
import { join } from 'path';

const prerender = false;
const $$Hero = createComponent(($$result, $$props, $$slots) => {
  const pages = [
    { slug: "detskiy-lager", h1: "Детский лагерь для детей 7–15 лет", url: "/detskiy-lager/" },
    { slug: "detskiy-lager-podmoskove", h1: "Детский лагерь в Подмосковье с IT-программой", url: "/detskiy-lager-podmoskove/" },
    { slug: "dlya-kompaniy", h1: "Путёвки в лагерь для детей сотрудников", url: "/dlya-kompaniy/" },
    { slug: "kompyuternyy-lager", h1: "Компьютерный лагерь для детей в Подмосковье", url: "/kompyuternyy-lager/" },
    { slug: "kupit-putevku-v-lager", h1: "Купить путёвку в детский лагерь 2026", url: "/kupit-putevku-v-lager/" },
    { slug: "lager-bez-telefonov", h1: "Детский лагерь без телефонов в Подмосковье", url: "/lager-bez-telefonov/" },
    { slug: "lager-dlya-podrostkov", h1: "Летний лагерь для подростков в Подмосковье", url: "/lager-dlya-podrostkov/" },
    { slug: "lager-dlya-shkolnikov", h1: "Летний лагерь для школьников в Подмосковье", url: "/lager-dlya-shkolnikov/" },
    { slug: "lager-na-avgust-podmoskove", h1: "Лагерь на август в Подмосковье", url: "/lager-na-avgust-podmoskove/" },
    { slug: "lager-na-leto-2026", h1: "Летний лагерь на лето 2026", url: "/lager-na-leto-2026/" },
    { slug: "lager-nedorogo", h1: "Летний лагерь в Подмосковье — цены 2026", url: "/lager-nedorogo/" },
    { slug: "lager-programmirovaniya", h1: "Лагерь программирования для детей", url: "/lager-programmirovaniya/" },
    { slug: "lager-v-moskve", h1: "Летний лагерь в Москве и Подмосковье", url: "/lager-v-moskve/" },
    { slug: "lager-v-podmoskove", h1: "Летний лагерь в Подмосковье для детей", url: "/lager-v-podmoskove/" },
    { slug: "letnyaya-it-shkola", h1: "Летняя IT-школа для детей в Подмосковье", url: "/letnyaya-it-shkola/" },
    { slug: "minecraft-lager", h1: "Детский лагерь Майнкрафт в Подмосковье", url: "/minecraft-lager/" },
    { slug: "obrazovatelnyy-lager", h1: "Образовательный лагерь для детей в Подмосковье", url: "/obrazovatelnyy-lager/" },
    { slug: "tematicheskiy-lager", h1: "Тематический лагерь для детей в Подмосковье", url: "/tematicheskiy-lager/" }
  ];
  const heroDirs = [
    join(process.cwd(), "images", "hero"),
    // сервер
    join(process.cwd(), "public", "images", "hero")
    // локально
  ];
  const heroBase = heroDirs.find((d) => {
    try {
      return existsSync(d);
    } catch {
      return false;
    }
  }) ?? heroDirs[0];
  function hasHero(slug) {
    return existsSync(join(heroBase, `${slug}.avif`)) || existsSync(join(heroBase, "thumbs", `${slug}.avif`));
  }
  const withHero = pages.filter((p) => hasHero(p.slug)).length;
  const withoutHero = pages.length - withHero;
  const missingPages = pages.filter((p) => !hasHero(p.slug));
  return renderTemplate`<html lang="ru" data-astro-cid-m3f2qoqu> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Hero-картинки лендингов — АйДаКемп</title>${renderHead()}</head> <body data-astro-cid-m3f2qoqu> <h1 data-astro-cid-m3f2qoqu>Hero-картинки лендингов</h1> <p class="subtitle" data-astro-cid-m3f2qoqu> <span style="color:#16a34a; font-weight:600" data-astro-cid-m3f2qoqu>${withHero} готово</span> ·
<span style="color:#dc2626; font-weight:600" data-astro-cid-m3f2qoqu>${withoutHero} без картинки — закидай сюда</span> </p> <div class="grid" data-astro-cid-m3f2qoqu> ${missingPages.map((page) => {
    return renderTemplate`<div class="row"${addAttribute(`row-${page.slug}`, "id")} data-astro-cid-m3f2qoqu> <!-- Превью --> <div class="preview" data-astro-cid-m3f2qoqu> ${renderTemplate`<div class="empty" data-astro-cid-m3f2qoqu>📷</div>`} </div> <!-- Инфо --> <div class="info" data-astro-cid-m3f2qoqu> <div class="page-title" data-astro-cid-m3f2qoqu>${page.h1}</div> <div class="page-url" data-astro-cid-m3f2qoqu> <a${addAttribute(`https://dev.aidacamp.ru${page.url}`, "href")} target="_blank" data-astro-cid-m3f2qoqu>${page.url}</a> </div> <span${addAttribute(`badge ${"badge-bad"}`, "class")}${addAttribute(`badge-${page.slug}`, "id")} data-astro-cid-m3f2qoqu> ${"✗ нет картинки"} </span> </div> <!-- Dropzone --> <div class="dropzone"${addAttribute(page.slug, "data-slug")}${addAttribute(`dz-${page.slug}`, "id")} data-astro-cid-m3f2qoqu> <input type="file" accept="image/*" data-astro-cid-m3f2qoqu> <div class="dz-icon" data-astro-cid-m3f2qoqu>🖼️</div> <div class="dz-text" data-astro-cid-m3f2qoqu>Перетащи или кликни</div> <div class="dz-status" data-astro-cid-m3f2qoqu></div> <progress max="100" value="0" data-astro-cid-m3f2qoqu></progress> </div> </div>`;
  })} </div> ${renderScript($$result, "/Users/vladimirafanasev/Aidacamp-cloude/src/pages/admin/hero.astro?astro&type=script&index=0&lang.ts")} </body> </html>`;
}, "/Users/vladimirafanasev/Aidacamp-cloude/src/pages/admin/hero.astro", void 0);

const $$file = "/Users/vladimirafanasev/Aidacamp-cloude/src/pages/admin/hero.astro";
const $$url = "/admin/hero";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Hero,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

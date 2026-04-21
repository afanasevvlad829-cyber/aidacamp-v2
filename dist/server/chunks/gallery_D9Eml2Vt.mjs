import { c as createComponent } from './astro-component_BmS5qpDl.mjs';
import 'piccolore';
import { h as renderHead, f as addAttribute, r as renderTemplate } from './server_QJKZbavQ.mjs';
import 'clsx';
import { r as renderScript } from './script_jmqgl5kj.mjs';
import { execSync } from 'child_process';
import { readdirSync } from 'fs';
import { join } from 'path';

const prerender = false;
const $$Gallery = createComponent(($$result, $$props, $$slots) => {
  const galleryDirs = [
    join(process.cwd(), "images", "gallery"),
    // сервер (SSR cwd = current/)
    join(process.cwd(), "public", "images", "gallery")
    // локальная разработка
  ];
  const galleryDir = galleryDirs.find((d) => {
    try {
      readdirSync(d);
      return true;
    } catch {
      return false;
    }
  }) ?? galleryDirs[0];
  let files = [];
  try {
    files = readdirSync(galleryDir).filter((f) => f.endsWith(".avif") && !f.startsWith(".")).sort();
  } catch {
  }
  function getInfo(file) {
    const name = file.replace(".avif", "");
    let width = 0, height = 0;
    try {
      const out = execSync(`identify -format "%wx%h" "${join(galleryDir, file)}" 2>/dev/null`, { timeout: 5e3 }).toString().trim();
      const m = out.match(/^(\d+)x(\d+)/);
      if (m) {
        width = +m[1];
        height = +m[2];
      }
    } catch {
    }
    const max = Math.max(width, height);
    const quality = max >= 1100 ? "good" : max >= 800 ? "ok" : "bad";
    return { name, file, width, height, quality };
  }
  const images = files.map(getInfo);
  const goodCount = images.filter((i) => i.quality === "good").length;
  const badCount = images.filter((i) => i.quality !== "good").length;
  return renderTemplate`<html lang="ru" data-astro-cid-n5ll6ix5> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Загрузка фото галереи — АйДаКемп</title>${renderHead()}</head> <body data-astro-cid-n5ll6ix5> <h1 data-astro-cid-n5ll6ix5>Галерея — загрузка фото</h1> <p class="subtitle" data-astro-cid-n5ll6ix5> <span style="color:#16a34a" data-astro-cid-n5ll6ix5>${goodCount} фото в норме</span> ·
<span style="color:#dc2626" data-astro-cid-n5ll6ix5>${badCount} нужна замена</span> ·
    Перетащи новое фото напротив нужного — оно сразу заменится на сервере
</p> <div class="grid" data-astro-cid-n5ll6ix5> ${images.map((img) => renderTemplate`<div class="row" data-astro-cid-n5ll6ix5> <div class="thumb-wrap" data-astro-cid-n5ll6ix5> <img${addAttribute(`/images/gallery/thumbs/${img.file}`, "src")}${addAttribute(img.name, "alt")} loading="lazy" onerror="this.src='/images/gallery/'+this.dataset.file"${addAttribute(img.file, "data-file")} data-astro-cid-n5ll6ix5> </div> <div class="info" data-astro-cid-n5ll6ix5> <div class="fname" data-astro-cid-n5ll6ix5>${img.name}.avif</div> <div class="res" data-astro-cid-n5ll6ix5>${img.width > 0 ? `${img.width}×${img.height}` : "—"}</div> <span${addAttribute(`badge badge-${img.quality}`, "class")} data-astro-cid-n5ll6ix5> ${img.quality === "good" ? "✓ хорошее" : img.quality === "ok" ? "≈ сойдёт" : "✗ нужна замена"} </span> </div> <div class="dropzone"${addAttribute(img.name, "data-name")}${addAttribute(`dz-${img.name}`, "id")} data-astro-cid-n5ll6ix5> <input type="file" accept="image/*" data-astro-cid-n5ll6ix5> <div class="dz-icon" data-astro-cid-n5ll6ix5>📷</div> <div class="dz-text" data-astro-cid-n5ll6ix5>Перетащи или кликни</div> <div class="dz-status" data-status data-astro-cid-n5ll6ix5></div> <progress max="100" value="0" data-astro-cid-n5ll6ix5></progress> </div> </div>`)} </div> ${renderScript($$result, "/Users/vladimirafanasev/Aidacamp-cloude/src/pages/admin/gallery.astro?astro&type=script&index=0&lang.ts")} </body> </html>`;
}, "/Users/vladimirafanasev/Aidacamp-cloude/src/pages/admin/gallery.astro", void 0);

const $$file = "/Users/vladimirafanasev/Aidacamp-cloude/src/pages/admin/gallery.astro";
const $$url = "/admin/gallery";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Gallery,
  file: $$file,
  prerender,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

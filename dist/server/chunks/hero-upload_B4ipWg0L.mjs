import { writeFile, mkdir } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { extname, join } from 'path';

const prerender = false;
const execFileAsync = promisify(execFile);
const ALLOWED_SLUGS = /* @__PURE__ */ new Set([
  "detskiy-lager-podmoskove",
  "detskiy-lager",
  "dlya-kompaniy",
  "kompyuternyy-lager",
  "kupit-putevku-v-lager",
  "lager-bez-telefonov",
  "lager-dlya-podrostkov",
  "lager-dlya-shkolnikov",
  "lager-na-avgust-podmoskove",
  "lager-na-leto-2026",
  "lager-nedorogo",
  "lager-programmirovaniya",
  "lager-v-moskve",
  "lager-v-podmoskove",
  "letnyaya-it-shkola",
  "minecraft-lager",
  "obrazovatelnyy-lager",
  "tematicheskiy-lager"
]);
const HDR_ARGS = [
  "-modulate",
  "103,130,100",
  "-sigmoidal-contrast",
  "4,50%",
  "-level",
  "3%,97%",
  "-unsharp",
  "0x0.5+0.8+0.02"
];
const GET = () => new Response(JSON.stringify({ status: "hero-upload API ready" }), {
  headers: { "Content-Type": "application/json" }
});
const POST = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const slug = formData.get("slug")?.trim();
    if (!file || !slug) return err("Нет файла или slug", 400);
    if (!ALLOWED_SLUGS.has(slug)) return err(`Неизвестный slug: ${slug}`, 400);
    const buffer = Buffer.from(await file.arrayBuffer());
    const origExt = extname(file.name || ".jpg") || ".jpg";
    const tmp = `/tmp/hero-up-${Date.now()}-${slug}${origExt}`;
    await writeFile(tmp, buffer);
    const cwd = process.cwd();
    const heroDir = join(cwd, "images", "hero");
    const origDir = join(heroDir, "originals");
    const thumbDir = join(heroDir, "thumbs");
    const jpgDir = join(heroDir, "jpg");
    await mkdir(origDir, { recursive: true });
    await mkdir(thumbDir, { recursive: true });
    await mkdir(jpgDir, { recursive: true });
    await writeFile(join(origDir, `${slug}${origExt}`), buffer);
    const isHeic = /\.(heic|heif)$/i.test(origExt);
    const tmpIn = isHeic ? `${tmp}[0]` : tmp;
    const outAvif = join(heroDir, `${slug}.avif`);
    await execFileAsync("convert", [tmpIn, ...HDR_ARGS, outAvif]);
    const outJpg = join(jpgDir, `${slug}.jpg`);
    await execFileAsync("convert", [tmpIn, ...HDR_ARGS, "-quality", "90", outJpg]);
    const outThumb = join(thumbDir, `${slug}.avif`);
    await execFileAsync("convert", [outAvif, "-resize", "400x", "-quality", "75", outThumb]);
    await execFileAsync("rm", ["-f", tmp]);
    return new Response(JSON.stringify({ ok: true, slug, avif: `/images/hero/${slug}.avif`, jpg: `/images/hero/jpg/${slug}.jpg` }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error("hero-upload:", e);
    return err(String(e?.message ?? e), 500);
  }
};
function err(msg, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

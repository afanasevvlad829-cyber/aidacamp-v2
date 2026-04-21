import { writeFile, mkdir } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { extname, join } from 'path';

const prerender = false;
const execFileAsync = promisify(execFile);
const ALLOWED = /* @__PURE__ */ new Set([
  "IMG_7209",
  "IMG_7212",
  "IMG_7219",
  "camp-group-beanbags",
  "camp-smile",
  "camp-two-beanbags",
  "food-buffet",
  "food-kids-peace",
  "food-tray",
  "gallery-01",
  "gallery-03",
  "gallery-04",
  "gallery-05",
  "gallery-06",
  "gallery-08",
  "gallery-10",
  "gallery-11",
  "gallery-12",
  "hackathon-present",
  "pool-interior",
  "pool-kids-edge",
  "pool-noodles",
  "sport-ball",
  "sport-field",
  "sport-football",
  "sport-goal",
  "sport-volleyball",
  "study-coding",
  "study-dome-group",
  "study-dome-row",
  "study-pitch",
  "study-stage-girl",
  "territory-admin",
  "territory-alley",
  "territory-korpus"
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
const GET = () => json({ status: "gallery-upload API ready" });
const POST = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const name = formData.get("name")?.trim();
    if (!file || !name) {
      return json({ error: "Нет файла или имени" }, 400);
    }
    if (!ALLOWED.has(name)) {
      return json({ error: `Неизвестное имя: ${name}` }, 400);
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const origExt = extname(file.name || ".jpg") || ".jpg";
    const tmp = `/tmp/gallery-up-${Date.now()}-${name}${origExt}`;
    await writeFile(tmp, buffer);
    const cwd = process.cwd();
    const galleryDir = join(cwd, "images", "gallery");
    const originalsDir = join(galleryDir, "originals");
    const thumbsDir = join(galleryDir, "thumbs");
    const jpgDir = join(galleryDir, "jpg");
    await mkdir(originalsDir, { recursive: true });
    await mkdir(thumbsDir, { recursive: true });
    await mkdir(jpgDir, { recursive: true });
    const origOut = join(originalsDir, `${name}${origExt}`);
    await writeFile(origOut, buffer);
    const isHeic = /\.(heic|heif)$/i.test(origExt);
    const tmpIn = isHeic ? `${tmp}[0]` : tmp;
    const outAvif = join(galleryDir, `${name}.avif`);
    await execFileAsync("convert", [tmpIn, ...HDR_ARGS, outAvif]);
    const outJpg = join(jpgDir, `${name}.jpg`);
    await execFileAsync("convert", [tmpIn, ...HDR_ARGS, "-quality", "90", outJpg]);
    const outThumb = join(thumbsDir, `${name}.avif`);
    await execFileAsync("convert", [outAvif, "-resize", "400x", "-quality", "75", outThumb]);
    await execFileAsync("rm", ["-f", tmp]);
    return json({ ok: true, name, avif: outAvif, jpg: outJpg, original: origOut });
  } catch (err) {
    console.error("gallery-upload error:", err);
    return json({ error: String(err?.message ?? err) }, 500);
  }
};
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
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

#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const ASSETS = path.join(ROOT, "assets");
const ICONS_ROOT = path.join(ROOT, "icons");
const PORT = Number(process.env.PORT || 4182);

const MIME = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".avif", "image/avif"],
  [".json", "application/json; charset=utf-8"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

function resolveCandidates(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]).replace(/\/+$/, "") || "/";
  const rel = cleanPath === "/" ? "index.html" : cleanPath.slice(1);
  const candidates = [];

  if (cleanPath.startsWith("/assets/")) {
    candidates.push(path.join(ASSETS, cleanPath.slice("/assets/".length)));
  } else if (cleanPath.startsWith("/cdn/")) {
    candidates.push(path.join(DIST, cleanPath.slice(1)));
  } else if (cleanPath.startsWith("/images/")) {
    candidates.push(path.join(DIST, cleanPath.slice(1)));
  } else if (cleanPath.startsWith("/icons/")) {
    candidates.push(path.join(DIST, cleanPath.slice(1)));
    candidates.push(path.join(ICONS_ROOT, cleanPath.slice(1)));
    if (cleanPath === "/icons/faq/home.svg") {
      candidates.push(path.join(ASSETS, "icons", "phone-mobile.svg"));
    }
  } else {
    candidates.push(path.join(DIST, rel));
    candidates.push(path.join(ROOT, rel));
  }

  return candidates;
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  res.statusCode = 200;
  res.setHeader("Content-Type", MIME.get(ext) || "application/octet-stream");
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const reqPath = req.url || "/";
  const candidates = resolveCandidates(reqPath);
  for (const filePath of candidates) {
    try {
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        return sendFile(res, filePath);
      }
    } catch {}
  }
  res.statusCode = 404;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Not found");
});

server.listen(PORT, "127.0.0.1", () => {
  process.stdout.write(`local-runtime-server: http://127.0.0.1:${PORT}/index.html\n`);
});

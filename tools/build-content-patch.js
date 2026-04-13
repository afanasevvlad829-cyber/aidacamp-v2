#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const csvPath = process.argv[2] || path.join(ROOT, "docs/content/content_matrix.csv");
const outPath = process.argv[3] || path.join(ROOT, "docs/content/content_updates.patch.json");

function parseCsv(text) {
  const rows = [];
  let i = 0;
  let cell = "";
  let row = [];
  let inQuotes = false;

  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 2;
        continue;
      }
      if (ch === '"') {
        inQuotes = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      i += 1;
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i += 1;
      continue;
    }
    if (ch === "\r") {
      i += 1;
      continue;
    }
    cell += ch;
    i += 1;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function main() {
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`);
    process.exit(1);
  }

  const csv = fs.readFileSync(csvPath, "utf8");
  const matrix = parseCsv(csv);
  if (!matrix.length) {
    console.error("CSV is empty");
    process.exit(1);
  }

  const headers = matrix[0];
  const idx = Object.fromEntries(headers.map((h, pos) => [h, pos]));
  const required = ["content_id", "content_path", "current_text", "new_text"];
  for (const key of required) {
    if (!(key in idx)) {
      console.error(`Missing required column: ${key}`);
      process.exit(1);
    }
  }

  const updates = [];
  const seen = new Set();

  for (let r = 1; r < matrix.length; r += 1) {
    const row = matrix[r];
    const id = (row[idx.content_id] || "").trim();
    const contentPath = (row[idx.content_path] || "").trim();
    const currentText = (row[idx.current_text] || "").trim();
    const newText = (row[idx.new_text] || "").trim();
    if (!id || !contentPath) continue;
    if (seen.has(id)) {
      console.error(`Duplicate content_id: ${id}`);
      process.exit(1);
    }
    seen.add(id);
    if (!newText || newText === currentText) continue;
    updates.push({
      content_id: id,
      content_path: contentPath,
      current_text: currentText,
      new_text: newText
    });
  }

  const payload = {
    generated_at: new Date().toISOString(),
    source_csv: path.relative(ROOT, csvPath),
    updates_count: updates.length,
    updates
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
  console.log(`Prepared patch: ${path.relative(ROOT, outPath)} (${updates.length} updates)`);
}

main();

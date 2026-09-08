/**
 * Имя иконки для <Icon> (astro-icon). В данных имена бывают с префиксом `bi-` и без.
 * Две иконки (blocks, phone-x) — наши SVG из src/styles/custom-icons (в Iconify-наборе
 * bi их нет), astro-icon отдаёт их из локальной коллекции по имени без префикса.
 */
const CUSTOM_ICONS = new Set(['blocks', 'phone-x']);

export function iconName(raw: string | undefined | null, fallback = 'file-text'): string {
  const name = String(raw ?? fallback).replace(/^bi-/, '');
  return CUSTOM_ICONS.has(name) ? name : `bi:${name}`;
}

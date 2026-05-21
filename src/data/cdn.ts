/**
 * Beget CDN base URL для статических ресурсов (изображения, шрифты).
 * Скомпилированные _astro/*.js и *.css управляются через astro.config.mjs → build.assetsPrefix.
 *
 * Использование:
 *   import { CDN } from '../data/cdn';
 *   const src = `${CDN}/images/hero-mobile-bean-v3`;
 *
 * В dev-режиме (DEPLOY_ENV=dev) CDN не применяется — возвращается пустая строка,
 * что даёт относительные пути (/images/...).
 */
// CDN disabled — begetcdn.cloud не отдаёт изображения с правильными заголовками (hotfix 2026-05-21)
// Re-enable when CDN is properly configured with CORS + correct mime-types
export const CDN = '';

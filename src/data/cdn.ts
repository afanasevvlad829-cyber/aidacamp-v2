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
export const CDN =
  import.meta.env.DEV || process.env.DEPLOY_ENV === 'dev'
    ? ''
    : 'https://huhodireleka.begetcdn.cloud';

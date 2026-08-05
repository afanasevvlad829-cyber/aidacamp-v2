/**
 * Централизованный реестр точечных SEO-переопределений текста в общих
 * компонентах — правки под конкретную страницу, без изменения дефолта
 * для остальных страниц, которые используют тот же компонент.
 *
 * Зачем отдельный реестр, а не просто литерал в вызове компонента на
 * странице: без него узнать, что на сайте вообще переопределено и почему,
 * можно только полнотекстовым поиском по 260+ страницам. Реестр — это
 * единственное место, где видно всё сразу + reason objясняет, под какую
 * цель Лабрики сделана правка и когда её стоит пересмотреть.
 *
 * Сами компоненты не знают про этот файл — они как были с обычными
 * опциональными пропсами (`title?`, `heading?`, `mismatchLinkText?` и
 * т.п.), так и остались. Страница явно импортирует свою запись и явно
 * передаёт `.value` в проп — никакой магии по `Astro.url.pathname`.
 *
 * reason обязателен: дата проверки + что за ключ/цель Лабрики закрывает.
 * Страж — scripts/check-content-overrides.mjs (npm run check:content-overrides,
 * встроен в `guard`) — падает, если путь страницы не существует в src/pages
 * (значит запись осиротела после переименования/удаления) или если у
 * записи нет reason.
 */

export interface ContentOverrideEntry {
  value: string;
  /** Дата (YYYY-MM-DD) + какую цель Лабрики закрывает эта правка. */
  reason: string;
}

export interface PageContentOverrides {
  /** RelatedPages: title? */
  relatedPagesTitle?: ContentOverrideEntry;
  /** Shifts → ShiftsGuideLink: shiftsGuideLinkText? / mismatchLinkText? */
  shiftsGuideLinkText?: ContentOverrideEntry;
}

export const CONTENT_OVERRIDES: Record<string, PageContentOverrides> = {
  '/lager-elektrostal/': {
    relatedPagesTitle: {
      value: 'Похожие направления рядом',
      reason: 'Labrika 2026-08-05: «лагерь»(точное) 4→2, цель 2-3',
    },
    shiftsGuideLinkText: {
      value: 'Кому не подходит — честный список причин',
      reason: 'Labrika 2026-08-05: «лагерь»(точное) 4→2, цель 2-3',
    },
  },
  '/lager-mytishchi/': {
    relatedPagesTitle: {
      value: 'Похожие направления рядом',
      reason: 'Labrika 2026-08-05: «лагерь»(точное) цель 3-4, снять 2 общих вхождения',
    },
    shiftsGuideLinkText: {
      value: 'Кому не подходит — честный список причин',
      reason: 'Labrika 2026-08-05: «лагерь»(точное) цель 3-4, снять 2 общих вхождения',
    },
  },
  '/lager-pushkino/': {
    relatedPagesTitle: {
      value: 'Похожие направления рядом',
      reason: 'Labrika 2026-08-05: «лагерь»(точное) было 12, цель 4-5 — переизбыток, убрать где можно',
    },
    shiftsGuideLinkText: {
      value: 'Кому не подходит — честный список причин',
      reason: 'Labrika 2026-08-05: «лагерь»(точное) было 12, цель 4-5 — переизбыток, убрать где можно',
    },
  },
  '/lager-odintsovo/': {
    relatedPagesTitle: {
      value: 'Похожие направления рядом',
      reason: 'Labrika 2026-08-05: «лагерь»(точное) 5→3, цель 3',
    },
    shiftsGuideLinkText: {
      value: 'Кому не подходит — честный список причин',
      reason: 'Labrika 2026-08-05: «лагерь»(точное) 5→3, цель 3',
    },
  },
};

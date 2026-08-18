import { describe, it, expect } from 'vitest';
import { TRUSTED_PATTERNS } from './rag';

/**
 * Эмуляция семантики PostgreSQL LIKE для проверки белого списка:
 * `%` — любая последовательность, `_` — один любой символ, `\_` — литеральный underscore
 * (дефолтный escape-символ в Postgres — backslash).
 */
function likeToRegExp(pattern: string): RegExp {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '\\' && i + 1 < pattern.length) {
      re += pattern[i + 1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      i++;
    } else if (ch === '%') {
      re += '[\\s\\S]*';
    } else if (ch === '_') {
      re += '[\\s\\S]';
    } else {
      re += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${re}$`);
}

const matchesWhitelist = (source: string) =>
  TRUSTED_PATTERNS.some(p => likeToRegExp(p).test(source));

describe('TRUSTED_PATTERNS (белый список trusted-тира RAG)', () => {
  it('пропускает брендовые источники АйДаКемп', () => {
    const brand = [
      'site:detskiy-lager',
      'site_facts_2026',
      'site_faq_2026',
      'site_reviews_2026',
      'site_stories_2026',
      'site_objections_2026',
      'darya_qa:1013419057',
      'darya_story_1_indulgentziya',
      'darya_video_20240627_-_Про_еду_в_лагере',
      'article_lager-podolsk',
      'article_index',
      'publication_678f245d78cb735a1611e480',
      'pub_678f2447b045124589f95943',
      'audio_2026-04-22_13-38-57',
      'kb_shifts_2026',
      'kb_tax_deduction_2026',
      'kb_prices_discounts_2026',
      'accommodation_detailed_2026',
      'menu_detailed_2026',
      'otzyvy_yandex',
      // возвращены 17.07 после парного эвала (просадка «цена»/«документы»)
      'ceny',
      'faq',
      'ДОГОВОР бронирвания 2026',
    ];
    for (const s of brand) {
      expect(matchesWhitelist(s), `должен пройти: ${s}`).toBe(true);
    }
  });

  it('НЕ пропускает служебные источники и контент других сайтов', () => {
    const junk = [
      'seo-ext:keyword-cluster',
      'seo-tools-stack',
      'seo_insight',
      'report:audit-2026',
      'notes:internal',
      'claude_session:abc',
      'obsidian:vault',
      'site-codims:index',
      'site-icepartners:main',
      'site-vlad-a:uslugi',
      'site2:ceny',        // спорный дубликат краулинга — сознательно не включён
      'vlad-a:page',
      'codims:page',
      'icepartners:page',
      'docx:Методические_рекомендации_к_проведению_хакатона',
      'coordination',
      'tools',
      'skills',
      'dev',
      'tg_dialog:1086',    // диалоговый тир — отдельный запрос, не trusted
      'wa_dialog:6775',
    ];
    for (const s of junk) {
      expect(matchesWhitelist(s), `не должен пройти: ${s}`).toBe(false);
    }
  });

  it('underscore в паттернах экранирован (нет паттернов с «голым» _ перед %)', () => {
    // Голый `_` в LIKE = «любой символ»: 'site_%' зацепил бы 'site-codims'.
    for (const p of TRUSTED_PATTERNS) {
      expect(p, `неэкранированный _ в паттерне: ${p}`).not.toMatch(/(^|[^\\])_/);
    }
  });
});

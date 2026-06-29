export const prerender = false; // всегда свежие данные из shifts/faq/articles
import type { APIRoute } from 'astro';
import { mainShifts } from '../data/shifts';
import { getCurrentPrice } from '../data/dynamicPrices';
import { faqCategories } from '../data/faq';
import { landingPages } from '../data/landing-pages';
import { ARTICLES, CLUSTERS } from '../data/articles';
import { STAT_DISTANCE, STAT_YEARS, STAT_KIDS, STAT_RATING, PHONE_MAIN, EMAIL, CAMP_SEASON } from '../data/contacts';

const BASE = 'https://aidacamp.ru';

const fmtPrice = (id: string, fallback: string) => {
  const p = getCurrentPrice(id);
  return p ? `${p.toLocaleString('ru-RU')} ₽` : fallback;
};

export const GET: APIRoute = () => {
  // Смены
  const shifts = mainShifts
    .map((s) => `- **${s.name}** — ${s.dates}, ${s.duration}, от ${fmtPrice(s.id, s.price)}. ${BASE}/shifts/${s.id}/`)
    .join('\n');

  // FAQ — все вопросы/ответы по категориям
  const faq = faqCategories
    .map((cat) => {
      const items = cat.items.map((it) => `**В: ${it.q}**\nО: ${it.a}`).join('\n\n');
      return `### ${cat.label}\n${items}`;
    })
    .join('\n\n');

  // Ключевые страницы
  const pages = landingPages
    .map((p) => `- [${p.title}](${BASE}${p.url}) — ${p.description}`)
    .join('\n');

  // Статьи блога, сгруппированы по кластеру
  const clusterLabel: Record<string, string> = Object.fromEntries(
    (CLUSTERS ?? []).map((c: { id: string; label?: string }) => [c.id, c.label ?? c.id]),
  );
  const byCluster = new Map<string, string[]>();
  for (const a of ARTICLES) {
    const key = clusterLabel[a.cluster] ?? a.cluster ?? 'Прочее';
    const url = a.url ?? `/stati/${a.slug}/`;
    if (!byCluster.has(key)) byCluster.set(key, []);
    byCluster.get(key)!.push(`- [${a.title}](${BASE}${url})${a.description ? ` — ${a.description}` : ''}`);
  }
  const articles = [...byCluster.entries()]
    .map(([label, list]) => `### ${label}\n${list.join('\n')}`)
    .join('\n\n');

  const body = `# АйДаКемп — детский IT-лагерь в Подмосковье (полная справка)

> АйДаКемп — летний IT-лагерь для детей 7–15 лет в Подмосковье. Программирование (Python, Scratch, Minecraft, Roblox, AI, 3D-моделирование), собственный проект за смену. Проживание, 5-разовое питание, бассейн включены. Лицензия Минобрнауки, налоговый вычет 13%.

## Факты
- Возраст: 7–15 лет, группы до 8 человек
- Расположение: Московская область, Наро-Фоминский округ, санаторий «Изумруд», ${STAT_DISTANCE} от МКАД
- Опыт: ${STAT_YEARS} лет работы, более ${STAT_KIDS} детей, рейтинг ${STAT_RATING} на Яндекс Картах
- Сезон: ${CAMP_SEASON}
- Включено: проживание, 5-разовое питание, IT-программа, бассейн, медработник 24/7
- Лицензия образовательная (Минобрнауки) → налоговый вычет 13%
- Контакты: ${PHONE_MAIN}, ${EMAIL}

## Открытые смены (бронируются сейчас)
${shifts}

## Частые вопросы (FAQ)
${faq}

## Страницы лагеря
${pages}

## Статьи блога (${ARTICLES.length})
${articles}
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=UTF-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};

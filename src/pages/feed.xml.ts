export const prerender = false;
import type { APIRoute } from 'astro';
import { getCurrentPrice } from '../data/dynamicPrices';
import { mainShifts } from '../data/shifts';

const BASE_URL = 'https://aidacamp.ru';

// Только смены 3 и 4 для Яндекс.Бизнес
const FEED_SHIFT_IDS = ['shift-3', 'shift-4'];

// Яндекс.Бизнес фид не читает AVIF — только JPG/PNG большого размера (1600×1200, 4:3).
const PICTURES: Record<string, string[]> = {
  'shift-3': [
    `${BASE_URL}/images/hero/jpg/lager-programmirovaniya.jpg`,
    `${BASE_URL}/images/hero/jpg/letnyaya-it-shkola.jpg`,
    `${BASE_URL}/images/hero/jpg/detskiy-lager-podmoskove.jpg`,
  ],
  'shift-4': [
    `${BASE_URL}/images/hero/jpg/kompyuternyy-lager.jpg`,
    `${BASE_URL}/images/hero/jpg/lager-programmirovaniya.jpg`,
    `${BASE_URL}/images/hero/jpg/letnyaya-it-shkola.jpg`,
  ],
};

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const GET: APIRoute = () => {
  const now = new Date();
  const dateStr = now.toISOString().replace('T', ' ').slice(0, 16);

  const shifts = mainShifts.filter(s => FEED_SHIFT_IDS.includes(s.id));

  const offers = shifts.map(shift => {
    const price = getCurrentPrice(shift.id, now) ?? parseInt(shift.price.replace(/\D/g, ''), 10);
    const pics = (PICTURES[shift.id] ?? []).map(url => `    <picture>${esc(url)}</picture>`).join('\n');
    const desc = `Летний IT-лагерь для детей 7–15 лет. ${shift.dates}, ${shift.duration}. `
      + `Программирование с AI, собственный проект, командная работа. `
      + `Подмосковье, пансионат «Изумруд». Возможен налоговый вычет 13%.`;

    return `  <offer id="${esc(shift.id)}">
    <name>${esc(`АйДаКемп — ${shift.name} (${shift.dates})`)}</name>
    <url>${BASE_URL}/#shifts</url>
    <price>${price}</price>
    <currencyId>RUR</currencyId>
    <categoryId>1</categoryId>
    <description>${esc(desc)}</description>
${pics}
    <vendor>АйДаКемп</vendor>
  </offer>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="${dateStr}">
  <shop>
    <name>АйДаКемп</name>
    <company>АйДаКемп</company>
    <url>${BASE_URL}</url>
    <currencies>
      <currency id="RUR" rate="1"/>
    </currencies>
    <categories>
      <category id="1">Летние IT-смены</category>
    </categories>
    <offers>
${offers}
    </offers>
  </shop>
</yml_catalog>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=UTF-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};

export const prerender = false; // как feed.xml.ts — всегда свежие цены/смены из shifts.ts
import type { APIRoute } from 'astro';
import { mainShifts, SEASON_YEAR } from '../data/shifts';
import { getCurrentPrice } from '../data/dynamicPrices';

const BASE = 'https://aidacamp.ru';

const fmtPrice = (id: string, fallback: string) => {
  const p = getCurrentPrice(id);
  return p ? `${p.toLocaleString('ru-RU')} ₽` : fallback;
};

export const GET: APIRoute = () => {
  const shifts = mainShifts
    .map((s) => `- [${s.name}](${BASE}/shifts/${s.id}/): ${s.dates}, ${s.duration}, от ${fmtPrice(s.id, s.price)}`)
    .join('\n');

  const body = `# АйДаКемп — детский IT-лагерь в Подмосковье

> АйДаКемп — летний IT-лагерь для детей 7–15 лет в Подмосковье (66 км от МКАД, Наро-Фоминский округ, санаторий «Изумруд»). Программирование (Python, Scratch, Minecraft, Roblox, AI, 3D-моделирование), собственный проект за смену, бассейн, проживание и 5-разовое питание включены. Лицензия Минобрнауки, налоговый вычет 13%.

## Открытые смены (бронируются сейчас)
${shifts}

## Основные страницы
- [Главная](${BASE}/): детский IT-лагерь в Подмосковье ${SEASON_YEAR}
- [Цены](${BASE}/ceny/): стоимость смен, что входит, рассрочка
- [Размещение](${BASE}/razmeshchenie/): корпус, питание, бассейн
- [Налоговый вычет](${BASE}/nalogovyj-vychet/): возврат 13% за IT-лагерь
- [Программа IT-лагеря](${BASE}/stati/programma-it-lagerya/): расписание дня, IT-треки
- [Отзывы](${BASE}/otzyvy/): отзывы родителей, рейтинг 5.0 на Яндекс Картах
- [Фото](${BASE}/foto/): фотографии из лагеря
- [Задать вопрос](${BASE}/ask/): AI-ассистент и форма вопроса

## Программы (IT-треки)
- [Python-лагерь](${BASE}/python-lager/): программирование на Python
- [Minecraft-лагерь](${BASE}/minecraft-lager/): разработка игр в Minecraft
- [Scratch-лагерь](${BASE}/scratch-lager/): Scratch для начинающих
- [Roblox-лагерь](${BASE}/roblox-lager/): разработка в Roblox Studio
- [AI-лагерь](${BASE}/ai-lager/): нейросети и искусственный интеллект для детей
- [3D-моделирование](${BASE}/3d-modelirovanie-lager/): 3D-моделирование для детей

## Факты
- Возраст: 7–15 лет, группы до 8 человек
- Расположение: Московская область, Наро-Фоминский округ, 66 км от МКАД
- Включено: проживание, 5-разовое питание, IT-программа, бассейн, медработник 24/7
- Лицензия образовательная (Минобрнауки) → налоговый вычет 13%
- Трансфер от м. Солнцево — опция
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=UTF-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};

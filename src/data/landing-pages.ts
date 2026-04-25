/**
 * Единый источник правды для всех лендингов АйДаКемп.
 *
 * Используется:
 *   - src/pages/index.astro — полный список для блока "все лендинги"
 *   - src/pages/*.astro (каждый лендинг) — через getRelatedPages() для блока RelatedPages
 *
 * Порядок важен: верхние ссылки получают больше веса. Якорные тексты =
 * точные целевые ключи word-keeper.ru для усиления ранжирования.
 *
 * Иконки строго из Bootstrap Icons — см. src/styles/icons.css (subset). Если
 * добавляешь новую иконку в массив — обязательно добавь её mask-image в icons.css.
 */

export interface LandingPage {
  title: string;
  description: string;
  url: string;
  /** Bootstrap Icons class без префикса bi-, напр. "house-heart" или "bi-house-heart" */
  icon: string;
}

export const landingPages: LandingPage[] = [
  // ⭐ Жирные общие ключи — первыми
  { title: 'Лучшие детские лагеря Подмосковья', description: 'Рейтинг 5.0, лицензия Минобрнауки', url: '/luchshie-detskie-lagerya', icon: 'bi-trophy' },
  { title: 'Проверенный детский лагерь', description: 'Лицензия, РТО, 5.0 — всё проверяется', url: '/proverennyj-lager', icon: 'bi-patch-check-fill' },
  { title: 'Летний школьный лагерь', description: 'IT-программа для школьников 7–15 лет', url: '/letnyj-shkolnyj-lager', icon: 'bi-mortarboard' },
  { title: 'Загородный лагерь', description: 'Лес, бассейн, 66 км от Москвы', url: '/zagorodnyj-lager', icon: 'bi-tree' },
  { title: 'Детский лагерь', description: 'Для детей 7–15 лет в Подмосковье', url: '/detskiy-lager', icon: 'bi-house-heart' },
  { title: 'Детский лагерь в Подмосковье', description: '66 км от Москвы, проживание', url: '/detskiy-lager-podmoskove', icon: 'bi-houses' },
  { title: 'Лагерь в Подмосковье', description: 'Загородный, с бассейном', url: '/lager-v-podmoskove', icon: 'bi-tree' },
  { title: 'Лагерь на лето 2026', description: 'Смены июнь–август, календарь', url: '/lager-na-leto-2026', icon: 'bi-calendar-heart' },
  { title: 'Лагерь в Москве', description: 'Ближнее Подмосковье, 66 км от МКАД', url: '/lager-v-moskve', icon: 'bi-geo-alt' },

  // 🎯 Тематические IT
  { title: 'AI-лагерь для детей', description: 'Нейросети, ChatGPT API, AI-проекты', url: '/ai-lager', icon: 'bi-cpu' },
  { title: 'Лагерь с бассейном', description: 'Открытый бассейн, всё включено', url: '/lager-s-basseynom', icon: 'bi-sun' },
  { title: 'IT лагерь', description: 'Компьютерный лагерь, Python и AI', url: '/kompyuternyy-lager', icon: 'bi-laptop' },
  { title: 'Лагерь программирования', description: 'От кода до проекта', url: '/lager-programmirovaniya', icon: 'bi-keyboard' },
  { title: 'Лагерь Майнкрафт', description: 'Minecraft Education, создание модов', url: '/minecraft-lager', icon: 'bi-controller' },
  { title: 'Лагерь Python', description: 'Python с нуля до бота за 10 дней', url: '/python-lager', icon: 'bi-code-slash' },
  { title: 'Лагерь Scratch', description: 'Первый язык для детей 7–10 лет', url: '/scratch-lager', icon: 'bi-blocks' },
  { title: 'Лагерь Roblox', description: 'Roblox Studio + Lua, создание 3D-игр', url: '/roblox-lager', icon: 'bi-controller' },
  { title: 'Лагерь 3D-моделирования', description: 'Blender + 3D-печать модели', url: '/3d-modelirovanie-lager', icon: 'bi-box' },
  { title: 'Летняя IT-школа', description: 'Загородный формат, с проживанием', url: '/letnyaya-it-shkola', icon: 'bi-mortarboard' },

  // 👧 Возрастные
  { title: 'Лагерь для детей 8 лет', description: 'Scratch, Minecraft — первый код', url: '/lager-8-let', icon: 'bi-emoji-smile' },
  { title: 'Лагерь для детей 10 лет', description: 'Python и боты для 9–11 лет', url: '/lager-10-let', icon: 'bi-laptop' },
  { title: 'Лагерь для детей 12 лет', description: 'Python, AI — для 11–13 лет', url: '/lager-12-let', icon: 'bi-rocket-takeoff' },
  { title: 'Лагерь для подростков', description: 'Программа 12–14 лет', url: '/lager-dlya-podrostkov', icon: 'bi-rocket-takeoff' },
  { title: 'Лагерь для школьников', description: '1–8 класс, IT-проект', url: '/lager-dlya-shkolnikov', icon: 'bi-backpack' },
  { title: 'Лагерь для мальчиков', description: 'Minecraft, Roblox, Python, AI', url: '/lager-dlya-malchikov', icon: 'bi-rocket-takeoff' },
  { title: 'Лагерь для девочек', description: 'AI, 3D-моделирование, Python', url: '/lager-dlya-devochek', icon: 'bi-star-fill' },

  // 📍 Гео-LP
  { title: 'Лагерь рядом с Подольском', description: 'IT-лагерь, 40 км от Подольска', url: '/lager-podolsk', icon: 'bi-geo-alt' },
  { title: 'Лагерь в Наро-Фоминском районе', description: 'Санаторий Изумруд, 66 км от МКАД', url: '/lager-naro-fominsk', icon: 'bi-tree' },
  { title: 'Лагерь из Новой Москвы', description: 'По Калужскому шоссе, 40–60 км', url: '/lager-novaya-moskva', icon: 'bi-geo-alt-fill' },
  { title: 'Лагерь рядом с Химками', description: 'IT-лагерь, ~1.5 часа от Химок', url: '/lager-himki', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Одинцово', description: 'IT-лагерь, 35 км по Киевскому шоссе', url: '/lager-odintsovo', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Домодедово', description: 'IT-лагерь, ~60 км через Подольск', url: '/lager-domodedovo', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Серпуховом', description: 'IT-лагерь, ~70 км по Симферопольскому шоссе', url: '/lager-serpuhov', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Зеленоградом', description: 'IT-лагерь, ~70 км по Киевскому шоссе', url: '/lager-zelenograd', icon: 'bi-geo-alt' },

  // 💰 Коммерческие
  { title: 'Цены на смены 2026', description: 'Стоимость всех смен, что входит', url: '/ceny', icon: 'bi-coin' },
  { title: 'Купить путёвку в лагерь', description: 'Оплата, договор, 50% сейчас + 50% за 3 нед.', url: '/kupit-putevku-v-lager', icon: 'bi-credit-card' },
  { title: 'Налоговый вычет 13%', description: 'Калькулятор возврата с путёвки', url: '/nalogovyj-vychet', icon: 'bi-receipt' },
  { title: 'Лагерь недорого', description: 'От 48 000 ₽ за смену, оплата частями', url: '/lager-nedorogo', icon: 'bi-tag' },

  // 🗓 Сезонные
  { title: 'Лагерь на каникулы', description: 'Июнь, июль, август 2026', url: '/lager-na-kanikuly', icon: 'bi-sun' },
  { title: 'Лагерь на июнь', description: 'Смены июня 2026, с 30 мая', url: '/lager-na-iyun', icon: 'bi-calendar-event' },
  { title: 'Лагерь на июль', description: 'Июльские смены 2026 в Подмосковье', url: '/lager-na-iyul', icon: 'bi-sun' },
  { title: 'Лагерь на август', description: 'Смены августа 2026 в Подмосковье', url: '/lager-na-avgust-podmoskove', icon: 'bi-sun' },

  // 🎨 Прочее
  { title: 'Лагерь без телефонов', description: 'Ребёнок без гаджетов 24/7', url: '/lager-bez-telefonov', icon: 'bi-phone-x' },
  { title: 'Тематический лагерь', description: 'Каждая смена — своя тема', url: '/tematicheskiy-lager', icon: 'bi-bullseye' },
  { title: 'Образовательный лагерь', description: 'Учёба + результат за смену', url: '/obrazovatelnyy-lager', icon: 'bi-book' },
  { title: 'Для компаний', description: 'Путёвки для сотрудников', url: '/dlya-kompaniy', icon: 'bi-building' },

  // ℹ️ Информационные
  { title: 'О лагере', description: 'Кто мы, история, как устроен день', url: '/o-lagere', icon: 'bi-info-circle' },
  { title: 'Отзывы родителей', description: '5.0 — 40+ отзывов на Яндекс.Картах', url: '/otzyvy', icon: 'bi-chat-quote' },
];

/**
 * Возвращает первые `count` лендингов из приоритетного списка, исключая `currentUrl`.
 * Используется для блока RelatedPages на каждом лендинге.
 *
 * Порядок в `landingPages` — по убыванию приоритета/частотности. Поэтому первые 6
 * = самые "жирные" SEO-посадки, которые получат больше внутренних ссылок.
 *
 * @param currentUrl URL текущей страницы (без протокола/хоста), например "/minecraft-lager"
 * @param count Сколько ссылок вернуть (по умолчанию 6)
 */
export function getRelatedPages(currentUrl: string, count: number = 6): LandingPage[] {
  // Нормализуем URL — убираем хвостовой слеш, чтобы "/minecraft-lager" и "/minecraft-lager/" считались одинаковыми
  const normalized = currentUrl.replace(/\/$/, '');
  return landingPages
    .filter((page) => page.url.replace(/\/$/, '') !== normalized)
    .slice(0, count);
}

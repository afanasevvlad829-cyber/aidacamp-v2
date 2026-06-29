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
  { title: 'Официальный детский лагерь', description: 'Лицензия, РТО, проверка документов', url: '/detskiy-lager-oficialnyj/', icon: 'bi-patch-check-fill' },
  { title: 'Лучшие детские лагеря Подмосковья', description: 'Рейтинг 5.0, лицензия Минобрнауки', url: '/luchshie-detskie-lagerya/', icon: 'bi-trophy' },
  { title: 'Проверенный детский лагерь', description: 'Лицензия, РТО, 5.0 — всё проверяется', url: '/proverennyj-lager/', icon: 'bi-patch-check-fill' },
  { title: 'Летний школьный лагерь', description: 'IT-программа для школьников 7–15 лет', url: '/letnyj-shkolnyj-lager/', icon: 'bi-mortarboard' },
  { title: 'Лагерь летнего пребывания', description: 'Официальный лицензированный лагерь с проживанием', url: '/lager-letnego-prebyvaniya/', icon: 'bi-sun' },
  { title: 'Оздоровительный лагерь', description: 'Бассейн, лес, медработник 24/7 в Подмосковье', url: '/ozdorovitelnyj-lager/', icon: 'bi-heart-pulse-fill' },
  { title: 'Загородный лагерь', description: 'Лес, бассейн, 66 км от МКАД', url: '/zagorodnyj-lager/', icon: 'bi-tree' },
  { title: 'Детский лагерь', description: 'Для детей 7–15 лет в Подмосковье', url: '/detskiy-lager/', icon: 'bi-house-heart' },
  { title: 'Детский лагерь в Подмосковье', description: '66 км от МКАД, проживание', url: '/detskiy-lager-podmoskove/', icon: 'bi-houses' },
  { title: 'Лагерь в Подмосковье', description: 'Загородный, с бассейном', url: '/lager-v-podmoskove/', icon: 'bi-tree' },
  { title: 'Лагерь на лето 2026', description: 'Смены июнь–август, календарь', url: '/lager-na-leto-2026/', icon: 'bi-calendar-heart' },
  { title: 'Лагерь в Москве', description: 'Ближнее Подмосковье, 66 км от МКАД', url: '/lager-v-moskve/', icon: 'bi-geo-alt' },
  { title: 'Московские летние лагеря', description: 'IT-лагерь в 66 км от Москвы, трансфер', url: '/moskovskie-letnie-lagerya/', icon: 'bi-geo-alt' },

  // 🎯 Тематические IT
  { title: 'IT-лагерь', description: 'Общий вход в IT-нишу: Python, Roblox, AI, Minecraft для 7–15 лет', url: '/it-lager/', icon: 'bi-laptop' },
  { title: 'AI-лагерь для детей', description: 'Нейросети, ChatGPT API, AI-проекты', url: '/ai-lager/', icon: 'bi-cpu' },
  { title: 'Лагерь с бассейном', description: 'Закрытый бассейн, всё включено', url: '/lager-s-basseynom/', icon: 'bi-sun' },
  { title: 'Детский компьютерный лагерь', description: 'Python, AI и Roblox — проект за смену', url: '/kompyuternyy-lager/', icon: 'bi-laptop' },
  { title: 'Лагерь программирования', description: 'От кода до проекта', url: '/lager-programmirovaniya/', icon: 'bi-keyboard' },
  { title: 'Лагерь Майнкрафт', description: 'Minecraft Education, создание модов', url: '/minecraft-lager/', icon: 'bi-controller' },
  { title: 'Лагерь Python', description: 'Python с нуля до бота за 10 дней', url: '/python-lager/', icon: 'bi-code-slash' },
  { title: 'Лагерь Scratch', description: 'Первый язык для детей 7–10 лет', url: '/scratch-lager/', icon: 'bi-blocks' },
  { title: 'Лагерь Roblox', description: 'Roblox Studio + Lua, создание 3D-игр', url: '/roblox-lager/', icon: 'bi-controller' },
  { title: 'Лагерь 3D-моделирования', description: 'Blender + 3D-печать модели', url: '/3d-modelirovanie-lager/', icon: 'bi-box' },
  { title: 'Летняя IT-школа', description: 'Загородный формат, с проживанием', url: '/letnyaya-it-shkola/', icon: 'bi-mortarboard' },

  // 👧 Возрастные
  { title: 'Лагерь для детей 8 лет', description: 'Scratch, Minecraft — первый код', url: '/lager-8-let/', icon: 'bi-emoji-smile' },
  { title: 'Лагерь для детей 10 лет', description: 'Python и боты для 9–11 лет', url: '/lager-10-let/', icon: 'bi-laptop' },
  { title: 'Лагерь для детей 12 лет', description: 'Python, AI — для 11–13 лет', url: '/lager-12-let/', icon: 'bi-rocket-takeoff' },
  { title: 'Летний лагерь для подростков', description: 'Подмосковье, смены 11–15 лет 2026', url: '/lager-dlya-podrostkov/', icon: 'bi-rocket-takeoff' },
  { title: 'Лагерь для школьников', description: '1–8 класс, IT-проект', url: '/lager-dlya-shkolnikov/', icon: 'bi-backpack' },
  { title: 'Лагерь для мальчиков', description: 'Minecraft, Roblox, Python, AI', url: '/lager-dlya-malchikov/', icon: 'bi-rocket-takeoff' },
  { title: 'Лагерь для девочек', description: 'AI, 3D-моделирование, Python', url: '/lager-dlya-devochek/', icon: 'bi-star-fill' },

  // 📍 Гео-LP
  { title: 'Лагерь рядом с Подольском', description: 'IT-лагерь, 40 км от Подольска', url: '/lager-podolsk/', icon: 'bi-geo-alt' },
  { title: 'Лагерь в Наро-Фоминском районе', description: 'Санаторий Изумруд, 66 км от МКАД', url: '/lager-naro-fominsk/', icon: 'bi-tree' },
  { title: 'Лагерь из Новой Москвы', description: 'По Киевскому шоссе, 40–60 км', url: '/lager-novaya-moskva/', icon: 'bi-geo-alt-fill' },
  { title: 'Лагерь рядом с Химками', description: 'IT-лагерь, ~1.5 часа от Химок', url: '/lager-himki/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Одинцово', description: 'IT-лагерь, 35 км по Киевскому шоссе', url: '/lager-odintsovo/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Домодедово', description: 'IT-лагерь, ~60 км через Подольск', url: '/lager-domodedovo/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Серпуховом', description: 'IT-лагерь, ~70 км по Симферопольскому шоссе', url: '/lager-serpuhov/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Зеленоградом', description: 'IT-лагерь, ~70 км по Киевскому шоссе', url: '/lager-zelenograd/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Истрой', description: 'IT-лагерь, ~1.5 ч от Истры', url: '/lager-istra/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Клином', description: 'IT-лагерь, ~2 часа от Клина', url: '/lager-klin/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Пушкино', description: 'IT-лагерь, ~1.5 ч от Пушкино', url: '/lager-pushkino/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Солнечногорском', description: 'IT-лагерь, ~1,5 часа через ЦКАД, трансфер', url: '/lager-solnechnogorsk/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом со Звенигородом', description: 'IT-лагерь, ~45 км по А107, ~1 час', url: '/lager-zvenigorod/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Рузой', description: 'IT-лагерь, ~55 км по А108, ~1–1,5 часа', url: '/lager-ruza/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Троицком', description: 'IT-лагерь, ~45 км, одно направление, ~50 мин', url: '/lager-troitsk/', icon: 'bi-geo-alt' },

  // 💰 Коммерческие
  { title: 'Записаться в лагерь', description: 'Как записать ребёнка в IT-лагерь', url: '/zapisatsya/', icon: 'bi-calendar-check' },
  { title: 'Цены на смены 2026', description: 'Стоимость всех смен, что входит', url: '/ceny/', icon: 'bi-coin' },
  { title: 'Купить путёвку в лагерь', description: 'Оплата, договор, 50% сейчас + 50% за 3 нед.', url: '/kupit-putevku-v-lager/', icon: 'bi-credit-card' },
  { title: 'Налоговый вычет 13%', description: 'Калькулятор возврата с путёвки', url: '/nalogovyj-vychet/', icon: 'bi-receipt' },
  { title: 'Лагерь недорого', description: 'От 74 900 ₽ за смену, оплата частями', url: '/lager-nedorogo/', icon: 'bi-tag' },

  // 🗓 Сезонные
  { title: 'Лагерь летом', description: 'IT-лагерь летом 2026 для детей 7–15 лет', url: '/lager-letom/', icon: 'bi-sun-fill' },
  { title: 'Лагерь на каникулы', description: 'Июнь, июль, август 2026', url: '/lager-na-kanikuly/', icon: 'bi-sun' },
  { title: 'Лагерь на июнь', description: 'Смены июня 2026, с 30 мая', url: '/lager-na-iyun/', icon: 'bi-calendar-event' },
  { title: 'Лагерь на июль', description: 'Июльские смены 2026 в Подмосковье', url: '/lager-na-iyul/', icon: 'bi-sun' },
  { title: 'Лагерь на август', description: 'Смены августа 2026 в Подмосковье', url: '/lager-na-avgust-podmoskove/', icon: 'bi-sun' },
  { title: 'Лагерь на осенние каникулы', description: 'IT-смена в октябре 2026', url: '/lager-na-osenie-kanikuly/', icon: 'bi-cloud-sun' },
  { title: 'Лагерь на зимние каникулы', description: 'IT-смена в декабре 2026 — январе 2027', url: '/lager-na-zimnie-kanikuly/', icon: 'bi-snow' },

  // 🎨 Прочее
  { title: 'Пионерский лагерь', description: 'Современный аналог — IT-смены 2026', url: '/pionerskiy-lager/', icon: 'bi-flag-fill' },
  { title: 'Лагерь без телефонов', description: 'Ребёнок без гаджетов 24/7', url: '/lager-bez-telefonov/', icon: 'bi-phone-x' },
  { title: 'Тематический лагерь', description: 'Каждая смена — своя тема', url: '/tematicheskiy-lager/', icon: 'bi-bullseye' },
  { title: 'Образовательный лагерь', description: 'Учёба + результат за смену', url: '/obrazovatelnyy-lager/', icon: 'bi-book' },
  { title: 'Для компаний', description: 'Путёвки для сотрудников', url: '/dlya-kompaniy/', icon: 'bi-building' },

  // ℹ️ Информационные
  { title: 'О лагере', description: 'Кто мы, история, как устроен день', url: '/o-lagere/', icon: 'bi-info-circle' },
  { title: 'Отзывы родителей', description: '5.0 — 40+ отзывов на Яндекс.Картах', url: '/otzyvy/', icon: 'bi-chat-quote' },
];

/**
 * IT-тематические страницы — группируются вместе в блоке похожих.
 * Когда текущая страница — IT, в related показываем прежде всего IT-кластер.
 * Это устраняет каннибализацию (напр. /letnyaya-it-shkola/ и /lager-programmirovaniya/)
 * и даёт Яндексу чёткий сигнал тематической близости страниц.
 */
const IT_URLS = new Set([
  '/letnyaya-it-shkola',
  '/lager-programmirovaniya',
  '/kompyuternyy-lager',
  '/it-lager',
  '/ai-lager',
  '/python-lager',
  '/minecraft-lager',
  '/scratch-lager',
  '/roblox-lager',
  '/3d-modelirovanie-lager',
  '/it-camp',
]);

/**
 * Гео-страницы: города и районы Подмосковья.
 * На этих страницах в RelatedPages первым идёт хаб /lager-v-podmoskove,
 * затем соседние гео-страницы — усиливаем сигнал тематической близости.
 */
const GEO_URLS = new Set([
  '/lager-v-podmoskove',
  '/lager-v-moskve',
  '/lager-naro-fominsk',
  '/lager-podolsk',
  '/lager-novaya-moskva',
  '/lager-himki',
  '/lager-odintsovo',
  '/lager-domodedovo',
  '/lager-serpuhov',
  '/lager-zelenograd',
  '/lager-istra',
  '/lager-klin',
  '/lager-pushkino',
  '/lager-mytishchi',
  '/lager-korolev',
  '/lager-balashiha',
  '/lager-lubertsy',
  '/lager-reutov',
  '/lager-krasnogorsk',
  '/lager-lobnya',
  '/lager-elektrostal',
  '/lager-nogink',
  '/lager-shchelkovo',
  '/lager-ramenskoe',
  '/lager-bronnitsy',
  '/lager-chehov',
  '/lager-obnisk',
  '/lager-kolomna',
  '/lager-stupino',
  '/lager-fryazevo',
  '/lager-jeleznodarozhnyj',
  '/lager-vidnoe',
  '/lager-zhukovskiy',
  '/lager-ryadom',
  '/detskiy-lager-podmoskove',
]);

/**
 * Возрастные страницы.
 * На этих страницах первыми идут хабы /detskiy-lager и /lager-dlya-podrostkov,
 * затем соседние возрастные страницы.
 */
const AGE_URLS = new Set([
  '/lager-7-let',
  '/lager-8-let',
  '/lager-9-let',
  '/lager-10-let',
  '/lager-12-let',
  '/lager-14-let',
  '/lager-dlya-podrostkov',
  '/lager-dlya-shkolnikov',
  '/lager-dlya-shkolnikov-na-leto',
  '/lager-dlya-shkolnikov-podmoskove',
  '/lager-dlya-malchikov',
  '/lager-dlya-devochek',
]);

/**
 * Статьи-блог, которые нужно показывать в блоке RelatedPages на конкретных лендингах.
 * Ключ — нормализованный URL лендинга, значение — список статей (до 2 штук).
 * Статьи вставляются в конец результата getRelatedPages и дают им хотя бы 1 inbound link.
 */
const ARTICLE_MAP: Record<string, LandingPage[]> = {
  '/lager-naro-fominsk': [
    { title: 'Лагерь в Наро-Фоминском районе', description: 'Маршруты, как добраться, инфраструктура', url: '/stati/lager-naro-fominsk/', icon: 'file-earmark-text' },
  ],
  '/detskiy-lager-podmoskove': [
    { title: 'Лагерь в Наро-Фоминском районе', description: 'Маршруты, как добраться, инфраструктура', url: '/stati/lager-naro-fominsk/', icon: 'file-earmark-text' },
  ],
  '/nalogovyj-vychet': [
    { title: 'Как оплатить лагерь', description: 'Рассрочка 50/50, способы, документы', url: '/stati/oplata-detskogo-lagerya/', icon: 'cash-coin' },
    { title: 'Вычет за лагерь: пошаговая инструкция', description: 'Через Госуслуги за 15 минут', url: '/stati/nalogovyj-vychet-za-lager-poshagovaya-instrukciya/', icon: 'clipboard-check' },
  ],
  '/ceny': [
    { title: 'Как оплатить лагерь', description: 'Рассрочка 50/50, способы, документы', url: '/stati/oplata-detskogo-lagerya/', icon: 'cash-coin' },
  ],
  '/kupit-putevku-v-lager': [
    { title: 'Как оплатить лагерь', description: 'Рассрочка 50/50, способы, документы', url: '/stati/oplata-detskogo-lagerya/', icon: 'cash-coin' },
  ],
  '/lager-dlya-podrostkov': [
    { title: 'Ребёнок не хочет в лагерь', description: 'Разбираемся без скандалов', url: '/stati/rebenok-ne-hochet-v-lager/', icon: 'chat-dots' },
  ],
  '/lager-dlya-devochek': [
    { title: 'Ребёнок первый раз в лагере', description: 'Как подготовить и не переживать', url: '/stati/pervyj-raz-v-lagere/', icon: 'file-earmark-text' },
  ],
  '/razmeshchenie': [
    { title: 'Ребёнок заболел в лагере', description: 'Что делать, медпункт, родителям', url: '/stati/rebenok-zabolel-v-lagere/', icon: 'heart-pulse-fill' },
  ],
  '/o-lagere': [
    { title: 'Ребёнок заболел в лагере', description: 'Что делать, медпункт, родителям', url: '/stati/rebenok-zabolel-v-lagere/', icon: 'heart-pulse-fill' },
  ],
  '/lager-bez-telefonov': [
    { title: 'Зависимость от компьютерных игр', description: 'Признаки, причины, что поможет', url: '/stati/zavisimost-ot-kompyuternyh-igr/', icon: 'phone-x' },
  ],
  '/it-lager': [
    { title: 'Чем IT-лагерь отличается от кружка', description: 'Сравнение форматов, что лучше для вашего', url: '/stati/it-lager-vs-kruzhok/', icon: 'list-check' },
  ],
  '/scratch-lager': [
    { title: 'Scratch для детей', description: 'Что такое, с чего начать, возраст', url: '/stati/scratch-dlya-detej/', icon: 'code-slash' },
  ],
  '/python-lager': [
    { title: '3D-моделирование для детей', description: 'Blender, первые шаги, возраст', url: '/stati/3d-modelirovanie-dlya-detej/', icon: 'box' },
  ],
  '/ai-lager': [
    { title: 'ИИ заменит программистов?', description: 'Разбираем реальные данные', url: '/stati/ii-zamenit-programmista/', icon: 'cpu' },
  ],
  '/luchshie-detskie-lagerya': [
    { title: 'Как выбрать IT-лагерь', description: 'Чек-лист и на что смотреть', url: '/stati/kak-vybrat-it-lager/', icon: 'list-check' },
  ],
  '/detskiy-lager': [
    { title: 'Документы для ребёнка в лагерь', description: 'Полный чек-лист 2026', url: '/stati/dokumenty-dlya-rebenka-v-lager/', icon: 'file-earmark-text' },
  ],
  '/lager-v-podmoskove': [
    { title: 'Документы для ребёнка в лагерь', description: 'Полный чек-лист 2026', url: '/stati/dokumenty-dlya-rebenka-v-lager/', icon: 'file-earmark-text' },
  ],
};

/**
 * Возвращает первые `count` лендингов из приоритетного списка, исключая `currentUrl`.
 * Используется для блока RelatedPages на каждом лендинге.
 *
 * Для IT-страниц приоритет отдаётся IT-кластеру (устраняет каннибализацию).
 * Для остальных страниц — стандартный порядок массива.
 * В конец результата автоматически добавляются релевантные статьи из ARTICLE_MAP.
 *
 * @param currentUrl URL текущей страницы (без протокола/хоста), например "/minecraft-lager"
 * @param count Сколько ссылок вернуть (по умолчанию 6)
 */
export function getRelatedPages(currentUrl: string, count: number = 6): LandingPage[] {
  const normalized = currentUrl.replace(/\/$/, '');
  const others = landingPages.filter((page) => page.url.replace(/\/$/, '') !== normalized);

  // Статьи для этой страницы (вставляем в конец, уменьшая count на их количество)
  const articles = ARTICLE_MAP[normalized] ?? [];
  const landingCount = Math.max(count - articles.length, 0);

  let base: LandingPage[];

  // IT-страница → IT-кластер в начале списка, потом общие
  if (IT_URLS.has(normalized)) {
    const itPages = others.filter((p) => IT_URLS.has(p.url.replace(/\/$/, '')));
    const rest = others.filter((p) => !IT_URLS.has(p.url.replace(/\/$/, '')));
    base = [...itPages, ...rest].slice(0, landingCount);
  }
  // Гео-страница → хаб /lager-v-podmoskove + /detskiy-lager первыми, потом другие гео
  else if (GEO_URLS.has(normalized)) {
    const hub = landingPages.find((p) => p.url === '/lager-v-podmoskove');
    const hub2 = landingPages.find((p) => p.url === '/detskiy-lager');
    const geoPages = others.filter((p) => GEO_URLS.has(p.url.replace(/\/$/, '')) && p.url !== '/lager-v-podmoskove');
    const rest = others.filter((p) => !GEO_URLS.has(p.url.replace(/\/$/, '')) && p.url !== '/lager-v-podmoskove' && p.url !== '/detskiy-lager');
    const priority = [hub, hub2].filter((p): p is LandingPage => !!p);
    base = [...priority, ...geoPages, ...rest].slice(0, landingCount);
  }
  // Возрастная страница → /detskiy-lager + /lager-dlya-podrostkov первыми, потом другие возрастные
  else if (AGE_URLS.has(normalized)) {
    const hub1 = landingPages.find((p) => p.url === '/detskiy-lager');
    const hub2 = landingPages.find((p) => p.url === '/lager-dlya-podrostkov');
    const agePages = others.filter((p) => AGE_URLS.has(p.url.replace(/\/$/, '')) && p.url !== '/lager-dlya-podrostkov');
    const rest = others.filter((p) => !AGE_URLS.has(p.url.replace(/\/$/, '')) && p.url !== '/detskiy-lager' && p.url !== '/lager-dlya-podrostkov');
    const priority = [hub1, hub2].filter((p): p is LandingPage => !!p);
    base = [...priority, ...agePages, ...rest].slice(0, landingCount);
  }
  else {
    base = others.slice(0, landingCount);
  }

  return [...base, ...articles];
}

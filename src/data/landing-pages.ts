import { SEASON_MONTHS_NOM } from './evergreen';
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
  { title: 'Лагерь на лето 2026', description: `Смены ${SEASON_MONTHS_NOM}, календарь`, url: '/lager-na-leto-2026/', icon: 'bi-calendar-heart' },
  { title: 'Лагерь в Москве', description: 'Ближнее Подмосковье, 66 км от МКАД', url: '/lager-v-moskve/', icon: 'bi-geo-alt' },
  { title: 'Московские летние лагеря', description: 'IT-лагерь в 66 км от Москвы, трансфер', url: '/moskovskie-letnie-lagerya/', icon: 'bi-geo-alt' },

  // 🎯 Тематические IT
  { title: 'IT Camp', description: 'Лагерь программирования в Подмосковье', url: '/it-camp/', icon: 'bi-laptop' },
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
  { title: 'IT-лагерь с проживанием', description: 'IT-программа + проживание, 66 км от МКАД', url: '/it-lager-s-prozhivaniem/', icon: 'bi-laptop' },
  { title: 'IT-лагерь для подростков', description: 'Python, AI, Roblox — для 11–15 лет', url: '/it-lager-dlya-podrostkov/', icon: 'bi-laptop' },
  { title: 'IT-лагерь для детей', description: 'Компьютерный лагерь, программирование с нуля', url: '/it-lager-dlya-detey/', icon: 'bi-laptop' },
  { title: 'Хакатон для школьников', description: 'Финал смены — защита своего проекта', url: '/hakaton-dlya-shkolnikov/', icon: 'bi-trophy-fill' },

  // 👧 Возрастные
  { title: 'Лагерь для детей 6 лет', description: 'С какого возраста берут в лагерь', url: '/lager-6-let/', icon: 'bi-emoji-smile' },
  { title: 'Лагерь для детей 7 лет', description: 'Scratch — первый язык программирования', url: '/lager-7-let/', icon: 'bi-emoji-smile' },
  { title: 'Лагерь для детей 8 лет', description: 'Scratch, Minecraft — первый код', url: '/lager-8-let/', icon: 'bi-emoji-smile' },
  { title: 'Лагерь для детей 9 лет', description: 'Python и первые проекты для 9 лет', url: '/lager-9-let/', icon: 'bi-laptop' },
  { title: 'Лагерь для детей 10 лет', description: 'Python и боты для 9–11 лет', url: '/lager-10-let/', icon: 'bi-laptop' },
  { title: 'Лагерь для детей 11 лет', description: 'Python и Roblox для 11 лет', url: '/lager-11-let/', icon: 'bi-rocket-takeoff' },
  { title: 'Лагерь для детей 12 лет', description: 'Python, AI — для 11–13 лет', url: '/lager-12-let/', icon: 'bi-rocket-takeoff' },
  { title: 'Лагерь для детей 13 лет', description: 'IT-проекты и хакатон для 13 лет', url: '/lager-13-let/', icon: 'bi-rocket-takeoff' },
  { title: 'Лагерь для детей 14 лет', description: 'Python Advanced, AI-проект в портфолио', url: '/lager-14-let/', icon: 'bi-rocket-takeoff' },
  { title: 'Лагерь для детей 15 лет', description: 'IT-проекты для подростков 15 лет', url: '/lager-15-let/', icon: 'bi-rocket-takeoff' },
  { title: 'Летний лагерь для подростков', description: 'Подмосковье, смены 11–15 лет 2026', url: '/lager-dlya-podrostkov/', icon: 'bi-rocket-takeoff' },
  { title: 'Лагерь для школьников', description: '1–8 класс, IT-проект', url: '/lager-dlya-shkolnikov/', icon: 'bi-backpack' },
  { title: 'Лагерь для школьников на лето', description: 'IT-смены 2026 для 1–8 класса', url: '/lager-dlya-shkolnikov-na-leto/', icon: 'bi-backpack' },
  { title: 'Лагерь для школьников Подмосковья', description: 'IT-смены 2026 рядом с домом', url: '/lager-dlya-shkolnikov-podmoskove/', icon: 'bi-backpack' },
  { title: 'Лагерь для детей', description: 'Группы по возрасту, IT-лагерь в Подмосковье', url: '/lager-dlya-detey/', icon: 'bi-house-heart' },
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
  { title: 'Лагерь рядом с Железнодорожным', description: 'IT-лагерь в Подмосковье', url: '/lager-jeleznodarozhnyj/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Ногинском', description: 'IT-лагерь, Python для 7–15 лет', url: '/lager-nogink/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Видным', description: 'IT-лагерь, бассейн', url: '/lager-vidnoe/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Жуковским', description: 'IT-лагерь в Подмосковье', url: '/lager-zhukovskiy/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Мытищами', description: 'Выездной детский лагерь', url: '/lager-mytishchi/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Коломной', description: 'Детский летний лагерь', url: '/lager-kolomna/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Люберцами', description: 'IT-смены для школьников', url: '/lager-lubertsy/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом со Ступино', description: 'Детский IT-лагерь', url: '/lager-stupino/', icon: 'bi-geo-alt' },
  // Были в GEO_URLS (кластеризация), но отсутствовали в самом массиве → никогда не
  // выбирались как ЦЕЛЬ ссылки (evenPool фильтрует по landingPages, не по GEO_URLS)
  // → 0 входящих ссылок (Labrika-аудит 10.07, sitemap-сироты). Добавлены 13.07.
  { title: 'Лагерь рядом с Балашихой', description: 'IT-лагерь, трансфер от м. Солнцево', url: '/lager-balashiha/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Бронницами', description: 'IT-лагерь, ~1.5 часа от Бронниц', url: '/lager-bronnitsy/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Чеховом', description: 'IT-лагерь, ~50 мин по Симферопольскому шоссе', url: '/lager-chehov/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Королёвом', description: 'IT-лагерь, 66 км от МКАД', url: '/lager-korolev/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Лобней', description: 'IT-лагерь, 66 км по Киевскому шоссе', url: '/lager-lobnya/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Реутовом', description: 'IT-лагерь, трансфер от м. Солнцево', url: '/lager-reutov/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом со Щёлково', description: 'IT-лагерь, трансфер от м. Солнцево', url: '/lager-shchelkovo/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Красногорском', description: 'IT-лагерь, трансфер', url: '/lager-krasnogorsk/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Электросталью', description: 'Детский IT-лагерь', url: '/lager-elektrostal/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Раменским', description: 'Лагерь в Подмосковье', url: '/lager-ramenskoe/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Обнинском', description: 'Лагерь программирования', url: '/lager-obnisk/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с Фрязево', description: 'Летний детский IT-лагерь', url: '/lager-fryazevo/', icon: 'bi-geo-alt' },
  { title: 'Лагерь рядом с домом', description: 'Как найти лагерь ближе к вам в Подмосковье', url: '/lager-ryadom/', icon: 'bi-geo-alt' },

  // 💰 Коммерческие
  { title: 'Записаться в лагерь', description: 'Как записать ребёнка в IT-лагерь', url: '/zapisatsya/', icon: 'bi-calendar-check' },
  { title: 'Цены на смены 2026', description: 'Стоимость всех смен, что входит', url: '/ceny/', icon: 'bi-coin' },
  { title: 'Путёвка в лагерь', description: 'Оплата, договор, 50% сейчас + 50% за 3 нед.', url: '/putevka-v-lager/', icon: 'bi-credit-card' },
  { title: 'Сколько стоит лагерь', description: 'Разбор цен по типам лагерей', url: '/stati/skolko-stoit-detskiy-lager/', icon: 'bi-coin' },
  { title: 'Налоговый вычет 13%', description: 'Калькулятор возврата с путёвки', url: '/nalogovyj-vychet/', icon: 'bi-receipt' },
  { title: 'Лагерь недорого', description: 'От 74 900 ₽ за смену, оплата частями', url: '/lager-nedorogo/', icon: 'bi-tag' },

  // 🗓 Сезонные
  { title: 'Лагерь летом', description: 'IT-лагерь летом 2026 для детей 7–15 лет', url: '/lager-letom/', icon: 'bi-sun-fill' },
  { title: 'Лагерь на каникулы', description: 'Июнь, июль, август 2026', url: '/lager-na-kanikuly/', icon: 'bi-sun' },
  { title: 'Лагерь на неделю', description: 'Короткие смены 7–10 дней круглый год', url: '/lager-na-nedelyu/', icon: 'bi-calendar2-check' },
  { title: 'Лагерь на июнь', description: 'Смены июня 2026, с 30 мая', url: '/lager-na-iyun/', icon: 'bi-calendar-event' },
  { title: 'Лагерь на июль', description: 'Июльские смены 2026 в Подмосковье', url: '/lager-na-iyul/', icon: 'bi-sun' },
  { title: 'Лагерь на август', description: 'Смены августа 2026 в Подмосковье', url: '/lager-na-avgust-podmoskove/', icon: 'bi-sun' },
  { title: 'Лагерь на осенние каникулы', description: 'IT-смена в октябре 2026, предзапись открыта', url: '/lager-na-osennie-kanikuly/', icon: 'bi-cloud-sun' },
  { title: 'Лагерь на зимние каникулы', description: 'IT-смена в декабре 2026 — январе 2027', url: '/lager-na-zimnie-kanikuly/', icon: 'bi-snow' },
  { title: 'Лагерь на весенние каникулы', description: 'IT-смена в марте 2027, предзапись открыта', url: '/lager-na-vesennie-kanikuly/', icon: 'bi-flower1' },

  // 🏠 Хвост коммерческих/гео (Labrika-аудит 10.07: 0 входящих, не были нигде зарегистрированы)
  { title: 'Лагерь для ребёнка в городе', description: 'Городской формат IT-лагеря', url: '/lager-dlya-rebenka-v-gorode/', icon: 'bi-building' },
  { title: 'Лагерь с английским языком', description: 'IT-программа + разговорный английский', url: '/lager-s-angliyskim-yazykom-v-podmoskove/', icon: 'bi-translate' },
  { title: 'Детские лагеря Подмосковья', description: 'Летние IT-смены для школьников, цены', url: '/detskie-lagerya/', icon: 'bi-houses' },
  { title: 'Детские лагеря: цены 2026', description: 'Цены на лето 2026 в Подмосковье', url: '/detskie-lagerya-v-podmoskove-tseny-2026/', icon: 'bi-coin' },
  { title: 'Подмосковные лагеря для детей', description: 'Как выбрать IT-смену', url: '/podmoskovnye-lagerya-dlya-detey/', icon: 'bi-houses' },
  { title: 'Лагеря в Москве', description: 'Название и как выбрать', url: '/nazvanie-lagerey-v-moskve/', icon: 'bi-geo-alt' },
  { title: 'Лагеря в городе Москве', description: 'IT-лагерь рядом со столицей', url: '/lagerya-v-gorode-moskva/', icon: 'bi-geo-alt' },
  { title: 'Детский отдых в Подмосковье', description: 'Путёвки для детей 7–17 лет', url: '/detskiy-otdyh-podmoskove/', icon: 'bi-sun' },
  { title: 'Лагерь рядом с Истрой (МО)', description: 'Детский лагерь, Московская область', url: '/detskiy-lager-istra-moskovskaya-oblast/', icon: 'bi-geo-alt' },
  { title: '3D-моделирование: обучение', description: 'Blender для детей — с чего начать', url: '/3d-modelirovanie-obuchenie-dlya-detey/', icon: 'bi-box' },
  { title: 'Scratch: программирование', description: 'Первый язык для детей 7–10 лет', url: '/scratch-programmirovanie-dlya-detey/', icon: 'bi-blocks' },
  { title: 'Промт для нейросети', description: 'Как объяснить ребёнку', url: '/promt-dlya-neyroseti-dlya-detey/', icon: 'bi-cpu' },
  { title: 'Путёвки в лагерь 2026', description: 'Купить путёвку в АйДаКемп', url: '/putyovki-v-lager-2026/', icon: 'bi-credit-card' },
  { title: 'Компенсация за лагерь в Москве', description: 'Как оформить возврат части стоимости', url: '/kompensatsiya-za-detskiy-lager-v-moskve/', icon: 'bi-receipt' },
  { title: 'Лагерь на 10 дней', description: 'Короткая IT-смена в Подмосковье', url: '/lager-10-dney/', icon: 'bi-calendar2-check' },
  { title: 'Лагерь — альтернатива морю', description: 'Бассейн и IT-программа рядом с домом', url: '/lager-na-more/', icon: 'bi-water' },
  { title: 'Python для детей', description: 'С нуля до первого проекта', url: '/python-dlya-detey/', icon: 'bi-code-slash' },
  { title: 'Что взять в лагерь на 21 день', description: 'Полный чек-лист вещей', url: '/chto-vzyat-v-lager-na-21/', icon: 'bi-bag-check' },
  { title: 'Справка 079/у для лагеря', description: 'Где получить, образец, срок действия', url: '/stati/spravki-dlya-lagera/', icon: 'bi-clipboard-check' },
  { title: 'Периоды смены в лагере', description: 'Первая, вторая, третья — чем отличаются', url: '/stati/periody-smeny-v-lagere/', icon: 'bi-calendar-range' },

  // 🎨 Прочее
  { title: 'Пионерский лагерь', description: 'Современный аналог — IT-смены 2026', url: '/pionerskiy-lager/', icon: 'bi-flag-fill' },
  { title: 'Лагерь без телефонов', description: 'Ребёнок без гаджетов 24/7', url: '/lager-bez-telefonov/', icon: 'bi-phone-x' },
  { title: 'Детокс от телефона', description: 'IT-лагерь без гаджетов', url: '/detox-ot-telefona/', icon: 'bi-phone-x' },
  { title: 'Тревожный родитель', description: 'Расписание и связь с ребёнком на 10 дней', url: '/tarif-trevozhniy-roditel/', icon: 'bi-shield-check' },
  { title: 'Тематический лагерь', description: 'Каждая смена — своя тема', url: '/tematicheskiy-lager/', icon: 'bi-bullseye' },
  { title: 'Образовательный лагерь', description: 'Учёба + результат за смену', url: '/obrazovatelnyy-lager/', icon: 'bi-book' },
  { title: 'Для компаний', description: 'Путёвки для сотрудников', url: '/dlya-kompaniy/', icon: 'bi-building' },

  // ℹ️ Информационные
  { title: 'О лагере', description: 'Кто мы, история, как устроен день', url: '/o-lagere/', icon: 'bi-info-circle' },
  { title: 'Отзывы родителей', description: '5.0 — 40+ отзывов на Яндекс.Картах', url: '/otzyvy/', icon: 'bi-chat-quote' },
  { title: 'Размещение в лагере', description: 'Корпуса, комнаты, условия проживания', url: '/razmeshchenie/', icon: 'bi-houses' },
  { title: 'АйДаКемп на ТВ', description: 'Дарья Афанасьева на федеральном канале', url: '/tv/', icon: 'bi-tv' },
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
  // Была в landingPages, но отсутствовала в наборе → уходила в общий "else"-пул
  // и получала inbound только от 1-2 генеральных страниц (SEO-аудит Labrika 25.07:
  // 2 входящих). Тематически это IT-кластер (IT-программа + проживание).
  '/it-lager-s-prozhivaniem',
  // Симуляция графа перелинковки 09.08.2026: 0 и 1 входящая ссылка соответственно —
  // тематически IT, но не входили в кластер, тонули в общем пуле из 125 страниц.
  '/it-lager-dlya-podrostkov',
  '/it-lager-dlya-detey',
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
  // Были в массиве landingPages, но отсутствовали в наборе → выпадали из гео-кластера
  // (никто из гео их не линковал, сами шли в default-ветку). Аудит перелинковки 07.07.
  '/lager-solnechnogorsk',
  '/lager-zvenigorod',
  '/lager-ruza',
  '/lager-troitsk',
  // Была в landingPages, но отсутствовала в наборе → уходила в общий "else"-пул
  // (SEO-аудит Labrika 25.07: 4 входящих, ниже порога 5). Тематически это гео-кластер
  // (московские летние лагеря = тот же смысловой узел, что и остальные гео-страницы).
  '/moskovskie-letnie-lagerya',
]);

/**
 * Возрастные страницы.
 * На этих страницах первыми идут хабы /detskiy-lager и /lager-dlya-podrostkov,
 * затем соседние возрастные страницы.
 */
const AGE_URLS = new Set([
  '/lager-6-let',
  '/lager-7-let',
  '/lager-8-let',
  '/lager-9-let',
  '/lager-10-let',
  '/lager-11-let',
  '/lager-12-let',
  '/lager-13-let',
  '/lager-14-let',
  '/lager-15-let',
  '/lager-dlya-podrostkov',
  '/lager-dlya-shkolnikov',
  '/lager-dlya-shkolnikov-na-leto',
  '/lager-dlya-shkolnikov-podmoskove',
  '/lager-dlya-malchikov',
  '/lager-dlya-devochek',
]);

/**
 * Ценовые/финансовые страницы. Хабы /lager-nedorogo + /ceny приколоты первыми.
 * Разбор графа перелинковки 09.08.2026: у этого подкластера, в отличие от GEO/AGE,
 * не было механизма усиления хаба вообще — 179 у lager-nedorogo и 1 у
 * detskie-lagerya-v-podmoskove-tseny-2026 (Wordstat, кавычки) получали одинаковый
 * вес — 5-6 inbound независимо от частотности.
 */
const PRICE_URLS = new Set([
  '/ceny',
  '/lager-nedorogo',
  '/nalogovyj-vychet',
  '/kompensatsiya-za-detskiy-lager-v-moskve',
  '/putevka-v-lager',
  '/putyovki-v-lager-2026',
  '/detskie-lagerya-v-podmoskove-tseny-2026',
]);

/**
 * Гео-страницы общего охвата (не привязаны к одному городу — в отличие от GEO_URLS).
 * Хаб /lagerya-v-gorode-moskva (172, Wordstat) приколот первым. Второй хаб —
 * ВНЕШНИЙ /lager-v-podmoskove (уже готовый хаб GEO-кластера): по смыслу эти
 * страницы — общие гео-ключи без привязки к городу, отдельный внутренний второй
 * хаб был бы искусственным (следующая по частотности страница здесь — 17).
 */
const GEO_GENERIC_URLS = new Set([
  '/lagerya-v-gorode-moskva',
  '/nazvanie-lagerey-v-moskve',
  '/podmoskovnye-lagerya-dlya-detey',
  '/lager-dlya-rebenka-v-gorode',
  '/detskiy-otdyh-podmoskove',
  '/detskiy-lager-istra-moskovskaya-oblast',
]);

/**
 * Головные родовые ключи. Хабы /luchshie-detskie-lagerya (263) + /detskie-lagerya
 * (154, Wordstat) — самые частотные в подкластере. /detskiy-lager остаётся членом
 * подкластера, но НЕ целью пиннинга здесь: он уже пин-хаб для всех GEO (40 стр.)
 * и AGE (16 стр.) с 62 входящими — пинить его повторно из этого подкластера
 * означало бы тратить вес на уже перекормленную страницу.
 */
const HEAD_URLS = new Set([
  '/detskiy-lager',
  '/detskiy-lager-oficialnyj',
  '/lager-letnego-prebyvaniya',
  '/ozdorovitelnyj-lager',
  '/zagorodnyj-lager',
  '/luchshie-detskie-lagerya',
  '/detskie-lagerya',
  '/proverennyj-lager',
]);

/**
 * Сезонные страницы (когда ехать). Хабы /lager-na-leto-2026 (482) + /lager-na-nedelyu
 * (71, Wordstat) — та же форма частотности, что у B/D/F: явный лидер + резкий обрыв
 * к хвосту (10-dney=26, дальше 0-19). Добавлен по факту прогона симуляции 09.08.2026:
 * без пиннинга сжатие общего пула (после выноса B/D/F) обнулило /lager-na-leto-2026 —
 * самую частотную страницу во всём «ПРОЧЕЕ» — и просадило соседей по подкластеру.
 */
const SEASON_URLS = new Set([
  '/lager-na-leto-2026',
  '/lager-na-nedelyu',
  '/lager-10-dney',
  '/lager-na-avgust-podmoskove',
  '/lager-na-osennie-kanikuly',
  '/lager-letom',
  '/lager-na-kanikuly',
  '/lager-na-iyul',
  '/lager-na-iyun',
  '/lager-na-vesennie-kanikuly',
  '/lager-na-zimnie-kanikuly',
]);

/**
 * Формат/фишки программы. Хабы /lager-s-basseynom (92) + /pionerskiy-lager (73,
 * Wordstat) — та же форма частотности, что у B/D/F/SEASON: 2 лидера, резкий обрыв
 * к хвосту (28 и ниже). Найден по факту повторной симуляции 09.08.2026: после
 * добавления SEASON_URLS /lager-s-basseynom (уже был в HOMEPAGE_HUB_URLS) обнулился
 * в общем графе — тот же класс регрессии, что и у /lager-na-leto-2026 чуть раньше.
 */
const SHAPE_URLS = new Set([
  '/lager-s-basseynom',
  '/pionerskiy-lager',
  '/lager-bez-telefonov',
  '/detox-ot-telefona',
  '/lager-s-angliyskim-yazykom-v-podmoskove',
  '/tematicheskiy-lager',
  '/obrazovatelnyy-lager',
  '/letnyj-shkolnyj-lager',
  '/dlya-kompaniy',
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
  '/lager-novaya-moskva': [
    { title: 'Как добраться из Новой Москвы', description: 'Маршрут, трансфер, время в пути', url: '/stati/lager-novaya-moskva/', icon: 'file-earmark-text' },
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
  '/putevka-v-lager': [
    { title: 'Как оплатить смену', description: 'Рассрочка 50/50, способы, документы', url: '/stati/oplata-detskogo-lagerya/', icon: 'cash-coin' },
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

/** Циклический сдвиг массива на offset — распределяет показы по всему пулу. */
function rotate<T>(arr: T[], offset: number): T[] {
  if (arr.length === 0) return arr;
  const k = ((offset % arr.length) + arr.length) % arr.length;
  return [...arr.slice(k), ...arr.slice(0, k)];
}

/**
 * Детерминированный хеш строки → смещение [0, len). Fallback, когда текущей страницы
 * нет в пуле (напр. пул «rest» для страницы из кластера) — даёт стабильный разброс
 * без Math.random (иначе результат менялся бы между сборками).
 */
function globalHash(s: string, len: number): number {
  if (len <= 0) return 0;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % len;
}

/**
 * Возвращает `count` релевантных лендингов для блока RelatedPages, исключая `currentUrl`.
 *
 * Кластер (IT / гео / возраст) идёт первым — устраняет каннибализацию и держит тему.
 * Внутри кластера и в «остальном» пуле применяется ДЕТЕРМИНИРОВАННАЯ РОТАЦИЯ по хешу URL:
 * разные страницы показывают разные срезы → входящие ссылки распределяются равномерно
 * по всему кластеру, а не копятся на первых 6 элементах массива (SEO-аудит: было
 * 116 посадочных с <5 входящих — «хвост» кластеров голодал из-за фикс. slice(0,N)).
 * Хабы (/lager-v-podmoskove, /detskiy-lager, /lager-dlya-podrostkov — GEO/AGE;
 * /lager-nedorogo, /ceny — PRICE_URLS; /lagerya-v-gorode-moskva — GEO_GENERIC_URLS;
 * /luchshie-detskie-lagerya, /detskie-lagerya — HEAD_URLS; /lager-na-leto-2026,
 * /lager-na-nedelyu — SEASON_URLS; /lager-s-basseynom, /pionerskiy-lager —
 * SHAPE_URLS) остаются приколоты первыми — им высокая входящая связность
 * нужна намеренно.
 * В конец результата добавляются релевантные статьи из ARTICLE_MAP.
 *
 * @param currentUrl URL текущей страницы (без протокола/хоста), например "/minecraft-lager"
 * @param count Сколько ссылок вернуть (по умолчанию 6)
 */
export function getRelatedPages(currentUrl: string, count: number = 6): LandingPage[] {
  // norm() — url в массиве с trailing slash ('/detskiy-lager/'), а сравнения/множества
  // *_URLS — без. Без нормализации hub-find возвращал undefined и хабы НИКОГДА не
  // приколачивались (предсуществующий баг, вскрыт при аудите перелинковки).
  const norm = (u: string) => u.replace(/\/$/, '');
  const normalized = norm(currentUrl);

  // Статьи для этой страницы (вставляем в конец, уменьшая count на их количество)
  const articles = ARTICLE_MAP[normalized] ?? [];
  const landingCount = Math.max(count - articles.length, 0);

  // evenPool(pred, exclude): равномерная выборка пула по предикату.
  // Пул строится из СТАБИЛЬНОГО landingPages (не из per-source others), ротируется по
  // позиции текущей страницы В ЭТОМ ЖЕ пуле, и лишь потом отбрасываются текущая+хабы.
  // Стабильная база + смещение-по-индексу = скользящее окно РОВНО тайлит пул → каждая
  // страница набирает ~одинаково входящих (фикс. slice(0,N) копил всё на первых 6 →
  // 116 посадочных с <5 входящих в SEO-аудите). Хеш/per-source-массив оставляли пробелы.
  const evenPool = (pred: (u: string) => boolean, exclude: string[]): LandingPage[] => {
    const poolAll = landingPages.filter((p) => pred(norm(p.url)));
    const idx = poolAll.findIndex((p) => norm(p.url) === normalized);
    const off = idx >= 0 ? idx : globalHash(normalized, poolAll.length);
    const ex = new Set([normalized, ...exclude]);
    return rotate(poolAll, off).filter((p) => !ex.has(norm(p.url)));
  };

  const findPage = (u: string) => landingPages.find((p) => norm(p.url) === u);
  let base: LandingPage[];

  // IT-страница → IT-кластер (равномерно) в начале, потом общие
  if (IT_URLS.has(normalized)) {
    const itPages = evenPool((u) => IT_URLS.has(u), []);
    const rest = evenPool((u) => !IT_URLS.has(u), []);
    base = [...itPages, ...rest].slice(0, landingCount);
  }
  // Гео-страница → хабы /lager-v-podmoskove + /detskiy-lager приколоты, дальше гео и общие
  else if (GEO_URLS.has(normalized)) {
    const priority = [findPage('/lager-v-podmoskove'), findPage('/detskiy-lager')]
      .filter((p): p is LandingPage => !!p);
    const geoPages = evenPool((u) => GEO_URLS.has(u), ['/lager-v-podmoskove', '/detskiy-lager']);
    const rest = evenPool((u) => !GEO_URLS.has(u), ['/lager-v-podmoskove', '/detskiy-lager']);
    base = [...priority, ...geoPages, ...rest].slice(0, landingCount);
  }
  // Возрастная страница → /detskiy-lager + /lager-dlya-podrostkov приколоты, дальше возраст и общие
  else if (AGE_URLS.has(normalized)) {
    const priority = [findPage('/detskiy-lager'), findPage('/lager-dlya-podrostkov')]
      .filter((p): p is LandingPage => !!p);
    const agePages = evenPool((u) => AGE_URLS.has(u), ['/detskiy-lager', '/lager-dlya-podrostkov']);
    const rest = evenPool((u) => !AGE_URLS.has(u), ['/detskiy-lager', '/lager-dlya-podrostkov']);
    base = [...priority, ...agePages, ...rest].slice(0, landingCount);
  }
  // Ценовая страница → хабы /lager-nedorogo + /ceny приколоты, дальше ценовые и общие
  else if (PRICE_URLS.has(normalized)) {
    const priority = [findPage('/lager-nedorogo'), findPage('/ceny')]
      .filter((p): p is LandingPage => !!p && norm(p.url) !== normalized);
    const pricePages = evenPool((u) => PRICE_URLS.has(u), ['/lager-nedorogo', '/ceny']);
    const rest = evenPool((u) => !PRICE_URLS.has(u), ['/lager-nedorogo', '/ceny']);
    base = [...priority, ...pricePages, ...rest].slice(0, landingCount);
  }
  // Гео-страница общего охвата → /lagerya-v-gorode-moskva + /lager-v-podmoskove приколоты
  else if (GEO_GENERIC_URLS.has(normalized)) {
    const priority = [findPage('/lagerya-v-gorode-moskva'), findPage('/lager-v-podmoskove')]
      .filter((p): p is LandingPage => !!p && norm(p.url) !== normalized);
    const geoGenericPages = evenPool((u) => GEO_GENERIC_URLS.has(u), ['/lagerya-v-gorode-moskva', '/lager-v-podmoskove']);
    const rest = evenPool((u) => !GEO_GENERIC_URLS.has(u), ['/lagerya-v-gorode-moskva', '/lager-v-podmoskove']);
    base = [...priority, ...geoGenericPages, ...rest].slice(0, landingCount);
  }
  // Головная родовая страница → /luchshie-detskie-lagerya + /detskie-lagerya приколоты
  else if (HEAD_URLS.has(normalized)) {
    const priority = [findPage('/luchshie-detskie-lagerya'), findPage('/detskie-lagerya')]
      .filter((p): p is LandingPage => !!p && norm(p.url) !== normalized);
    const headPages = evenPool((u) => HEAD_URLS.has(u), ['/luchshie-detskie-lagerya', '/detskie-lagerya']);
    const rest = evenPool((u) => !HEAD_URLS.has(u), ['/luchshie-detskie-lagerya', '/detskie-lagerya']);
    base = [...priority, ...headPages, ...rest].slice(0, landingCount);
  }
  // Сезонная страница → /lager-na-leto-2026 + /lager-na-nedelyu приколоты
  else if (SEASON_URLS.has(normalized)) {
    const priority = [findPage('/lager-na-leto-2026'), findPage('/lager-na-nedelyu')]
      .filter((p): p is LandingPage => !!p && norm(p.url) !== normalized);
    const seasonPages = evenPool((u) => SEASON_URLS.has(u), ['/lager-na-leto-2026', '/lager-na-nedelyu']);
    const rest = evenPool((u) => !SEASON_URLS.has(u), ['/lager-na-leto-2026', '/lager-na-nedelyu']);
    base = [...priority, ...seasonPages, ...rest].slice(0, landingCount);
  }
  // Страница формата/фишек → /lager-s-basseynom + /pionerskiy-lager приколоты
  else if (SHAPE_URLS.has(normalized)) {
    const priority = [findPage('/lager-s-basseynom'), findPage('/pionerskiy-lager')]
      .filter((p): p is LandingPage => !!p && norm(p.url) !== normalized);
    const shapePages = evenPool((u) => SHAPE_URLS.has(u), ['/lager-s-basseynom', '/pionerskiy-lager']);
    const rest = evenPool((u) => !SHAPE_URLS.has(u), ['/lager-s-basseynom', '/pionerskiy-lager']);
    base = [...priority, ...shapePages, ...rest].slice(0, landingCount);
  }
  else {
    // Общие (коммерч./сезон.) страницы — равномерно по всему пулу
    base = evenPool(() => true, []).slice(0, landingCount);
  }

  return [...base, ...articles];
}

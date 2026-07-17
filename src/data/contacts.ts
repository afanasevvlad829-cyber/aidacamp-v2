// Единый источник контактных данных
import { PRICE_MIN, PRICE_MIN_ID, SEASON_YEAR } from './shifts';

export const PHONE_MAIN = '+7 (495) 128-44-29';
export const PHONE_MAIN_RAW = '+74951284429';
export const PHONE_MAIN_HREF = 'tel:+74951284429';

export const PHONE_MOBILE = '+7 (968) 808-64-55';
export const PHONE_MOBILE_RAW = '+79688086455';
export const PHONE_MOBILE_HREF = 'tel:+79688086455';

export const EMAIL = 'hello@codims.ru';
export const EMAIL_HREF = 'mailto:hello@codims.ru';

export const WHATSAPP_URL = 'https://wa.me/79688086455';
export const TELEGRAM_URL = 'https://t.me/Progaschool';
export const VK_URL = 'https://vk.com/aidacamp';
export const INSTAGRAM_URL = 'https://www.instagram.com/aidacamp.ru/';

export const YANDEX_MAPS_URL = 'https://yandex.ru/maps/?ll=36.724185,55.265643&z=15&pt=36.724185,55.265643,pm2rdm';
// Маршрут «моё местоположение → лагерь» в Яндекс.Картах. Клик = горячий intent-сигнал
// (цель maps_route_click: initContactTracking ловит rtext= в href).
export const YANDEX_MAPS_ROUTE_URL = 'https://yandex.ru/maps/?rtext=~55.265643%2C36.724185&rtt=auto';

export const STAT_FOUNDED_YEAR = '2021'; // год основания, синхронно с SchemaOrg foundingDate
export const STAT_YEARS = String(SEASON_YEAR - Number(STAT_FOUNDED_YEAR)); // лет работы — производная, не хардкодить
export const STAT_KIDS = '1200+';        // детей
export const STAT_RATING = '5.0';        // рейтинг на Яндекс.Картах
export const STAT_RATING_INCAMP = '4.8'; // рейтинг на incamp.ru — ДРУГАЯ площадка, не путать с STAT_RATING (Яндекс.Карты)
export const STAT_DISTANCE = '66 км';    // от Москвы
export const STAT_RETURN = '60%';        // возвращаются снова (по рекомендации/повторно)
export const STAT_INSURED = 'Застрахована ответственность туроператора (Росгосстрах)';
export const STAT_IT_CONTINUE = '78%';   // детей продолжают заниматься IT после лагеря (опрос выпускников)
export const PAYMENT_SPLIT = 'Оплата в два этапа: 50% при бронировании, 50% — за 3 недели до заезда';
export const STAT_LICENSE = 'Л035-01298-77/01082973'; // образовательная лицензия Минобрнауки
export const STAT_RTO = '025773'; // реестровый номер туроператора (РТО)
export const CAMP_SEASON = `июнь–август ${SEASON_YEAR}`;
// Якорь «от X» — берётся из минимума ОТКРЫТЫХ смен (PRICE_MIN из shifts.ts),
// чтобы не устаревать при смене сезона. Сейчас = 74 900 ₽ (10-дневная Смена 4).
export const CAMP_PRICE_FROM = PRICE_MIN;
// id смены, к которой относится CAMP_PRICE_FROM — используй для data-shift-link
// у ссылок «от {CAMP_PRICE_FROM}», чтобы ссылка не отставала от смены при смене сезона.
export const CAMP_PRICE_FROM_ID = PRICE_MIN_ID;

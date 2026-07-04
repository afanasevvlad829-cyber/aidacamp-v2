// Единый источник контактных данных
import { PRICE_MIN } from './shifts';

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

export const STAT_YEARS = '5';           // лет работы (с 2021, синхронно с SchemaOrg foundingDate)
export const STAT_KIDS = '1200+';        // детей
export const STAT_RATING = '5.0';        // рейтинг
export const STAT_DISTANCE = '66 км';    // от Москвы
export const STAT_RETURN = '60%';        // возвращаются снова
export const CAMP_SEASON = 'июнь–август 2026';
// Якорь «от X» — берётся из минимума ОТКРЫТЫХ смен (PRICE_MIN из shifts.ts),
// чтобы не устаревать при смене сезона. Сейчас = 74 900 ₽ (10-дневная Смена 4).
export const CAMP_PRICE_FROM = PRICE_MIN;

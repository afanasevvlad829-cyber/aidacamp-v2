// Tracking pixel IDs — single source of truth
export const YANDEX_METRIKA_ID = 96499295;
// VK Ads/Top.Mail.Ru сейчас не используется (нет активных кампаний) — счётчик top-fwz1.mail.ru
// не подключён нигде на сайте, поэтому эффекта от ID сейчас нет. Оставлен как справка на случай
// возврата к VK Ads: тогда понадобится и загрузчик counter.js, и пуши _tmr.push(...) обратно.
export const MAILRU_PIXEL_ID = 3755202;
/** ID счётчика Яндекс.Метрики. */
export const YM_COUNTER = YANDEX_METRIKA_ID;
export const YM_COUNTER_ID = String(YANDEX_METRIKA_ID);

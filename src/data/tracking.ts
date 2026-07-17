// Tracking pixel IDs — single source of truth
export const YANDEX_METRIKA_ID = 96499295;
// VK Ads/Top.Mail.Ru сейчас ВЫКЛЮЧЕН — активных кампаний в VK Ads нет (решение владельца
// 17.07.2026), гонять лишний внешний счётчик без дела незачем. Код пикселя (pageView/reachGoal
// push + загрузчик counter.js) остался в src/scripts/analytics.ts за этим флагом — включить
// одной строкой. Порядок включения и причина отключения — в _notes/Библиотека знаний/
// VK Ads — основные правила.md («Пиксель Top.Mail.Ru отключён»).
export const VK_ADS_ENABLED = false;
// Сверить актуальность в кабинете VK Ads/myTarget перед включением VK_ADS_ENABLED.
export const MAILRU_PIXEL_ID = 3755202;
/** ID счётчика Яндекс.Метрики. */
export const YM_COUNTER = YANDEX_METRIKA_ID;
export const YM_COUNTER_ID = String(YANDEX_METRIKA_ID);

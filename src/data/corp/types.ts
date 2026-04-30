// ── Corp Landing Page — Type Definitions ──────────────────────────────────

export interface CorpClient {
  /** Название компании-партнёра: "ГК ЛАНИТ" */
  clientName: string;
  /** Строка в nav-badge: "ПАРТНЁРСКАЯ ПРОГРАММА · ГК ЛАНИТ" */
  partnerBadge: string;
  /** Телефон: "+7 (495) 128-44-29" */
  phone: string;
  /** Скидка в % (0 если нет) */
  discount: number;
  /** Откуда трансфер: "от офиса ЛАНИТ" | null */
  transferFrom: string | null;
  /** Минимум детей для бесплатного трансфера */
  freeTransferMinKids: number;
  /** UTM source для ссылок */
  utmSource: string;
  /** Slug страницы: "lanit" → /lanit-v6 */
  slug: string;
}

export interface CorpTrack {
  age: string;       // "7–9"
  lang: string;      // "Scratch"
  title: string;     // "Scratch & анимация"
  desc: string;
  level: string;     // "Старт"
  hours: number;
}

export interface CorpWhyCard {
  icon: string;       // SVG path d=""
  title: string;
  text: string;
}

export interface CorpReview {
  name: string;
  date: string;
  photo: string;
  short: string;
  full: string;
  rating: number;
}

export interface CorpFaqItem {
  q: string;
  a: string;
}

/**
 * Призы — единый консолидированный каталог.
 *
 * Источник: счета Ozon 75413488-0010 (20.05.2026) и -0011 (21.05.2026).
 * Из 52 закупленных SKU оставлены 30 (нерелевантные позиции вроде ноутбука,
 * жилета с утяжелителями, бахил, скотча и т.п. удалены). Дубликаты слиты:
 *  - 3 SKU голограммы → 1 строка "Опыты Голограмма" (5 шт)
 *  - 4 SKU ночников Minecraft → 2 строки (Факел 3 шт, Колба 3 шт)
 *  - 2 SKU брелков → 1 строка "Брелки Minecraft" (30 шт)
 *
 * Цена — средняя/репрезентативная за штуку (в счетах одинаковые товары
 * шли по немного разной цене из-за продавцов).
 */

export interface PrizeItem {
  id: string;            // стабильный slug — для portal_prize_state
  name: string;
  price: number;         // ₽ за штуку — средневзвешенная по источникам
  qty: number;           // суммарное количество в закупке
  category?: string;
  img?: string;          // картинка с Ozon CDN
  url?: string;          // ссылка на карточку
  sources?: string[];    // для аудита — какие SKU из счетов сюда вошли
}

export const PRIZES: PrizeItem[] = [
  // ── Объединённые позиции ────────────────────────────────────────────────
  {
    id: 'prize-hologram',
    name: 'Опыты Голограмма (Подарок для мальчика и девочки)',
    price: 224, qty: 5,
    category: 'Опыты',
    img: 'https://ir.ozone.ru/s3/multimedia-1-g/wc1000/10541528260.jpg',
    url: 'https://www.ozon.ru/product/opyty-i-eksperimenty-dlya-detey-gologramma-podarok-dlya-malchika-i-devochki-3103794581/',
    sources: ['Голограмма 228×2', 'Голограмма 2в1 237×1', 'Голограмма 214×2'],
  },
  {
    id: 'prize-night-torch',
    name: 'Ночник Minecraft — Факел (светодиодный)',
    price: 507, qty: 3,
    category: 'Декор',
    img: 'https://ir.ozone.ru/s3/multimedia-1-o/wc1000/7295613612.jpg',
    url: 'https://www.ozon.ru/product/nochnik-svetilnik-maynkraft-ocean-of-light-fakel-minecraft-svetodiodnyy-915552091/',
    sources: ['Ocean of Light Факел 514×2', 'Детский ночник-факел 492×1'],
  },
  {
    id: 'prize-night-potion',
    name: 'Ночник Minecraft — Колба с зельем',
    price: 717, qty: 3,
    category: 'Декор',
    img: 'https://ir.ozone.ru/s3/multimedia-1-z/wc1000/7646341031.jpg',
    url: 'https://www.ozon.ru/product/ocean-of-light-nochnik-detskiy-dlya-sna-maynkraft-svetilnik-minecraft-dlya-detey-kolba-s-zelem-1084491803/',
    sources: ['Ocean of Light Колба 631×2', 'Детский ночник Майнкрафт колба 888×1'],
  },
  {
    id: 'prize-brelok',
    name: 'Брелки Minecraft (2 модели — фонарик-факел и пара)',
    price: 187, qty: 30,
    category: 'Сувенир',
    img: 'https://ir.ozone.ru/s3/multimedia-1-8/wc1000/9160701848.jpg',
    url: 'https://www.ozon.ru/product/brelok-fonarik-minecraft-svetyashchiysya-fakel-usb-zaryadka-podarok-rebenku-3378284656/',
    sources: ['Брелок 2шт 242×10', 'Брелок-фонарик 160×20'],
  },

  // ── Опыты и наборы (уникальные) ─────────────────────────────────────────
  {
    id: 'prize-opyty-10v1',
    name: 'Набор опытов «10 в 1» — эксперименты для детей',
    price: 849, qty: 2, category: 'Опыты',
    img: 'https://ir.ozone.ru/s3/multimedia-1-d/wc1000/7689179101.jpg',
    url: 'https://www.ozon.ru/product/nabor-opytov-dlya-detey-10-v-1-opyty-i-eksperimenty-dlya-detey-2195902200/',
  },
  {
    id: 'prize-raznotsv-plamya',
    name: 'Опыты «Разноцветное пламя»',
    price: 250, qty: 2, category: 'Опыты',
    img: 'https://ir.ozone.ru/s3/multimedia-1-2/wc1000/7292913050.jpg',
    url: 'https://www.ozon.ru/product/opyty-dlya-detey-raznotsvetnoe-plamya-razvivayushchiy-podarok-dlya-malchika-i-devochki-154703923/',
  },
  {
    id: 'prize-lava-lamp',
    name: 'Набор для опытов «Лава-Лампа»',
    price: 187, qty: 2, category: 'Опыты',
    img: 'https://ir.ozone.ru/s3/multimedia-1-3/wc1000/7675562199.jpg',
    url: 'https://www.ozon.ru/product/nabor-dlya-opytov-lava-lampa-opyty-dlya-detey-2322958175/',
  },
  {
    id: 'prize-faraonova-zmeya',
    name: 'Опыты «Фараонова змея»',
    price: 224, qty: 2, category: 'Опыты',
    img: 'https://ir.ozone.ru/s3/multimedia-1-8/wc1000/7292593520.jpg',
    url: 'https://www.ozon.ru/product/nabor-dlya-opytov-faraonova-zmeya-himicheskiy-eksperiment-dlya-detey-podarok-dlya-malchikov-154639740/',
  },
  {
    id: 'prize-pushistyy-rif',
    name: '«Пушистый риф» — выращивание кристаллов',
    price: 229, qty: 1, category: 'Кристаллы',
    img: 'https://ir.ozone.ru/s3/multimedia-1-9/wc1000/7292903121.jpg',
    url: 'https://www.ozon.ru/product/nabor-dlya-opytov-dlya-detey-pushistyy-rif-vyrashchivanie-kristallov-v-podarok-154704385/',
  },
  {
    id: 'prize-magnit-burya',
    name: '«Магнитная буря» — опыты с магнитами',
    price: 225, qty: 2, category: 'Опыты',
    img: 'https://ir.ozone.ru/s3/multimedia-1-t/wc1000/7300748657.jpg',
    url: 'https://www.ozon.ru/product/nabor-dlya-opytov-i-eksperimentov-magnitnaya-burya-razvivayushchiy-igry-s-magnitami-dlya-detey-300792417/',
  },
  {
    id: 'prize-fiksiki-12v1',
    name: 'Фиксики «12 в 1» — эксперименты',
    price: 585, qty: 1, category: 'Опыты',
    img: 'https://ir.ozone.ru/s3/multimedia-1-b/wc1000/8093140463.jpg',
    url: 'https://www.ozon.ru/product/nabor-dlya-opytov-fiksiki-fiksiki-12-v-1-eksperimenty-i-opyty-dlya-detey-522849179/',
  },
  {
    id: 'prize-snezh-lab',
    name: 'Опыты «Снежная лаборатория»',
    price: 149, qty: 2, category: 'Опыты',
    img: 'https://ir.ozone.ru/s3/multimedia-1-h/wc1000/9410844473.jpg',
    url: 'https://www.ozon.ru/product/opyty-i-eksperimenty-dlya-detey-snezhnaya-laboratoriya-2759805848/',
  },
  {
    id: 'prize-moy-mir-10v1',
    name: 'Набор «Мой мир» — 10 в 1',
    price: 1272, qty: 2, category: 'Опыты',
    img: 'https://ir.ozone.ru/s3/multimedia-1-l/wc1000/7970430153.jpg',
    url: 'https://www.ozon.ru/product/nabor-dlya-opytov-moy-mir-10-v-1-opyty-i-eksperimenty-dlya-detey-igrushka-dlya-malchika-2800935879/',
  },
  {
    id: 'prize-kartof-batareyka',
    name: '«Картофельная батарейка»',
    price: 275, qty: 1, category: 'Опыты',
    img: 'https://ir.ozone.ru/s3/multimedia-1-i/wc1000/8223585858.jpg',
    url: 'https://www.ozon.ru/product/nabor-dlya-opytov-kartofelnaya-batareyka-opyty-dlya-detey-2801018811/',
  },
  {
    id: 'prize-podsolnuh',
    name: 'Мини-сад «Подсолнух» — выращивание растений',
    price: 338, qty: 2, category: 'Сад',
    img: 'https://ir.ozone.ru/s3/multimedia-1-0/wc1000/10104125220.jpg',
    url: 'https://www.ozon.ru/product/nabor-dlya-vyrashchivaniya-rasteniy-mini-sad-podsolnuh-4112739592/',
  },
  {
    id: 'prize-dnk',
    name: 'Исследование ДНК',
    price: 842, qty: 1, category: 'Опыты',
    img: 'https://ir.ozone.ru/multimedia/wc1000/1022172002.jpg',
    url: 'https://www.ozon.ru/product/nabor-dlya-eksperimentov-issledovanie-dnk-150028575/',
  },
  {
    id: 'prize-sem-chudes-7v1',
    name: '«Семь чудес» — 7 в 1',
    price: 496, qty: 2, category: 'Опыты',
    img: 'https://ir.ozone.ru/s3/multimedia-1-3/wc1000/7340767203.jpg',
    url: 'https://www.ozon.ru/product/opyty-i-eksperimenty-dlya-detey-sem-chudes-7-v-1-podarok-na-novyy-god-detyam-167823357/',
  },
  {
    id: 'prize-lab-sveta',
    name: 'Лаборатория света — юный химик',
    price: 656, qty: 1, category: 'Опыты',
    img: 'https://ir.ozone.ru/s3/multimedia-1-0/wc1000/7777228608.jpg',
    url: 'https://www.ozon.ru/product/nabor-dlya-opytov-laboratoriya-sveta-himicheskie-eksperimenty-dlya-detey-8-let-v-podarok-yunyy-himik-866290815/',
  },
  {
    id: 'prize-zvezdnaya-pyl',
    name: 'Опыты «Звёздная пыль»',
    price: 218, qty: 2, category: 'Опыты',
    img: 'https://ir.ozone.ru/s3/multimedia-1-2/wc1000/7300776998.jpg',
    url: 'https://www.ozon.ru/product/opyty-dlya-detey-zvezdnaya-pyl-himicheskie-eksperimenty-dlya-malchikov-i-devochek-v-nabore-1305503337/',
  },
  {
    id: 'prize-kotik-kristally',
    name: 'Волшебный котик из кристаллов',
    price: 141, qty: 2, category: 'Кристаллы',
    img: 'https://ir.ozone.ru/s3/multimedia-1-i/wc1000/10109043846.jpg',
    url: 'https://www.ozon.ru/product/volshebnyy-kotik-iz-kristallov-opyty-dlya-detey-nabor-dlya-vyrashchivaniya-kristallov-2042460843/',
  },
  {
    id: 'prize-derevo-kristally',
    name: 'Волшебное дерево из кристаллов',
    price: 227, qty: 2, category: 'Кристаллы',
    img: 'https://ir.ozone.ru/s3/multimedia-1-k/wc1000/8080431968.jpg',
    url: 'https://www.ozon.ru/product/volshebnoe-derevo-rastushchee-iz-kristallov-opyty-dlya-detey-nabor-dlya-vyrashchivaniya-kristallov-2195934937/',
  },
  {
    id: 'prize-opyty-15v1',
    name: 'Набор опытов «15 в 1»',
    price: 887, qty: 2, category: 'Опыты',
    img: 'https://ir.ozone.ru/s3/multimedia-1-r/wc1000/9086733603.jpg',
    url: 'https://www.ozon.ru/product/nabor-opytov-15-v-1-opyty-i-eksperimenty-dlya-detey-2322967333/',
  },
  {
    id: 'prize-dyhanie-drakona',
    name: 'Опыты «Дыхание дракона»',
    price: 164, qty: 2, category: 'Опыты',
    img: 'https://ir.ozone.ru/s3/multimedia-1-o/wc1000/9495526704.jpg',
    url: 'https://www.ozon.ru/product/opyty-i-eksperimenty-dlya-detey-dyhanie-drakona-2759708625/',
  },
  {
    id: 'prize-lab-chervyachkov',
    name: 'Опыты «Лаборатория червячков»',
    price: 164, qty: 2, category: 'Опыты',
    img: 'https://ir.ozone.ru/s3/multimedia-1-v/wc1000/9410827891.jpg',
    url: 'https://www.ozon.ru/product/opyty-i-eksperimenty-dlya-detey-laboratoriya-chervyachkov-2760297844/',
  },
  {
    id: 'prize-yunyy-himik-6v1',
    name: 'Набор «Юный химик» — 6 в 1',
    price: 1033, qty: 2, category: 'Опыты',
    img: 'https://ir.ozone.ru/s3/multimedia-1-o/wc1000/9247131600.jpg',
    url: 'https://www.ozon.ru/product/nabor-opytov-6v1-himicheskie-opyty-dlya-detey-nabor-yunogo-himika-154702328/',
  },
];

export function getPrize(id: string): PrizeItem | null {
  return PRIZES.find((p) => p.id === id) ?? null;
}

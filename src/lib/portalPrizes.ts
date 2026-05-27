/**
 * Призы и подарки — каталог закупленных позиций по счетам Ozon.
 * Заполняется из счёт-оферт 75413488-0010 (20.05.2026) и 75413488-0011 (21.05.2026).
 *
 * Цены — то, что заплатили на Ozon. «Цена в Бонжере» хранится в localStorage
 * (редактируется админом на странице /portal/prizes).
 */
export interface PrizeItem {
  id: string;            // стабильный slug — для localStorage и удаления
  name: string;
  price: number;         // ₽ за штуку (Ozon)
  qty: number;
  category?: string;     // тип товара по счёту
  order?: string;        // номер заказа Ozon
}

function sl(n: number, name: string): string {
  // короткий стабильный slug
  const base = name
    .toLowerCase()
    .replace(/[^а-яa-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `p${n}-${base}`;
}

const RAW_0010: { name: string; price: number; qty: number; category?: string }[] = [
  { name: 'Набор опытов для детей 10 в 1, опыты и эксперименты для детей', price: 849, qty: 2, category: 'Hobbies&Creativity' },
  { name: 'Опыты и эксперименты для детей Голограмма / Подарок для мальчика и девочки', price: 228, qty: 2, category: 'Hobbies&Creativity' },
  { name: 'Мяч футбольный спортивный для зала и улицы, размер 5', price: 496, qty: 1, category: 'Sport' },
  { name: 'Опыты для детей Разноцветное пламя / Развивающий подарок для мальчика и девочки', price: 250, qty: 2, category: 'Hobbies&Creativity' },
  { name: 'Ночник светильник майнкрафт Ocean of Light, Факел minecraft светодиодный', price: 514, qty: 2, category: 'DIY' },
  { name: 'Набор для опытов "Лава-Лампа", опыты для детей', price: 187, qty: 2, category: 'Hobbies&Creativity' },
  { name: 'Жилет с утяжелителями регулируемый STRONG BODY, вес от 9.1 кг до 14.5 кг', price: 5075, qty: 1, category: 'Sport' },
  { name: 'Опыты и эксперименты для детей Голограмма 2 в 1 / Подарок для мальчика и девочки', price: 237, qty: 1, category: 'Hobbies&Creativity' },
  { name: 'Игровой ноутбук ASUS TUF Gaming F17 FX707VUR-HX248 17.3, Intel Core 5 - 210H, RAM 16GB, SSD 512GB, RTX 4050 6GB', price: 86999, qty: 1, category: 'Электроника' },
  { name: 'Набор для опытов Фараонова змея / Химический эксперимент для детей', price: 224, qty: 2, category: 'Hobbies&Creativity' },
  { name: 'Набор для опытов для детей Пушистый риф / Выращивание кристаллов', price: 229, qty: 1, category: 'Hobbies&Creativity' },
  { name: 'Набор для опытов и экспериментов Магнитная буря / Развивающие игры с магнитами', price: 225, qty: 2, category: 'Hobbies&Creativity' },
  { name: 'Набор для опытов ФИКСИКИ "Фиксики 12 в 1", эксперименты и опыты для детей', price: 585, qty: 1, category: 'Hobbies&Creativity' },
  { name: 'Малярная лента Альянс малярный скотч, 48мм×50м, 1 шт.', price: 160, qty: 3, category: 'DIY' },
  { name: 'Ватман А1, 5 листов, 200 г/м²', price: 343, qty: 1, category: 'School&Stationery' },
  { name: 'Опыты и эксперименты для детей Снежная лаборатория', price: 149, qty: 2, category: 'Hobbies&Creativity' },
  { name: 'Набор для опытов "Мой мир", 10 в 1, опыты и эксперименты для детей', price: 1272, qty: 2, category: 'Hobbies&Creativity' },
  { name: 'Набор для опытов "Картофельная батарейка", опыты для детей', price: 275, qty: 1, category: 'Hobbies&Creativity' },
  { name: 'Пряжа для вязания крючком/спицами Детская Новинка 12 шт, цвет ассорти', price: 222, qty: 1, category: 'Hobbies&Creativity' },
  { name: 'Набор для выращивания растений, мини-сад "Подсолнух"', price: 338, qty: 2, category: 'Hobbies&Creativity' },
  { name: 'Опыты и эксперименты для детей Голограмма / Подарок для мальчика и девочки', price: 214, qty: 2, category: 'Hobbies&Creativity' },
  { name: 'Набор для экспериментов Исследование ДНК', price: 842, qty: 1, category: 'Hobbies&Creativity' },
  { name: 'Опыты и эксперименты для детей "Семь чудес" 7 в 1', price: 496, qty: 2, category: 'Hobbies&Creativity' },
  { name: 'Средство для мытья пола GRASS Prograss Professional 5 л', price: 642, qty: 1, category: 'Fabric&Home' },
  { name: 'Сигнальный тренировочный конус, пластиковый разметчик, высота 10 см, набор 10 шт', price: 414, qty: 1, category: 'Sport' },
  { name: 'Конусы спортивные Mr. Fox, 10 шт, высота 4 см, фишки для футбола', price: 261, qty: 1, category: 'Sport' },
  { name: 'Маркеры для магнитной доски стираемые, набор 4 цвета', price: 228, qty: 5, category: 'School&Stationery' },
  { name: 'Набор для опытов Лаборатория света — химические эксперименты для детей', price: 656, qty: 1, category: 'Hobbies&Creativity' },
  { name: 'Ocean of Light, Ночник детский майнкрафт / Светильник minecraft колба с зельем', price: 631, qty: 2, category: 'DIY' },
  { name: 'Футбольный мяч размер 5 — RGX-FB-1725', price: 635, qty: 1, category: 'Sport' },
  { name: 'Опыты для детей Звёздная пыль / Химические эксперименты', price: 218, qty: 2, category: 'Hobbies&Creativity' },
  { name: 'Малярная лента Альянс малярный скотч, 48мм×50м, 6 шт.', price: 874, qty: 1, category: 'DIY' },
  { name: 'Бахилы одноразовые, 20 мкм, упаковка 50 пар, фиолетовые', price: 180, qty: 2, category: 'Pharmacy' },
  { name: 'Волшебный котик из кристаллов, набор для выращивания кристаллов', price: 141, qty: 2, category: 'Hobbies&Creativity' },
  { name: 'Маркеры спиртовые для скетчинга 24 шт Mazari FANTASIA', price: 212, qty: 1, category: 'Hobbies&Creativity' },
  { name: 'Волшебное дерево растущее из кристаллов, набор для выращивания кристаллов', price: 227, qty: 2, category: 'Hobbies&Creativity' },
  { name: 'Набор опытов, 15 в 1, опыты и эксперименты для детей', price: 887, qty: 2, category: 'Hobbies&Creativity' },
  { name: 'Брелок Майнкрафт, брелки 2 шт Minecraft светящиеся', price: 242, qty: 10, category: 'Галантерея' },
  { name: 'Шапочка для плавания Joss', price: 214, qty: 5, category: 'Sport' },
  { name: 'Освежитель воздуха Бреф Делюкс, набор 3 шт по 280 мл', price: 399, qty: 1, category: 'Fabric&Home' },
  { name: 'Опыты и эксперименты для детей Дыхание дракона', price: 164, qty: 2, category: 'Hobbies&Creativity' },
  { name: 'Опыты и эксперименты для детей Лаборатория червячков', price: 164, qty: 2, category: 'Hobbies&Creativity' },
  { name: 'Настольные игры для всей семьи с деньгами и фишками (Монополия-аналог)', price: 1356, qty: 1, category: 'Toys' },
  { name: 'Брелок фонарик Minecraft светящийся факел, USB зарядка', price: 160, qty: 20, category: 'Toys' },
  { name: 'Мелки для рисования на асфальте', price: 219, qty: 2, category: 'Hobbies&Creativity' },
  { name: 'Акварель, краски акварельные для рисования детские 12 цветов с кисточкой', price: 134, qty: 2, category: 'Hobbies&Creativity' },
  { name: 'Стаканы одноразовые 500 шт, 200 мл, пластиковые прозрачные', price: 788, qty: 1, category: 'Fabric&Home' },
];

const RAW_0011: { name: string; price: number; qty: number; category?: string }[] = [
  { name: 'Детский ночник Майнкрафт / Светильник minecraft, колба', price: 888, qty: 1, category: 'Декор' },
  { name: 'Детский ночник-факел Minecraft, светильник майнкрафт', price: 492, qty: 1, category: 'DIY' },
  { name: 'Набор опытов 6 в 1 / Химические опыты для детей / Набор юного химика', price: 1033, qty: 2, category: 'Hobbies&Creativity' },
  { name: 'Кабель HDMI DVI-D 3 м, чёрный', price: 158, qty: 1, category: 'Электроника' },
  { name: 'DVI HDMI, переходник DVI-D HDMI, адаптер', price: 228, qty: 1, category: 'Электроника' },
];

export const PRIZES: PrizeItem[] = [
  ...RAW_0010.map((r, i) => ({ ...r, id: sl(i + 1, r.name), order: '75413488-0010' })),
  ...RAW_0011.map((r, i) => ({ ...r, id: sl(100 + i + 1, r.name), order: '75413488-0011' })),
];

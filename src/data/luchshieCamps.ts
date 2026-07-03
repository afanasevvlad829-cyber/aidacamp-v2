// Данные для рейтинг-страницы /luchshie-detskie-lagerya.
// Формат: СРАВНЕНИЕ ПО ФАКТАМ (год работы, цена «от», оценка Яндекс.Карт).
// Оценка и число оценок Я.Карт — ТОЛЬКО реальные, собраны парсером с карточек организаций (данные на июль 2026).
// Цена «от» и год — с incamp.ru / vlagere.ru / сайтов лагерей (где нашли; иначе поле пустое).
// region — помечаем, если лагерь строго не в Подмосковье (Владимирская/Калужская обл.).
// Конкуренты — БЕЗ ссылок (не продвигаем). АйДаКемп в рейтинг НЕ входит — отдельный featured-блок.
// Внутри ниши сортировка: сначала по оценке, затем по числу оценок.

export interface RatedCamp {
  name: string;
  location: string;
  year?: number;       // год основания / «работает с»
  priceFrom?: string;  // цена «от» за смену (incamp/сайт)
  rating?: number;     // оценка Яндекс.Карт (только реальная)
  reviews?: number;    // число ОЦЕНОК на Яндекс.Картах (не текстовых отзывов)
  region?: string;     // пометка, если не Подмосковье
  note?: string;       // «что отмечают родители» — выжимка из текстов отзывов Я.Карт
}

export interface CampNiche {
  id: string;
  label: string;
  camps: RatedCamp[];
}

export const RATING_AS_OF = 'июль 2026';

// АйДаКемп — вне рейтинга (наш лагерь), выводится отдельным featured-блоком
export const OUR_CAMP = {
  name: 'АйДаКемп',
  location: 'Наро-Фоминский район, санаторий «Изумруд», 66 км от МКАД',
  niche: 'Загородный IT-лагерь с проживанием',
  year: 2021,
  rating: 5.0,
  reviews: 51,
};

export const campNiches: CampNiche[] = [
  {
    id: 'it',
    label: 'IT и технологии',
    camps: [
      { name: 'CODDY', location: 'Москва (загородный CODDY CAMP)', year: 2016, priceFrom: '118 800 ₽', rating: 5.0, reviews: 311 , note: 'хвалят преподавателей, обратную связь и гибкость с переносом занятий' },
      { name: 'Компьютерная академия TOP', location: 'Москва', year: 1999, rating: 5.0, reviews: 300 , note: 'отмечают опытных преподавателей и удобный график занятий' },
      { name: 'KIBERone', location: 'Москва', year: 2016, rating: 5.0, reviews: 114 , note: 'ходят с радостью: молодые педагоги, «кибероны» за успехи и прогресс' },
      { name: 'Cyber Class', location: 'Петушинский р-н', priceFrom: '89 900 ₽', rating: 4.9, reviews: 181, region: 'Владимирская обл.' , note: 'тёплая атмосфера и сильные педагоги; отмечают, что оборудование не новое' },
      { name: 'Алгоритмика', location: 'Мытищи', year: 2016, rating: 4.9, reviews: 162 , note: 'нравятся интенсивы и наставники; кому-то не по душе доп. предложения' },
      { name: 'Авиатор (БПЛА, дроны)', location: 'Домодедово, с. Битягово, 31 км от МКАД', priceFrom: '84 500 ₽', rating: 4.8, reviews: 93 , note: 'хвалят дроны и авиацию, большую территорию S7 и внимательных вожатых' },
      { name: 'Пиксель', location: 'Чехов', priceFrom: '19 475 ₽', rating: 4.8, reviews: 49 , note: 'хвалят робототехнику и педагогов; лагерь считают недешёвым' },
      { name: 'Инжинириум (МГТУ им. Баумана)', location: 'Люберцы, Малаховка', year: 2016, priceFrom: '45 500 ₽', rating: 4.4, reviews: 10 , note: 'техуклон, индивидуальный подход и растущая сложность; ходят по несколько лет' },
      { name: 'Кодабра', location: 'Москва', rating: 4.1, reviews: 21 , note: 'отзывов немного, мнения смешанные; хвалят программу на Minecraft' },
    ],
  },
  {
    id: 'language',
    label: 'Языковые',
    camps: [
      { name: 'BKC / ВКС кэмп', location: 'Покров, ~90 км от Москвы', priceFrom: '32 290 ₽', rating: 5.0, reviews: 1038, region: 'граница Владимирской обл.' , note: 'английский с носителями, домики по отрядам, верёвочный парк; отмечают цену' },
      { name: 'Объединённое Королевство', location: 'Одинцово', year: 1999, priceFrom: '88 160 ₽', rating: 5.0, reviews: 375 , note: 'хвалят вожатых, питание и запрет гаджетов' },
      { name: 'Oxford Camp', location: 'Орехово-Зуево', priceFrom: '84 990 ₽', rating: 5.0, reviews: 318 , note: 'хвалят питание, вожатых, бассейн и ежедневный английский; ездят повторно' },
      { name: 'Планета Английского и Китайского', location: 'Пушкинский р-н, Костино', priceFrom: '67 500 ₽', rating: 5.0, reviews: 304 , note: 'занятия с носителями и вожатые; многие ездят по 3–4 раза' },
      { name: 'Полиглотики', location: 'Москва', rating: 5.0, reviews: 63 , note: 'маленькие группы, игровой формат и обратная связь педагога после занятий' },
      { name: 'Евразия Клуб (Евроклуб)', location: 'Истра', priceFrom: '130 950 ₽', rating: 4.9, reviews: 426 , note: 'детям не хочется уезжать: вожатые, еда и насыщенная программа' },
      { name: 'Сорока Кэмп', location: 'Орехово-Зуево', priceFrom: '44 000 ₽', rating: 4.9, reviews: 249 , note: 'хвалят носителей языка, бассейн и добрый персонал' },
    ],
  },
  {
    id: 'sport',
    label: 'Спортивные',
    camps: [
      { name: 'Чемпионика', location: 'Лобня', rating: 5.0, reviews: 70 , note: 'хвалят тренеров и турниры, виден результат' },
      { name: 'SwimRocket (плавание)', location: 'Москва и область', rating: 4.9, reviews: 103 , note: 'хвалят соревнования «Гонки ракет» и выездные сборы' },
      { name: 'Спартак Кэмп (футбол)', location: 'Москва', rating: 4.7, reviews: 29 , note: 'хвалят тренеров академии «Спартак» и прогресс ребёнка' },
      { name: 'Profiball Camp (футбол)', location: 'Москва и область', rating: 4.6, reviews: 38 , note: 'хвалят тренеров, футбольную базу, чистое поле и бассейн' },
      { name: 'Метеор (футбол)', location: 'Москва', priceFrom: '62 900 ₽', rating: 4.2, reviews: 23 , note: 'мнения расходятся: кто-то доволен активностями, кто-то — сменой тренеров' },
      { name: 'Гудвин', location: 'Клин', rating: 4.1, reviews: 17 , note: 'отзывов немного: отмечают программу, свежий ремонт, еду и природу' },
    ],
  },
  {
    id: 'creative',
    label: 'Творческие',
    camps: [
      { name: 'Аплодисменты (театр)', location: 'Москва', priceFrom: '84 190 ₽', rating: 5.0, reviews: 234 , note: 'творческие направления, заряженные вожатые и тёплая семейная атмосфера' },
      { name: 'Дорога добра', location: 'Ногинск', priceFrom: '60 000 ₽', rating: 5.0, reviews: 65 , note: 'уютная атмосфера, добрые вожатые, домашняя еда и маленькие отряды' },
      { name: 'Театральный лагерь «Артист»', location: 'Москва', rating: 5.0, reviews: 37 , note: 'семейная атмосфера и итоговый спектакль; возвращаются много лет' },
    ],
  },
  {
    id: 'health',
    label: 'Оздоровительные и загородные',
    camps: [
      { name: 'Орлёнок', location: 'Клинский район, п/о Зубово', year: 1965, rating: 5.0, reviews: 1033 , note: 'пионерская атмосфера, хорошая еда, кружки и детокс от телефонов; мест мало' },
      { name: 'Лаборатория Приключений', location: 'Пушкино', rating: 5.0, reviews: 323 , note: 'ролевые игры «Сталкер» и «Зомби» затягивают, занятость и еда' },
      { name: 'Наследие', location: 'Одинцово', rating: 5.0, reviews: 123 , note: 'погружение в славянскую ролевую игру и актёры; к быту бывают вопросы' },
      { name: 'Спутник (ДОЛ)', location: 'Подмосковье', rating: 4.4, reviews: 23 , note: 'отзывов мало и в основном ностальгические — про прежние годы' },
      { name: 'Лагерь «Патриот»', location: 'Подмосковье', rating: 3.7, reviews: 18 , note: 'отзывов мало, короткие и хвалебные — без развёрнутой конкретики' },
    ],
  },
  {
    id: 'adventure',
    label: 'Приключенческие и активные',
    camps: [
      { name: 'Робин Гуд (конный, верёвочный)', location: 'Кремёнки, 100 км от Москвы', priceFrom: '116 950 ₽', rating: 5.0, reviews: 1153, region: 'Калужская обл.' , note: 'хвалят вожатых, пятиразовое питание и запрет телефонов' },
      { name: 'Лагерь настоящих героев', location: 'Парк «Патриот», 55 км Минского ш.', rating: 5.0, reviews: 962 , note: 'хвалят программу и вожатых; армейская дисциплина подходит не всем' },
      { name: 'Робинзонада', location: 'Истра (Мансурово)', year: 1991, priceFrom: '60 000 ₽', rating: 5.0, reviews: 407 , note: 'насыщенная программа, вожатые, природа и отдых от гаджетов; заходит и новичкам' },
    ],
  },
];

// ТИР-2: ещё лагеря Подмосковья с собственной карточкой Я.Карт — компактно (имя + оценка + число оценок).
// Собраны харвестером поисковой выдачи Я.Карт (июль 2026), дедуп против тир-1, отсеяны не-лагеря/дубли/гео-ауты.
export interface CompactCamp { name: string; location?: string; rating: number; reviews: number }
export const moreYandexCamps: CompactCamp[] = [
  { name: "Юнармеец", rating: 4.9, reviews: 9652 },
  { name: "Лесная сказка", location: "д. Орлово", rating: 4.9, reviews: 9127 },
  { name: "Комок", location: "Москва", rating: 4.9, reviews: 9123 },
  { name: "Топскул", location: "Королёв", rating: 4.9, reviews: 9117 },
  { name: "Берёзка", location: "д. Нижневасильевское", rating: 4.8, reviews: 8616 },
  { name: "ИскраГрад", location: "г.о. Раменский", rating: 4.8, reviews: 8588 },
  { name: "Непецино", location: "с. Непецино", rating: 4.8, reviews: 8489 },
  { name: "Ромашка", location: "Подольск", rating: 4.8, reviews: 8248 },
  { name: "Луч", location: "г.о. Орехово-Зуевский", rating: 4.8, reviews: 8171 },
  { name: "ПростоЛето", location: "г.о. Одинцовский", rating: 4.8, reviews: 8151 },
  { name: "E-Camp", location: "Москва", rating: 4.8, reviews: 8102 },
  { name: "ДОЛ им. Ю.А. Гагарина (МИД РФ)", location: "пос. Юность", rating: 4.7, reviews: 7517 },
  { name: "Солнечный", location: "пос. Поварово", rating: 4.7, reviews: 7262 },
  { name: "ОтдыхКласс", location: "пос. Огниково", rating: 4.7, reviews: 7126 },
  { name: "Дубравушка", location: "д. Маришкино", rating: 4.6, reviews: 6524 },
  { name: "Дружба им. Ливанова", location: "Дмитров", rating: 4.6, reviews: 6279 },
  { name: "Алмаз", location: "Руза", rating: 4.5, reviews: 5460 },
  { name: "Звонкие голоса", location: "пос. Чайковского", rating: 4.4, reviews: 4428 },
  { name: "Лагерь в Кратово", location: "пос. Кратово", rating: 4.4, reviews: 4126 },
  { name: "Заря", location: "Дмитров", rating: 4.3, reviews: 3259 },
  { name: "Литвиново", location: "д. Литвиново", rating: 5.0, reviews: 1420 },
  { name: "Родина", rating: 5.0, reviews: 1214 },
  { name: "Левково", rating: 5.0, reviews: 1005 },
  { name: "Салют", location: "с. Никольское", rating: 5.0, reviews: 901 },
  { name: "Лингвамания", location: "д. Ларёво", rating: 4.8, reviews: 866 },
  { name: "Enjoy Camp (Ёлочки)", location: "Домодедово", rating: 5.0, reviews: 791 },
  { name: "Лукоморье", location: "д. Супонево", rating: 4.7, reviews: 757 },
  { name: "Мир", location: "д. Калитино", rating: 5.0, reviews: 751 },
  { name: "Счастливые лица", location: "Щёлково", rating: 5.0, reviews: 748 },
  { name: "Искорка", location: "Домодедово", rating: 5.0, reviews: 723 },
  { name: "ILS (языковой)", rating: 4.6, reviews: 627 },
  { name: "Бест Френдс", location: "с. Троицкое", rating: 5.0, reviews: 614 },
  { name: "SmileCamp", location: "пос. Радиоцентр", rating: 4.5, reviews: 532 },
  { name: "Вуаля Тайм 911", location: "д. Малое", rating: 5.0, reviews: 520 },
  { name: "Радуга", location: "д. Пронское", rating: 5.0, reviews: 510 },
  { name: "Кубик", location: "Балашиха", rating: 5.0, reviews: 489 },
  { name: "Дружите.ру", location: "Москва", rating: 5.0, reviews: 471 },
  { name: "Чайка-Новая цивилизация", location: "д. Редькино", rating: 5.0, reviews: 421 },
  { name: "Дубки", rating: 5.0, reviews: 419 },
  { name: "ЛибКэмп", rating: 4.4, reviews: 410 },
  { name: "Мечта", location: "Подольск", rating: 5.0, reviews: 371 },
  { name: "Фоллоу Ми Кэмп", rating: 5.0, reviews: 269 },
  { name: "Контакт", location: "пос. Малаховка", rating: 5.0, reviews: 268 },
  { name: "Ёлка", location: "с. Левково", rating: 5.0, reviews: 258 },
  { name: "Филлкемп", location: "Москва", rating: 5.0, reviews: 257 },
  { name: "Василевский (воен.-спорт.)", location: "г.о. Богородский", rating: 4.2, reviews: 230 },
  { name: "Мир в дружбе", location: "д. Громково", rating: 5.0, reviews: 209 },
  { name: "Next Camp", location: "пос. Зелёный", rating: 5.0, reviews: 182 },
  { name: "Сага", location: "Зеленоград", rating: 5.0, reviews: 173 },
  { name: "Фокс Кэмп", location: "пос. Зелёный", rating: 5.0, reviews: 145 },
  { name: "Вандэрлэнд", location: "Мытищи", rating: 5.0, reviews: 137 },
  { name: "Красный воин (пионерский)", location: "г.о. Наро-Фоминский", rating: 4.1, reviews: 116 },
  { name: "Campidea", location: "Москва", rating: 5.0, reviews: 96 },
  { name: "Совёнок", location: "Жуковский", rating: 5.0, reviews: 92 },
  { name: "Нескучный город", location: "Королёв", rating: 5.0, reviews: 82 },
  { name: "Английское лето", location: "д. Прохорово", rating: 3.6, reviews: 66 },
  { name: "Let's Play!", location: "с. Троицкое", rating: 5.0, reviews: 58 },
  { name: "Junlab", location: "Одинцово", rating: 5.0, reviews: 54 },
  { name: "Ура! Каникулы!", location: "Зеленоград", rating: 4.3, reviews: 35 },
];

// ОТДЕЛЬНЫЙ БЛОК «по данным каталогов» — агрегаторные рейтинги (incamp.ru / vlagere.ru).
// Помечены как МЕНЕЕ строгие: методика агрегатора закрыта, не Яндекс.Карты. Цена «от» и локация — оттуда же.
export interface CatalogCamp { name: string; direction: string; location: string; priceFrom?: string; rating: number; reviews: number; region?: string }
export const catalogCamps: CatalogCamp[] = [
  { name: 'Живая Легенда', direction: 'спорт, тематический', location: 'Боровск', priceFrom: '91 105 ₽', rating: 4.8, reviews: 140, region: 'Калужская обл.' },
  { name: 'Великое Княжество', direction: 'языковой, православный', location: 'Люберцы', rating: 4.8, reviews: 126 },
  { name: 'Neo Camp', direction: 'спорт, творческий', location: 'пос. Алешково', priceFrom: '78 500 ₽', rating: 4.5, reviews: 111, region: 'Калужская обл.' },
  { name: 'Молодёжный проект 911', direction: 'интеллект., творческий', location: 'Коломна', priceFrom: '79 325 ₽', rating: 4.8, reviews: 108 },
  { name: 'КИД Travel. Контакт', direction: 'оздоровительный', location: 'Люберецкий р-н', priceFrom: '45 500 ₽', rating: 4.8, reviews: 89 },
  { name: 'Лидер. Успешный старт', direction: 'образоват., творческий', location: 'Коломна', priceFrom: '80 828 ₽', rating: 4.7, reviews: 74 },
  { name: 'Страна Оз', direction: 'оздоров., спортивный', location: 'Коломна', rating: 4.9, reviews: 72 },
  { name: 'Дружите.ру Мыс Рока', direction: 'вокал, творческий', location: 'Рузский р-н', priceFrom: '92 055 ₽', rating: 4.7, reviews: 72 },
  { name: 'Федерация', direction: 'военно-патриот., спорт', location: 'Подольский р-н', rating: 4.6, reviews: 72 },
  { name: 'Форпост', direction: 'военно-патриотический', location: 'Пушкино', priceFrom: '80 800 ₽', rating: 4.9, reviews: 68 },
  { name: 'Смарт. Суперлига', direction: 'IT, спортивный', location: 'Коломна', priceFrom: '81 900 ₽', rating: 4.7, reviews: 64 },
  { name: 'Азбука Танцев', direction: 'танцы, творческий', location: 'Дмитровский р-н', priceFrom: '65 000 ₽', rating: 5.0, reviews: 51 },
  { name: 'Вымпел-Шторм (Непецино)', direction: 'спорт, туризм', location: 'Коломна', priceFrom: '83 790 ₽', rating: 4.8, reviews: 49 },
  { name: 'Дача Теремок', direction: 'конный, творческий', location: 'Подольск', priceFrom: '25 000 ₽', rating: 4.8, reviews: 46 },
  { name: 'SportZania', direction: 'языковой, спортивный', location: 'Истринский р-н', priceFrom: '132 400 ₽', rating: 4.8, reviews: 41 },
  { name: 'Терра Ностра', direction: 'интеллект., театральный', location: 'Шатура', priceFrom: '70 490 ₽', rating: 5.0, reviews: 35 },
  { name: 'Туристёнок', direction: 'туризм, спортивный', location: 'Пушкино', priceFrom: '84 800 ₽', rating: 4.9, reviews: 34 },
  { name: 'Азбука Видеосъёмки и Кино', direction: 'кинолагерь, творческий', location: 'Дмитровский р-н', priceFrom: '65 000 ₽', rating: 5.0, reviews: 24 },
  { name: 'Young and Active', direction: 'спорт, творческий', location: 'Гагарин', priceFrom: '78 400 ₽', rating: 5.0, reviews: 22, region: 'Смоленская обл.' },
  { name: 'Оксфорд кэмп классика', direction: 'образоват., творческий', location: 'Орехово-Зуево', priceFrom: '79 990 ₽', rating: 4.9, reviews: 15 },
  { name: 'Команда Первых', direction: 'спорт, семейный', location: 'Солнечногорский р-н', priceFrom: '44 650 ₽', rating: 5.0, reviews: 14 },
  { name: 'Рыцарский замок', direction: 'тематический', location: 'Коломенский р-н', priceFrom: '81 605 ₽', rating: 5.0, reviews: 13 },
  { name: 'Детский Наукоград', direction: 'образоват., театральный', location: 'Москва', priceFrom: '80 750 ₽', rating: 4.6, reviews: 11 },
  { name: 'Школа мужества. Турслёт', direction: 'туризм, палаточный', location: 'Истринский р-н', priceFrom: '51 000 ₽', rating: 5.0, reviews: 5 },
  { name: 'Мир Игр (фиджитал)', direction: 'киберспорт', location: 'Истринский р-н', priceFrom: '80 750 ₽', rating: 5.0, reviews: 5 },
  { name: 'Logo Polis', direction: 'языковой, творческий', location: 'Воскресенский р-н', priceFrom: '112 005 ₽', rating: 5.0, reviews: 3 },
];

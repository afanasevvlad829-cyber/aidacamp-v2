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
  img?: string;          // картинка с Ozon CDN
  url?: string;          // ссылка на карточку Ozon
}

type RawItem = { name: string; price: number; qty: number; category?: string; img?: string; url?: string }

function sl(n: number, name: string): string {
  // короткий стабильный slug
  const base = name
    .toLowerCase()
    .replace(/[^а-яa-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `p${n}-${base}`;
}

const RAW_0010: RawItem[] = [
  { name: 'Набор опытов для детей 10 в 1, опыты и эксперименты для детей', price: 849, qty: 2, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/s3/multimedia-1-d/wc1000/7689179101.jpg', url: 'https://www.ozon.ru/product/nabor-opytov-dlya-detey-10-v-1-opyty-i-eksperimenty-dlya-detey-2195902200/' },
  { name: 'Опыты и эксперименты для детей Голограмма / Подарок для мальчика и девочки', price: 228, qty: 2, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/s3/multimedia-1-g/wc1000/10541528260.jpg', url: 'https://www.ozon.ru/product/opyty-i-eksperimenty-dlya-detey-gologramma-podarok-dlya-malchika-i-devochki-3103794581/' },
  { name: 'Мяч футбольный спортивный для зала и улицы, размер 5', price: 496, qty: 1, category: 'Sport', img: 'https://ir.ozone.ru/s3/multimedia-1-t/wc1000/9493518305.jpg', url: 'https://www.ozon.ru/product/myach-futbolnyy-sportivnyy-dlya-zala-i-ulitsy-razmer-5-629392679/' },
  { name: 'Опыты для детей Разноцветное пламя / Развивающий подарок для мальчика и девочки', price: 250, qty: 2, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/s3/multimedia-1-2/wc1000/7292913050.jpg', url: 'https://www.ozon.ru/product/opyty-dlya-detey-raznotsvetnoe-plamya-razvivayushchiy-podarok-dlya-malchika-i-devochki-154703923/' },
  { name: 'Ночник светильник майнкрафт Ocean of Light, Факел minecraft светодиодный', price: 514, qty: 2, category: 'DIY', img: 'https://ir.ozone.ru/s3/multimedia-1-o/wc1000/7295613612.jpg', url: 'https://www.ozon.ru/product/nochnik-svetilnik-maynkraft-ocean-of-light-fakel-minecraft-svetodiodnyy-915552091/' },
  { name: 'Набор для опытов "Лава-Лампа", опыты для детей', price: 187, qty: 2, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/s3/multimedia-1-3/wc1000/7675562199.jpg', url: 'https://www.ozon.ru/product/nabor-dlya-opytov-lava-lampa-opyty-dlya-detey-2322958175/' },
  { name: 'Жилет с утяжелителями регулируемый STRONG BODY, вес от 9.1 кг до 14.5 кг', price: 5075, qty: 1, category: 'Sport', img: 'https://ir.ozone.ru/s3/multimedia-1-o/wc1000/10351850676.jpg', url: 'https://www.ozon.ru/product/zhilet-s-utyazhelitelyami-reguliruemyy-strong-body-ves-ot-9-1-kg-do-14-5-kg-sportivnyy-3523049366/' },
  { name: 'Опыты и эксперименты для детей Голограмма 2 в 1 / Подарок для мальчика и девочки', price: 237, qty: 1, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/s3/multimedia-1-g/wc1000/10541528260.jpg', url: 'https://www.ozon.ru/product/opyty-i-eksperimenty-dlya-detey-gologramma-podarok-dlya-malchika-i-devochki-3103794581/' },
  { name: 'Игровой ноутбук ASUS TUF Gaming F17 FX707VUR-HX248 17.3, Intel Core 5 - 210H, RAM 16GB, SSD 512GB, RTX 4050 6GB', price: 86999, qty: 1, category: 'Электроника', img: 'https://ir.ozone.ru/s3/multimedia-1-k/wc1000/9667200944.jpg', url: 'https://www.ozon.ru/product/asus-tuf-gaming-f17-igrovoy-noutbuk-17-30-intel-core-5-210h-ram-16-gb-ssd-512-gb-nvidia-geforce-rtx-3862483523/' },
  { name: 'Набор для опытов Фараонова змея / Химический эксперимент для детей', price: 224, qty: 2, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/s3/multimedia-1-8/wc1000/7292593520.jpg', url: 'https://www.ozon.ru/product/nabor-dlya-opytov-faraonova-zmeya-himicheskiy-eksperiment-dlya-detey-podarok-dlya-malchikov-154639740/' },
  { name: 'Набор для опытов для детей Пушистый риф / Выращивание кристаллов', price: 229, qty: 1, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/s3/multimedia-1-9/wc1000/7292903121.jpg', url: 'https://www.ozon.ru/product/nabor-dlya-opytov-dlya-detey-pushistyy-rif-vyrashchivanie-kristallov-v-podarok-154704385/' },
  { name: 'Набор для опытов и экспериментов Магнитная буря / Развивающие игры с магнитами', price: 225, qty: 2, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/s3/multimedia-1-t/wc1000/7300748657.jpg', url: 'https://www.ozon.ru/product/nabor-dlya-opytov-i-eksperimentov-magnitnaya-burya-razvivayushchiy-igry-s-magnitami-dlya-detey-300792417/' },
  { name: 'Набор для опытов ФИКСИКИ "Фиксики 12 в 1", эксперименты и опыты для детей', price: 585, qty: 1, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/s3/multimedia-1-b/wc1000/8093140463.jpg', url: 'https://www.ozon.ru/product/nabor-dlya-opytov-fiksiki-fiksiki-12-v-1-eksperimenty-i-opyty-dlya-detey-522849179/' },
  { name: 'Малярная лента Альянс малярный скотч, 48мм×50м, 1 шт.', price: 160, qty: 3, category: 'DIY', img: 'https://ir.ozone.ru/s3/multimedia-1-f/wc1000/10465296315.jpg', url: 'https://www.ozon.ru/product/malyarnaya-lenta-alyans-malyarnyy-skotch-48mm-50m-1-sht-1015045795/' },
  { name: 'Ватман А1, 5 листов, 200 г/м²', price: 343, qty: 1, category: 'School&Stationery', img: 'https://ir.ozone.ru/s3/multimedia-1-r/wc1000/9605828403.jpg', url: 'https://www.ozon.ru/product/vatman-a1-5-listov-200-g-m2-2157518406/' },
  { name: 'Опыты и эксперименты для детей Снежная лаборатория', price: 149, qty: 2, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/s3/multimedia-1-h/wc1000/9410844473.jpg', url: 'https://www.ozon.ru/product/opyty-i-eksperimenty-dlya-detey-snezhnaya-laboratoriya-2759805848/' },
  { name: 'Набор для опытов "Мой мир", 10 в 1, опыты и эксперименты для детей', price: 1272, qty: 2, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/s3/multimedia-1-l/wc1000/7970430153.jpg', url: 'https://www.ozon.ru/product/nabor-dlya-opytov-moy-mir-10-v-1-opyty-i-eksperimenty-dlya-detey-igrushka-dlya-malchika-2800935879/' },
  { name: 'Набор для опытов "Картофельная батарейка", опыты для детей', price: 275, qty: 1, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/s3/multimedia-1-i/wc1000/8223585858.jpg', url: 'https://www.ozon.ru/product/nabor-dlya-opytov-kartofelnaya-batareyka-opyty-dlya-detey-2801018811/' },
  { name: 'Пряжа для вязания крючком/спицами Детская Новинка 12 шт, цвет ассорти', price: 222, qty: 1, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/s3/multimedia-1-t/wc1000/8397628265.jpg', url: 'https://www.ozon.ru/product/pryazha-dlya-vyazaniya-kryuchkomnitki-dlya-vyazaniya-spitsami-detskaya-novinka12-sht-tsvet-assorti-2839254540/' },
  { name: 'Набор для выращивания растений, мини-сад "Подсолнух"', price: 338, qty: 2, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/s3/multimedia-1-0/wc1000/10104125220.jpg', url: 'https://www.ozon.ru/product/nabor-dlya-vyrashchivaniya-rasteniy-mini-sad-podsolnuh-4112739592/' },
  { name: 'Опыты и эксперименты для детей Голограмма / Подарок для мальчика и девочки', price: 214, qty: 2, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/s3/multimedia-1-g/wc1000/10541528260.jpg', url: 'https://www.ozon.ru/product/opyty-i-eksperimenty-dlya-detey-gologramma-podarok-dlya-malchika-i-devochki-3103794581/' },
  { name: 'Набор для экспериментов Исследование ДНК', price: 842, qty: 1, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/multimedia/wc1000/1022172002.jpg', url: 'https://www.ozon.ru/product/nabor-dlya-eksperimentov-issledovanie-dnk-150028575/' },
  { name: 'Опыты и эксперименты для детей "Семь чудес" 7 в 1', price: 496, qty: 2, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/s3/multimedia-1-3/wc1000/7340767203.jpg', url: 'https://www.ozon.ru/product/opyty-i-eksperimenty-dlya-detey-sem-chudes-7-v-1-podarok-na-novyy-god-detyam-167823357/' },
  { name: 'Средство для мытья пола GRASS Prograss Professional 5 л', price: 642, qty: 1, category: 'Fabric&Home', img: 'https://ir.ozone.ru/s3/multimedia-1-v/wc1000/7624218307.jpg', url: 'https://www.ozon.ru/product/sredstvo-dlya-mytya-pola-grass-prograss-professional-5-litrov-universalnoe-moyushchee-sredstvo-dlya-217287705/' },
  { name: 'Сигнальный тренировочный конус, пластиковый разметчик, высота 10 см, набор 10 шт', price: 414, qty: 1, category: 'Sport', img: 'https://ir.ozone.ru/s3/multimedia-u/wc1000/6220554498.jpg', url: 'https://www.ozon.ru/product/signalnyy-trenirovochnyy-konus-sportivnyy-futbolnyy-konus-dlya-razmetki-plastikovyy-razmetchik-461240902/' },
  { name: 'Конусы спортивные Mr. Fox, 10 шт, высота 4 см, фишки для футбола', price: 261, qty: 1, category: 'Sport', img: 'https://ir.ozone.ru/s3/multimedia-1-f/wc1000/9405169035.jpg', url: 'https://www.ozon.ru/product/konusy-sportivnye-mr-fox-10-shtuk-vysota-4-sm-diametr-12-sm-fishki-dlya-futbola-728121286/' },
  { name: 'Маркеры для магнитной доски стираемые, набор 4 цвета', price: 228, qty: 5, category: 'School&Stationery', img: 'https://ir.ozone.ru/s3/multimedia-1-p/wc1000/9012171409.jpg', url: 'https://www.ozon.ru/product/markery-dlya-magnitnoy-doski-stiraemye-nabor-4-tsveta-798240003/' },
  { name: 'Набор для опытов Лаборатория света — химические эксперименты для детей', price: 656, qty: 1, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/s3/multimedia-1-0/wc1000/7777228608.jpg', url: 'https://www.ozon.ru/product/nabor-dlya-opytov-laboratoriya-sveta-himicheskie-eksperimenty-dlya-detey-8-let-v-podarok-yunyy-himik-866290815/' },
  { name: 'Ocean of Light, Ночник детский майнкрафт / Светильник minecraft колба с зельем', price: 631, qty: 2, category: 'DIY', img: 'https://ir.ozone.ru/s3/multimedia-1-z/wc1000/7646341031.jpg', url: 'https://www.ozon.ru/product/ocean-of-light-nochnik-detskiy-dlya-sna-maynkraft-svetilnik-minecraft-dlya-detey-kolba-s-zelem-1084491803/' },
  { name: 'Футбольный мяч размер 5 — RGX-FB-1725', price: 635, qty: 1, category: 'Sport', img: 'https://ir.ozone.ru/s3/multimedia-1-b/wc1000/7884229943.jpg', url: 'https://www.ozon.ru/product/futbolnyy-myach-razmer-5-rgx-fb-1725-1259981568/' },
  { name: 'Опыты для детей Звёздная пыль / Химические эксперименты', price: 218, qty: 2, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/s3/multimedia-1-2/wc1000/7300776998.jpg', url: 'https://www.ozon.ru/product/opyty-dlya-detey-zvezdnaya-pyl-himicheskie-eksperimenty-dlya-malchikov-i-devochek-v-nabore-1305503337/' },
  { name: 'Малярная лента Альянс малярный скотч, 48мм×50м, 6 шт.', price: 874, qty: 1, category: 'DIY', img: 'https://ir.ozone.ru/s3/multimedia-1-f/wc1000/10465296315.jpg', url: 'https://www.ozon.ru/product/malyarnaya-lenta-alyans-malyarnyy-skotch-48mm-50m-1-sht-1015045795/' },
  { name: 'Бахилы одноразовые, 20 мкм, упаковка 50 пар, фиолетовые', price: 180, qty: 2, category: 'Pharmacy', img: 'https://ir.ozone.ru/s3/multimedia-1-9/wc1000/8667033417.jpg', url: 'https://www.ozon.ru/product/bahily-odnorazovye-20-mkm-plotnost-upakovka-50-par-fioletovye-1577349452/' },
  { name: 'Волшебный котик из кристаллов, набор для выращивания кристаллов', price: 141, qty: 2, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/s3/multimedia-1-i/wc1000/10109043846.jpg', url: 'https://www.ozon.ru/product/volshebnyy-kotik-iz-kristallov-opyty-dlya-detey-nabor-dlya-vyrashchivaniya-kristallov-2042460843/' },
  { name: 'Маркеры спиртовые для скетчинга 24 шт Mazari FANTASIA', price: 212, qty: 1, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/s3/multimedia-1-u/wc1000/7511948418.jpg', url: 'https://www.ozon.ru/product/markery-spirtovye-dlya-sketchinga-24-sht-mazari-fantasia-permanentnye-raznotsvetnye-2088562833/' },
  { name: 'Волшебное дерево растущее из кристаллов, набор для выращивания кристаллов', price: 227, qty: 2, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/s3/multimedia-1-k/wc1000/8080431968.jpg', url: 'https://www.ozon.ru/product/volshebnoe-derevo-rastushchee-iz-kristallov-opyty-dlya-detey-nabor-dlya-vyrashchivaniya-kristallov-2195934937/' },
  { name: 'Набор опытов, 15 в 1, опыты и эксперименты для детей', price: 887, qty: 2, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/s3/multimedia-1-r/wc1000/9086733603.jpg', url: 'https://www.ozon.ru/product/nabor-opytov-15-v-1-opyty-i-eksperimenty-dlya-detey-2322967333/' },
  { name: 'Брелок Майнкрафт, брелки 2 шт Minecraft светящиеся', price: 242, qty: 10, category: 'Галантерея', img: 'https://ir.ozone.ru/s3/multimedia-1-2/wc1000/7664838158.jpg', url: 'https://www.ozon.ru/product/brelok-maynkraft-brelki-2sht-minecraft-svetyashchiesya-2386413371/' },
  { name: 'Шапочка для плавания Joss', price: 214, qty: 5, category: 'Sport', img: 'https://ir.ozone.ru/s3/multimedia-1-i/wc1000/8100443790.jpg', url: 'https://www.ozon.ru/product/shapochka-dlya-plavaniya-joss-2496975214/' },
  { name: 'Освежитель воздуха Бреф Делюкс, набор 3 шт по 280 мл', price: 399, qty: 1, category: 'Fabric&Home', img: 'https://ir.ozone.ru/s3/multimedia-1-t/wc1000/8799671045.jpg', url: 'https://www.ozon.ru/product/osvezhitel-vozduha-sprey-dlya-tualeta-i-doma-bref-delyuks-nezhnaya-magnoliya-volshebnaya-orhideya-2530487968/' },
  { name: 'Опыты и эксперименты для детей Дыхание дракона', price: 164, qty: 2, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/s3/multimedia-1-o/wc1000/9495526704.jpg', url: 'https://www.ozon.ru/product/opyty-i-eksperimenty-dlya-detey-dyhanie-drakona-2759708625/' },
  { name: 'Опыты и эксперименты для детей Лаборатория червячков', price: 164, qty: 2, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/s3/multimedia-1-v/wc1000/9410827891.jpg', url: 'https://www.ozon.ru/product/opyty-i-eksperimenty-dlya-detey-laboratoriya-chervyachkov-2760297844/' },
  { name: 'Настольные игры для всей семьи с деньгами и фишками (Монополия-аналог)', price: 1356, qty: 1, category: 'Toys', img: 'https://ir.ozone.ru/s3/multimedia-1-z/wc1000/8087830775.jpg', url: 'https://www.ozon.ru/product/nastolnye-igry-dlya-vsey-semi-s-dengami-i-fishkami-strategicheskaya-semeynaya-igra-2924450626/' },
  { name: 'Брелок фонарик Minecraft светящийся факел, USB зарядка', price: 160, qty: 20, category: 'Toys', img: 'https://ir.ozone.ru/s3/multimedia-1-8/wc1000/9160701848.jpg', url: 'https://www.ozon.ru/product/brelok-fonarik-minecraft-svetyashchiysya-fakel-usb-zaryadka-podarok-rebenku-3378284656/' },
  { name: 'Мелки для рисования на асфальте', price: 219, qty: 2, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/s3/multimedia-1-h/wc1000/10779494345.jpg', url: 'https://www.ozon.ru/product/melki-dlya-risovaniya-na-asfalte-3500663136/' },
  { name: 'Акварель, краски акварельные для рисования детские 12 цветов с кисточкой', price: 134, qty: 2, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/s3/multimedia-1-m/wc1000/9825576286.jpg', url: 'https://www.ozon.ru/product/akvarel-kraski-akvarelnye-dlya-risovaniya-detskie-12-tsvetov-s-kistochkoy-317118066/' },
  { name: 'Стаканы одноразовые 500 шт, 200 мл, пластиковые прозрачные', price: 788, qty: 1, category: 'Fabric&Home', img: 'https://ir.ozone.ru/s3/multimedia-1-8/wc1000/7445461832.jpg', url: 'https://www.ozon.ru/product/stakany-odnorazovye-500-sht-200-ml-stakanchiki-plastikovye-prozrachnye-1699592325/' },
];

const RAW_0011: RawItem[] = [
  { name: 'Детский ночник Майнкрафт / Светильник minecraft, колба', price: 888, qty: 1, category: 'Декор', img: 'https://ir.ozone.ru/s3/multimedia-1-z/wc1000/7646341031.jpg', url: 'https://www.ozon.ru/product/ocean-of-light-nochnik-detskiy-dlya-sna-maynkraft-svetilnik-minecraft-dlya-detey-kolba-s-zelem-1084491803/' },
  { name: 'Детский ночник-факел Minecraft, светильник майнкрафт', price: 492, qty: 1, category: 'DIY', img: 'https://ir.ozone.ru/s3/multimedia-1-c/wc1000/7466462868.jpg', url: 'https://www.ozon.ru/product/detskiy-nochnik-fakel-minecraft-svetilnik-maynkraft-1829769531/' },
  { name: 'Набор опытов 6 в 1 / Химические опыты для детей / Набор юного химика', price: 1033, qty: 2, category: 'Hobbies&Creativity', img: 'https://ir.ozone.ru/s3/multimedia-1-o/wc1000/9247131600.jpg', url: 'https://www.ozon.ru/product/nabor-opytov-6v1-himicheskie-opyty-dlya-detey-nabor-yunogo-himika-154702328/' },
  { name: 'Кабель HDMI DVI-D 3 м, чёрный', price: 158, qty: 1, category: 'Электроника', img: 'https://ir.ozone.ru/s3/multimedia-1-w/wc1000/10096676996.jpg', url: 'https://www.ozon.ru/product/kabel-hdmi-dvi-d-3-m-chernyy-2711677127/' },
  { name: 'DVI HDMI, переходник DVI-D HDMI, адаптер', price: 228, qty: 1, category: 'Электроника', img: 'https://ir.ozone.ru/s3/multimedia-1-e/wc1000/8459616326.jpg', url: 'https://www.ozon.ru/product/dvi-hdmi-perehodnik-dvi-d-hdmi-adapter-3133092862/' },
];

export const PRIZES: PrizeItem[] = [
  ...RAW_0010.map((r, i) => ({ ...r, id: sl(i + 1, r.name), order: '75413488-0010' })),
  ...RAW_0011.map((r, i) => ({ ...r, id: sl(100 + i + 1, r.name), order: '75413488-0011' })),
];

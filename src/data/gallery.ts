export const filters = [
  { value: 'camp', label: 'Атмосфера' },
  { value: 'pool', label: 'Бассейн' },
  { value: 'sport', label: 'Спорт' },
  { value: 'study', label: 'Учёба' },
  { value: 'food', label: 'Питание' },
  { value: 'territory', label: 'Территория' },
];

export const images: Record<string, { src: string; alt: string }[]> = {
  camp: [
    { src: '/images/gallery/camp-group-beanbags.avif', alt: 'Атмосфера летнего IT-лагеря АйДаКемп в Подмосковье' },
    { src: '/images/gallery/camp-smile.avif', alt: 'Дети улыбаются в IT-лагере АйДаКемп' },
    { src: '/images/gallery/camp-two-beanbags.avif', alt: 'Отдых и общение в IT-лагере АйДаКемп' },
    { src: '/images/gallery/gallery-04.avif', alt: 'Территория и природа лагеря АйДаКемп' },
    { src: '/images/gallery/gallery-05.avif', alt: 'Летняя атмосфера в IT-лагере АйДаКемп' },
  ],
  pool: [
    { src: '/images/gallery/IMG_7209.avif', alt: 'Купание в бассейне лагеря АйДаКемп' },
    { src: '/images/gallery/IMG_7212.avif', alt: 'Дети в бассейне лагеря АйДаКемп' },
    { src: '/images/gallery/pool-kids-edge.avif', alt: 'Бассейн в детском лагере АйДаКемп' },
    { src: '/images/gallery/pool-interior.avif', alt: 'Крытый бассейн в детском лагере АйДаКемп' },
  ],
  sport: [
    { src: '/images/gallery/gallery-10.avif', alt: 'Активный отдых в лагере АйДаКемп' },
    { src: '/images/gallery/gallery-11.avif', alt: 'Спортивные игры в лагере АйДаКемп' },
    { src: '/images/gallery/gallery-12.avif', alt: 'Подвижные активности в лагере АйДаКемп' },
    { src: '/images/gallery/gallery-06.avif', alt: 'Игры на открытом воздухе в лагере АйДаКемп' },
  ],
  study: [
    { src: '/images/gallery/study-dome-row.avif', alt: 'Занятия программированием в IT-лагере АйДаКемп' },
    { src: '/images/gallery/hackathon-present.avif', alt: 'Хакатон в детском IT-лагере АйДаКемп' },
    { src: '/images/gallery/study-dome-group.avif', alt: 'Групповые занятия в IT-лагере АйДаКемп' },
    { src: '/images/gallery/study-stage-girl.avif', alt: 'Презентация проекта в IT-лагере АйДаКемп' },
    { src: '/images/gallery/gallery-01.avif', alt: 'Обучение и творчество в лагере АйДаКемп' },
  ],
  food: [
    { src: '/images/gallery/food-kids-peace.avif', alt: 'Питание в детском лагере АйДаКемп' },
    { src: '/images/gallery/IMG_7219.avif', alt: 'Обед в столовой лагеря АйДаКемп' },
    { src: '/images/gallery/food-buffet.avif', alt: 'Шведский стол в детском лагере АйДаКемп' },
    { src: '/images/gallery/food-tray.avif', alt: '5-разовое питание в лагере АйДаКемп' },
  ],
  territory: [
    { src: '/images/gallery/territory-main.avif', alt: 'Территория лагеря АйДаКемп в Подмосковье' },
    { src: '/images/gallery/territory-building.avif', alt: 'Корпус лагеря АйДаКемп в Подмосковье' },
    { src: '/images/gallery/territory-admin.avif', alt: 'Административный корпус лагеря АйДаКемп' },
    { src: '/images/gallery/territory-korpus.avif', alt: 'Жилой корпус лагеря АйДаКемп' },
    { src: '/images/gallery/territory-alley.avif', alt: 'Аллея лагеря АйДаКемп' },
  ],
};

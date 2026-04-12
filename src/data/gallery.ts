export const filters = [
  { value: 'camp', label: 'Атмосфера' },
  { value: 'pool', label: 'Бассейн' },
  { value: 'sport', label: 'Спорт' },
  { value: 'study', label: 'Учёба' },
  { value: 'food', label: 'Питание' },
];

export const images: Record<string, { src: string; alt: string }[]> = {
  camp: [
    { src: '/images/gallery/camp-group-beanbags.avif', alt: 'Атмосфера летнего IT-лагеря АйДаКемп в Подмосковье' },
    { src: '/images/gallery/camp-smile.avif', alt: 'Дети улыбаются в IT-лагере АйДаКемп' },
    { src: '/images/gallery/camp-two-beanbags.avif', alt: 'Отдых и общение в IT-лагере АйДаКемп' },
    { src: '/images/gallery/study-dome-row.avif', alt: 'Занятия в куполе IT-лагеря АйДаКемп' },
  ],
  pool: [
    { src: '/images/gallery/pool-kids-edge.avif', alt: 'Бассейн в детском лагере АйДаКемп' },
    { src: '/images/gallery/IMG_7219.avif', alt: 'Дети у бассейна в лагере АйДаКемп' },
    { src: '/images/gallery/pool-interior.avif', alt: 'Крытый бассейн в детском лагере АйДаКемп' },
    { src: '/images/gallery/IMG_7209.avif', alt: 'Купание в бассейне лагеря АйДаКемп' },
  ],
  sport: [
    { src: '/images/gallery/gallery-12.avif', alt: 'Спортивные занятия в лагере АйДаКемп' },
    { src: '/images/gallery/gallery-11.avif', alt: 'Активные игры на природе в лагере АйДаКемп' },
    { src: '/images/gallery/gallery-03.avif', alt: 'Спорт и активности в IT-лагере АйДаКемп' },
    { src: '/images/gallery/camp-group-beanbags.avif', alt: 'Командные активности в лагере АйДаКемп' },
  ],
  study: [
    { src: '/images/gallery/study-dome-row.avif', alt: 'Занятия программированием в IT-лагере АйДаКемп' },
    { src: '/images/gallery/hackathon-present.avif', alt: 'Хакатон в детском IT-лагере АйДаКемп' },
    { src: '/images/gallery/study-dome-group.avif', alt: 'Групповые занятия в IT-лагере АйДаКемп' },
    { src: '/images/gallery/study-stage-girl.avif', alt: 'Презентация проекта в IT-лагере АйДаКемп' },
  ],
  food: [
    { src: '/images/gallery/food-kids-peace.avif', alt: 'Питание в детском лагере АйДаКемп' },
    { src: '/images/gallery/IMG_7219.avif', alt: 'Обед в столовой лагеря АйДаКемп' },
    { src: '/images/gallery/food-buffet.avif', alt: 'Шведский стол в детском лагере АйДаКемп' },
    { src: '/images/gallery/gallery-08.avif', alt: '5-разовое питание в лагере АйДаКемп' },
  ],
};

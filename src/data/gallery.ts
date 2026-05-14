export const filters = [
  { value: 'camp',      label: 'Атмосфера' },
  { value: 'pool',      label: 'Бассейн' },
  { value: 'sport',     label: 'Спорт' },
  { value: 'study',     label: 'Учёба' },
  { value: 'food',      label: 'Питание' },
  { value: 'territory', label: 'Территория' },
];

// Статические фото убраны — галерея полностью загружается из /api/gallery-photos
// (photos uploaded via admin gallery are stored in gallery-additions.json on server)
export const images: Record<string, { src: string; alt: string }[]> = {
  camp: [], pool: [], sport: [], study: [], food: [], territory: [],
};

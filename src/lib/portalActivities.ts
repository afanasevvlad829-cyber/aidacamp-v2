export interface ActivityFile {
  name: string;       // отображаемое имя
  href: string;       // относительный URL
  icon?: string;      // bi-* иконка
  desc?: string;      // краткое описание
}

export interface Activity {
  slug: string;
  title: string;
  desc: string;
  author?: string;             // по умолчанию «Александр Ташкин»
  hasImagesZip?: boolean;      // есть ли архив картинок (старый формат)
  hasPreview?: boolean;        // есть ли preview.png/preview-thumb.webp
  files?: ActivityFile[];      // дополнительные файлы (PDF/PPTX/ZIP/HTML/ссылки)
  links?: ActivityFile[];      // внешние ссылки
}

export const ACTIVITIES: Activity[] = [
  // ── Александр Ташкин (5 ИИ-активностей) ──
  { slug: 'ohotnik-na-monstrov', title: 'Охотник на монстров', desc: 'ИИ-активность', author: 'Александр Ташкин', hasImagesZip: true, hasPreview: true },
  { slug: 'ai-secret-agent',     title: 'AI Secret Agent',     desc: 'ИИ-активность', author: 'Александр Ташкин', hasImagesZip: true, hasPreview: true },
  { slug: 'ai-art-battle',       title: 'AI Art Battle',       desc: 'Батл по генерации изображений', author: 'Александр Ташкин', hasImagesZip: true, hasPreview: true },
  { slug: 'pobeg-iz-laboratorii', title: 'Побег из лаборатории', desc: 'Финальный хакатон', author: 'Александр Ташкин', hasImagesZip: true, hasPreview: true },
  { slug: 'ii-vidit-predmety',   title: 'ИИ видит предметы',   desc: 'Распознавание объектов', author: 'Александр Ташкин', hasImagesZip: true, hasPreview: true },

  // ── Алексей Старченков ──
  {
    slug: 'starchenkov-ai-phone',
    title: 'ИИ на телефоне',
    desc: 'Презентация для введения в ИИ и подборка кейсов использования с телефона',
    author: 'Алексей Старченков',
    files: [
      { name: 'Презентация (.pptx)', href: '/metodichki/starchenkov-ai-phone/preza.pptx', icon: 'file-earmark-slides', desc: 'Слайды для занятия' },
      { name: 'ИИ телефон (.pdf)',   href: '/metodichki/starchenkov-ai-phone/ii-telefon.pdf', icon: 'file-earmark-pdf', desc: 'Раздаточный материал' },
    ],
  },

  // ── Омар ──
  {
    slug: 'omar-programming-camp',
    title: 'Programming Camp',
    desc: 'Программа Programming Camp от Омара — материалы и инструменты для занятий',
    author: 'Омар',
    files: [
      { name: 'Programming Camp (.zip)', href: '/metodichki/omar-programming-camp/programming-camp.zip', icon: 'file-earmark-zip', desc: 'Архив с материалами и тестом' },
      { name: 'Инструменты и софт (HTML)', href: '/metodichki/omar-programming-camp/tools-and-software.html', icon: 'file-earmark-code', desc: 'Каталог программ доступных из РФ без VPN' },
    ],
  },
];

export function getActivity(slug: string): Activity | null {
  return ACTIVITIES.find((a) => a.slug === slug) ?? null;
}

/** Группировка активностей по автору — для отображения по преподавателям. */
export function activitiesByAuthor(): { author: string; items: Activity[] }[] {
  const map = new Map<string, Activity[]>();
  for (const a of ACTIVITIES) {
    const k = a.author ?? 'Александр Ташкин';
    const arr = map.get(k) ?? [];
    arr.push(a);
    map.set(k, arr);
  }
  return Array.from(map.entries()).map(([author, items]) => ({ author, items }));
}

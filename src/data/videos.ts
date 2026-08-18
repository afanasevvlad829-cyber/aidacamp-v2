export interface VideoItem {
  /** Адрес страницы видео: /video/<slug>/ — им делятся в переписке. Менять нельзя: ломает разосланные ссылки. */
  slug: string;
  /** Embed на Kinescope (https://…) либо локальный файл (/video/*.mp4) — от этого зависит плеер на странице. */
  url: string;
  title: string;
  thumb: string;
  alt: string;
  /** Обязательно: без него страница /video/<slug>/ получала DESCRIPTION == H1
   * (был молчаливый фолбэк `?? video.title` в [slug].astro). Labrika 24.07.2026. */
  description: string;
  uploadDate?: string;
}

export const projectVideos: VideoItem[] = [
  { slug: 'moya-ferma', url: 'https://kinescope.io/embed/g2S7xxtEUP4S2E3WXYFNqZ', title: 'Моя ферма', thumb: '/images/videos/project-farm.avif', alt: 'Игра «Моя ферма» — проект ученика АйДаКемп', description: 'Детский проект из IT-лагеря АйДаКемп: игра «Моя ферма», созданная ребёнком за одну смену.', uploadDate: '2025-07-01' },
  { slug: 'programmirovanie-dronov', url: 'https://kinescope.io/embed/2ULnxEqqC4ssLNYCh5YPvo', title: 'Программирование дронов', thumb: '/images/videos/project-drones.avif', alt: 'Программирование дронов — проект ученика АйДаКемп', description: 'Ученик IT-лагеря АйДаКемп программирует дрон и демонстрирует свой проект.', uploadDate: '2025-07-01' },
  { slug: 'igra-na-unity', url: 'https://kinescope.io/embed/iFCF2uprpHLxx9VgJ1M7SP', title: 'Игра на Unity', thumb: '/images/videos/project-unity.avif', alt: 'Игра на Unity — проект ученика АйДаКемп', description: 'Проект ребёнка из IT-лагеря АйДаКемп — самостоятельно созданная игра на движке Unity.', uploadDate: '2025-07-01' },
  { slug: 'igra-issledovatel', url: 'https://kinescope.io/embed/0Vs3qPMJr7Kvz13MWsxcbc', title: 'Игра-исследователь', thumb: '/images/videos/project-explorer.avif', alt: 'Игра «Исследователь» — проект ученика АйДаКемп', description: 'Игра «Исследователь» — авторский проект ученика IT-лагеря АйДаКемп, защита на хакатоне.', uploadDate: '2025-07-01' },
  { slug: 'luidzhi', url: 'https://kinescope.io/embed/w1eZLPX8mqdC7dMniPaBWT', title: 'Луиджи', thumb: '/images/videos/project-luigi.avif', alt: 'Игра «Луиджи» — проект ученика АйДаКемп', description: 'Авторская игра «Луиджи», созданная ребёнком в IT-лагере АйДаКемп за одну смену.', uploadDate: '2025-07-01' },
];

export const campVideos: VideoItem[] = [
  { slug: 'it-lager-ne-sidet-za-kompyuterom', url: 'https://kinescope.io/embed/qmLxu2S7uaS44CKkhoV1Jj', title: 'IT-лагерь — это не "сидеть за компьютером". Вот что происходит на самом деле', thumb: '/images/videos/video-01.avif', alt: 'IT-лагерь АйДаКемп — не просто сидеть за компьютером', description: 'Как выглядит IT-лагерь АйДаКемп изнутри: активности, занятия, хакатон и жизнь детей вне экрана.', uploadDate: '2025-06-01' },
  { slug: 'za-nedelyu-menyaetsya-bolshe-chem-za-god', url: 'https://kinescope.io/embed/tJAaAnvCYYJ5vRz7uyUepj', title: 'За неделю в лагере он меняется больше, чем за год дома', thumb: '/images/videos/video-02.avif', alt: 'За неделю в лагере ребёнок меняется больше, чем за год дома', description: 'Отзыв мамы об IT-лагере АйДаКемп: как ребёнок вырос за одну смену — стал увереннее, нашёл друзей.', uploadDate: '2025-06-01' },
  { slug: 'ne-hochu-v-lager-hochu-eshche', url: 'https://kinescope.io/embed/naDfzrei9duApz3AnaencH', title: 'Не хочу в лагерь… Через 3 дня: хочу ещё', thumb: '/images/videos/video-03.avif', alt: 'Не хочу в лагерь — через 3 дня: хочу ещё', description: 'Реальная история: ребёнок не хотел ехать в IT-лагерь, а через три дня просил остаться ещё.', uploadDate: '2025-06-01' },
  { slug: 'sam-otkazhetsya-ot-telefona', url: 'https://kinescope.io/embed/eTmCgZHcwhcWQQs3HLCz1S', title: 'Ребёнок сам откажется от телефона за 3 дня', thumb: '/images/videos/video-04.avif', alt: 'Ребёнок сам откажется от телефона за 3 дня в АйДаКемп', description: 'Почему в IT-лагере АйДаКемп дети сами перестают сидеть в телефоне — без запретов и ограничений.', uploadDate: '2025-06-01' },
  { slug: 'zachem-kopit-dengi-v-lagere', url: 'https://kinescope.io/embed/s1SCYKqLx6C94fMRumitHF', title: 'Зачем детям копить деньги в лагере', thumb: '/images/videos/video-05.avif', alt: 'Зачем детям копить деньги в лагере АйДаКемп', description: 'Внутренняя экономика АйДаКемп: как дети зарабатывают, копят и тратят деньги — учатся финансовой ответственности в игре.', uploadDate: '2025-06-01' },
];

/** Видео, у которых есть своя страница, но нет карточки в списке на /video/ —
 *  они живут внутри других блоков (MomStory на главной, сезонные лендинги). */
export const storyVideos: VideoItem[] = [
  { slug: 'daria-story', url: '/video/daria-story.mp4', title: 'Мы живём в самом прекрасном IT-лагере на свете. А все остальные лагеря нам завидуют', thumb: '/images/videos/daria-story.avif', alt: 'Видео об IT-лагере АйДаКемп глазами Дарьи Афанасьевой', description: 'Дарья Афанасьева рассказывает, как устроен АйДаКемп изнутри и почему ребята просятся сюда на следующее лето.', uploadDate: '2025-06-01' },
];

/** Все видео с собственной страницей /video/<slug>/ — источник для getStaticPaths. */
export const allVideos: VideoItem[] = [...projectVideos, ...campVideos, ...storyVideos];

export function getVideoBySlug(slug: string): VideoItem | undefined {
  return allVideos.find((v) => v.slug === slug);
}

/** Поиск по адресу файла/embed — чтобы блок, знающий только src, нашёл страницу видео. */
export function getVideoByUrl(url: string): VideoItem | undefined {
  return allVideos.find((v) => v.url === url);
}

/** OG-картинка страницы видео: 1200×630 JPG. AVIF-превью мессенджеры не показывают. */
export function videoOgImage(v: VideoItem): string {
  return `/images/videos/og/${v.slug}.jpg`;
}

/** true — Kinescope (iframe), false — локальный mp4 (<video>). */
export function isEmbed(v: VideoItem): boolean {
  return v.url.startsWith('http');
}

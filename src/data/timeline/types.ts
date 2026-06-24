export interface TimelinePhoto {
  src?: string;   // путь /images/smena1/day01/... — если нет, показывается placeholder
  alt: string;    // описание для alt + текст placeholder
}

export interface TimelineReaction {
  emoji: string;
  count: number;
}

export interface TimelineComment {
  name: string;
  text: string;
}

export interface TimelineProject {
  name: string;
  desc: string;
  team: string;
}

export interface TimelineVideo {
  src: string;      // /videos/smena1/day01-evening.mp4 — если не существует, показывается placeholder
  poster?: string;  // /videos/posters/smena1/day01.jpg
  dur?: string;     // "1:48"
  label?: string;   // "вечерний сбор отряда"
  isPlaceholder?: boolean;  // true = показывать заглушку вместо плеера
}

export interface TimelinePost {
  time: string;        // "11:40"
  kind: string;        // "Заезд" | "Занятие" | "Хакатон" | "Вечер" | "Финал" | ...
  title: string;
  text?: string;
  photos?: TimelinePhoto[];
  video?: TimelineVideo;
  quote?: { text: string; author: string };
  projects?: TimelineProject[];
  reactions?: TimelineReaction[];
  comments?: TimelineComment[];
  moreCommentsText?: string;
}

export interface TimelineDay {
  id: string;        // "01", "02" ...
  date: string;      // "30 мая"
  weekday: string;   // "Пятница"
  title: string;     // "Заезд"
  summary: string;   // краткое описание для сабтайтла
  isSpecial?: boolean;  // хакатон, финал — выделить визуально
  posts: TimelinePost[];
}

export interface SmenaTimeline {
  slug: string;             // "smena-1"
  shiftName: string;        // "Смена 1"
  dateRange: string;        // "30 мая — 8 июня"
  daysCount: number;
  kidsCount: number;
  photosCount: number;
  videosCount: number;
  projectsCount: number;
  coverImage?: string;      // /images/smena1/cover.avif
  canonicalUrl: string;     // для noindex страниц — приватных
  days: TimelineDay[];
}

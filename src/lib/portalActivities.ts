export interface Activity {
  slug: string;
  title: string;
  desc: string;
}

// Активности Александра Ташкина (источник: архив АЙДАКЕМП3).
export const ACTIVITIES: Activity[] = [
  { slug: 'ohotnik-na-monstrov', title: 'Охотник на монстров', desc: 'ИИ-активность' },
  { slug: 'ai-secret-agent', title: 'AI Secret Agent', desc: 'ИИ-активность' },
  { slug: 'ai-art-battle', title: 'AI Art Battle', desc: 'Батл по генерации изображений' },
  { slug: 'pobeg-iz-laboratorii', title: 'Побег из лаборатории', desc: 'Финальный хакатон' },
  { slug: 'ii-vidit-predmety', title: 'ИИ видит предметы', desc: 'Распознавание объектов' },
];

export function getActivity(slug: string): Activity | null {
  return ACTIVITIES.find((a) => a.slug === slug) ?? null;
}

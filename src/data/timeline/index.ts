import type { SmenaTimeline } from './types';
import { smena1 } from './smena1';

const timelines: Record<string, SmenaTimeline> = {
  'smena-1': smena1,
  // 'smena-2': smena2,  — добавить когда будет контент
};

export function getTimelineData(slug: string): SmenaTimeline | undefined {
  return timelines[slug];
}

export function getAllTimelineSlugs(): string[] {
  return Object.keys(timelines);
}

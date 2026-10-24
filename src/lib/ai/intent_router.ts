/**
 * Intent router stub — fallback when full classifier wasn't merged.
 * Returns 'general' so /api/ask uses default RAG flow.
 * TODO: replace with real classifier from agent/redteam-v2 follow-up.
 */

export type Intent = 'story' | 'fact_lookup' | 'experience' | 'general';

export async function classifyIntent(_message: string): Promise<Intent> {
  return 'general';
}

export async function pickRealStory(): Promise<{ text: string; source: string } | null> {
  return null;
}

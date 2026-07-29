import type { APIRoute } from 'astro';
import { HERO_VARIANTS } from '../../data/heroVariants';

export const prerender = false;

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify(HERO_VARIANTS), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
    },
  });
};

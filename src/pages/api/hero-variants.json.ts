import type { APIRoute } from 'astro';
import heroVariants from '../../data/hero-variants.json';

export const prerender = false;

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify(heroVariants), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
    },
  });
};

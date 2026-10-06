import type { APIRoute } from 'astro';
import { searchCorporateBenefits } from '../../services/corporate-benefits';
export const prerender = false;
export const GET: APIRoute = ({ url }) => {
  const result = searchCorporateBenefits(url.searchParams.get('q') ?? '');
  return new Response(JSON.stringify(result), {
    status: result.status === 'invalid' ? 400 : 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
};

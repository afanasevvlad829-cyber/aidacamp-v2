// Лёгкий клиент Альфа-CRM для SSR-страниц.
// Кеш токена в памяти процесса до 50 минут.

const BRANCH = 5;

let _tokenCache: { token: string; exp: number } | null = null;

async function authToken(): Promise<string | null> {
  const now = Date.now();
  if (_tokenCache && _tokenCache.exp > now) return _tokenCache.token;

  const host = process.env.ALFACRM_HOSTNAME;
  const email = process.env.ALFACRM_EMAIL;
  const apiKey = process.env.ALFACRM_API_KEY;
  if (!host || !email || !apiKey) return null;

  try {
    const r = await fetch(`https://${host}/v2api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, api_key: apiKey }),
    });
    const j: any = await r.json();
    if (!j?.token) return null;
    _tokenCache = { token: j.token, exp: now + 50 * 60 * 1000 };
    return j.token;
  } catch {
    return null;
  }
}

export async function getCustomerGroupIds(customerId: number): Promise<number[]> {
  const host = process.env.ALFACRM_HOSTNAME;
  const token = await authToken();
  if (!host || !token) return [];

  try {
    const r = await fetch(`https://${host}/v2api/${BRANCH}/customer/index`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-ALFACRM-TOKEN': token },
      body: JSON.stringify({ id: customerId, page: 0 }),
    });
    const j: any = await r.json();
    const item = j?.items?.[0];
    if (!item) return [];

    // У клиента в API могут быть массивы groups/customer_groups/group_ids
    // Альфа отдаёт связь через отдельный endpoint customer-group, но иногда есть в самой записи.
    const directIds: number[] = [];
    for (const key of ['group_ids', 'groups']) {
      const v = item[key];
      if (Array.isArray(v)) {
        for (const g of v) {
          if (typeof g === 'number') directIds.push(g);
          else if (g && typeof g === 'object' && typeof g.id === 'number') directIds.push(g.id);
          else if (g && typeof g === 'object' && typeof g.group_id === 'number') directIds.push(g.group_id);
        }
      }
    }
    if (directIds.length) return [...new Set(directIds)];

    // Fallback — через customer-group
    try {
      const r2 = await fetch(`https://${host}/v2api/${BRANCH}/customer-group/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-ALFACRM-TOKEN': token },
        body: JSON.stringify({ customer_id: customerId, page: 0 }),
      });
      const j2: any = await r2.json();
      const ids: number[] = [];
      for (const it of (j2?.items || [])) {
        if (typeof it?.group_id === 'number') ids.push(it.group_id);
      }
      return [...new Set(ids)];
    } catch {
      return [];
    }
  } catch {
    return [];
  }
}

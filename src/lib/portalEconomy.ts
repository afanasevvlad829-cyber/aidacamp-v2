/**
 * Data-layer для экономики смены: серверные override-ы состояния призов
 * и каталог активностей-«подарков» (телефон на ночь, отменить зарядку и т.д.).
 */

export interface PrizeState {
  prize_id: string;
  hidden: boolean;
  bongere_price: number | null;
  custom_photo: string | null;
  remaining_qty: number | null;
  updated_at: string;
  updated_by: string | null;
}

export interface ActivityOffer {
  id: number;
  name: string;
  description: string | null;
  category: string | null;     // phone | fun | food | prize | privilege | service | other
  base_price: number | null;   // ₽ — фикс. цена в игровых рублях (если не используется формула)
  participants_hint: number | null;  // сколько человек скидывается; NULL = вся смена (N)
  target_days: number | null;        // сколько дней группа копит на лот (для формулы)
  target_share_pct: number | null;   // какая доля дневного дохода идёт на лот (для формулы, 30-50%)
  repeat_multiplier: number | null;  // множитель повторной покупки (default 1.5 для премиум-лотов)
  custom_price: number | null;       // ручная цена админа — приоритет над формулой/base_price
  sort: number;
  archived: boolean;
}

function dsn(): string { return process.env.AIDAPLUS_PG_DSN || process.env.PG_DSN || ''; }
async function withClient<T>(fn: (c: import('pg').Client) => Promise<T>): Promise<T | null> {
  const conn = dsn(); if (!conn) return null;
  const { default: pg } = await import('pg');
  const client = new pg.Client({ connectionString: conn });
  await client.connect();
  try { return await fn(client); } finally { await client.end(); }
}

// ── Prize state ────────────────────────────────────────────────────────────

export async function listPrizeStates(): Promise<PrizeState[]> {
  const r = await withClient(async (c) => {
    const q = await c.query(
      `SELECT prize_id, hidden, bongere_price, custom_photo, remaining_qty,
              to_char(updated_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') AS updated_at, updated_by
         FROM portal_prize_state`
    );
    return q.rows.map((r: any) => ({
      ...r,
      bongere_price: r.bongere_price == null ? null : Number(r.bongere_price),
      remaining_qty: r.remaining_qty == null ? null : Number(r.remaining_qty),
    })) as PrizeState[];
  });
  return r ?? [];
}

/** Уменьшает оставшееся количество приза на 1 (для hardcoded — в portal_prize_state.remaining_qty). */
export async function decrementPrizeRemaining(prizeId: string, initialQty: number): Promise<number> {
  const r = await withClient(async (c) => {
    // Если строки ещё нет, создаём с remaining_qty = initialQty - 1
    // Если есть и remaining_qty NULL, ставим initialQty - 1
    // Если есть число, уменьшаем на 1 (не ниже 0)
    const q = await c.query(
      `INSERT INTO portal_prize_state (prize_id, hidden, remaining_qty, updated_at)
       VALUES ($1, FALSE, GREATEST($2::int - 1, 0), NOW())
       ON CONFLICT (prize_id) DO UPDATE SET
         remaining_qty = GREATEST(COALESCE(portal_prize_state.remaining_qty, $2::int) - 1, 0),
         updated_at = NOW()
       RETURNING remaining_qty`,
      [prizeId, initialQty]
    );
    return Number(q.rows[0]?.remaining_qty ?? 0);
  });
  return r ?? 0;
}

export async function upsertPrizeState(
  prizeId: string,
  patch: { hidden?: boolean; bongere_price?: number | null; custom_photo?: string | null },
  updatedBy: string | null
): Promise<void> {
  await withClient(async (c) => {
    await c.query(
      `INSERT INTO portal_prize_state (prize_id, hidden, bongere_price, custom_photo, updated_at, updated_by)
       VALUES ($1, COALESCE($2, FALSE), $3, $4, NOW(), $5)
       ON CONFLICT (prize_id) DO UPDATE SET
         hidden        = COALESCE(EXCLUDED.hidden, portal_prize_state.hidden),
         bongere_price = COALESCE(EXCLUDED.bongere_price, portal_prize_state.bongere_price),
         custom_photo  = COALESCE(EXCLUDED.custom_photo, portal_prize_state.custom_photo),
         updated_at    = NOW(),
         updated_by    = COALESCE(EXCLUDED.updated_by, portal_prize_state.updated_by)`,
      [
        prizeId,
        patch.hidden ?? null,
        patch.bongere_price ?? null,
        patch.custom_photo ?? null,
        updatedBy,
      ]
    );
  });
}

/** Полностью переписать состояние одной строки (для «import from localStorage»). */
export async function replacePrizeState(
  prizeId: string,
  hidden: boolean,
  bongerePrice: number | null,
  customPhoto: string | null,
  updatedBy: string | null
): Promise<void> {
  await withClient(async (c) => {
    await c.query(
      `INSERT INTO portal_prize_state (prize_id, hidden, bongere_price, custom_photo, updated_at, updated_by)
       VALUES ($1, $2, $3, $4, NOW(), $5)
       ON CONFLICT (prize_id) DO UPDATE SET
         hidden = EXCLUDED.hidden,
         bongere_price = EXCLUDED.bongere_price,
         custom_photo = EXCLUDED.custom_photo,
         updated_at = NOW(),
         updated_by = EXCLUDED.updated_by`,
      [prizeId, hidden, bongerePrice, customPhoto, updatedBy]
    );
  });
}

// ── Activity offers ────────────────────────────────────────────────────────

export async function listActivities(includeArchived = false): Promise<ActivityOffer[]> {
  const r = await withClient(async (c) => {
    const q = await c.query(
      `SELECT id, name, description, category, base_price, participants_hint,
              target_days, target_share_pct, repeat_multiplier::float8 AS repeat_multiplier,
              custom_price, sort, archived
         FROM portal_activity_offer
         WHERE archived = FALSE OR $1::boolean = TRUE
         ORDER BY sort, id`,
      [includeArchived]
    );
    return q.rows.map((r: any) => ({
      ...r,
      base_price: r.base_price == null ? null : Number(r.base_price),
      custom_price: r.custom_price == null ? null : Number(r.custom_price),
    })) as ActivityOffer[];
  });
  return r ?? [];
}

export async function upsertActivity(p: Partial<ActivityOffer> & { name: string }): Promise<number> {
  const r = await withClient(async (c) => {
    if (p.id) {
      // Поддерживаем set custom_price = NULL для «сброса к рекомендованной»
      const hasCustom = 'custom_price' in p;
      await c.query(
        `UPDATE portal_activity_offer
            SET name=$2, description=$3, category=$4, base_price=$5,
                participants_hint=$6, target_days=$7, target_share_pct=$8, repeat_multiplier=$9,
                sort=$10, archived=COALESCE($11, archived),
                custom_price = CASE WHEN $13::boolean THEN $12 ELSE custom_price END,
                updated_at=NOW()
          WHERE id=$1`,
        [p.id, p.name, p.description ?? null, p.category ?? null, p.base_price ?? null,
         p.participants_hint ?? null,
         p.target_days ?? null, p.target_share_pct ?? null, p.repeat_multiplier ?? null,
         p.sort ?? 0, p.archived ?? null,
         p.custom_price ?? null, hasCustom]
      );
      return p.id!;
    }
    const ins = await c.query(
      `INSERT INTO portal_activity_offer
         (name, description, category, base_price, participants_hint,
          target_days, target_share_pct, repeat_multiplier, custom_price, sort)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [p.name, p.description ?? null, p.category ?? null, p.base_price ?? null,
       p.participants_hint ?? null,
       p.target_days ?? null, p.target_share_pct ?? null, p.repeat_multiplier ?? null,
       p.custom_price ?? null, p.sort ?? 0]
    );
    return Number(ins.rows[0].id);
  });
  return r ?? 0;
}

export async function deleteActivity(id: number): Promise<void> {
  await withClient(async (c) => {
    await c.query(`UPDATE portal_activity_offer SET archived = TRUE, updated_at = NOW() WHERE id = $1`, [id]);
  });
}

/** Сидинг — стандартные активности, чтобы у админа было с чего начать. */
export async function seedDefaultActivities(): Promise<number> {
  const defaults: Omit<ActivityOffer, 'id' | 'sort' | 'archived'>[] = [
    { name: 'Телефон на всю ночь', description: 'Можно оставить телефон у себя до утра вместо сдачи в сейф', category: 'privilege', base_price: 0, participants_hint: 1 },
    { name: 'Отменить зарядку', description: 'Команда откупается от утренней зарядки на 1 день', category: 'privilege', base_price: 0, participants_hint: 25 },
    { name: 'Подъём на час позже', description: 'На всю комнату — общий поздний подъём', category: 'comfort', base_price: 0, participants_hint: 4 },
    { name: 'Уборка вожатого', description: 'Вожатый убирает вашу комнату вместо вас', category: 'service', base_price: 0, participants_hint: 4 },
    { name: 'Встать вожатым на смену', description: 'Стать «исполняющим обязанности» вожатого на полдня', category: 'fun', base_price: 0, participants_hint: 1 },
    { name: 'Фильм на вечер', description: 'Выбрать фильм для общего киновечера', category: 'fun', base_price: 500, participants_hint: 30 },
    { name: 'Сосиски на костре', description: 'Сосиски + хлеб на всю компанию у костра', category: 'food', base_price: 1500, participants_hint: 15 },
    { name: 'Пицца в комнату', description: 'Доставка пиццы прямо в комнату вечером', category: 'food', base_price: 1200, participants_hint: 4 },
    { name: 'Шашлык для команды', description: 'Шашлык на компанию (вечерний ужин у костра)', category: 'food', base_price: 5000, participants_hint: 25 },
    { name: 'Мороженое на всю комнату', description: 'По мороженому каждому в комнате', category: 'food', base_price: 600, participants_hint: 4 },
    { name: 'Чипсы и газировка', description: 'Набор снеков для вечерних посиделок', category: 'food', base_price: 800, participants_hint: 6 },
    { name: 'Дискотека по заявкам', description: 'Полчаса дискотеки с вашим плейлистом', category: 'fun', base_price: 0, participants_hint: 20 },
    { name: 'Пейнтбол на природе', description: 'Выезд на пейнтбол (по согласованию с лагерем)', category: 'fun', base_price: 8000, participants_hint: 10 },
    { name: 'Тихий час отменить', description: 'Можно не спать в тихий час (только для команды)', category: 'privilege', base_price: 0, participants_hint: 4 },
    { name: 'Дополнительные 30 мин в бассейне', description: '+30 мин водных активностей сверх расписания', category: 'fun', base_price: 0, participants_hint: 10 },
  ];

  return (await withClient(async (c) => {
    // Сидим только если таблица пустая
    const cnt = await c.query(`SELECT COUNT(*)::int AS n FROM portal_activity_offer`);
    if (cnt.rows[0].n > 0) return 0;
    let n = 0;
    for (let i = 0; i < defaults.length; i++) {
      const d = defaults[i];
      await c.query(
        `INSERT INTO portal_activity_offer (name, description, category, base_price, participants_hint, sort)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [d.name, d.description, d.category, d.base_price, d.participants_hint, i * 10]
      );
      n++;
    }
    return n;
  })) ?? 0;
}

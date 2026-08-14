/**
 * deterministic.ts — детерминированные замены Math.random() для кода, который
 * выполняется НА СБОРКЕ (frontmatter .astro).
 *
 * Зачем. Math.random() во frontmatter делает сборку недетерминированной: два
 * билда из одного коммита дают разный HTML. Последствия дороже, чем кажется —
 * замер 14.08.2026 на 336 страницах:
 *   - 151 страница получала новый HTML на каждом билде;
 *   - rsync считал их изменёнными и гнал на dev 42 МБ вместо десятков килобайт;
 *   - кэш минификации (scripts/html-minify-cached.mjs) промахивался на них же.
 *
 * И главное — «случайности» всё равно не получалось: значение фиксируется в
 * момент сборки, поэтому все посетители видят один и тот же вариант до
 * следующего деплоя. Нужна настоящая случайность у пользователя — её место в
 * браузере, а не во frontmatter.
 */

/** FNV-1a. Быстрый, без зависимостей, стабильный между запусками Node. */
function hash32(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Короткий идентификатор из seed — замена `${prefix}-${Math.random()...}`.
 *
 * Уникальность в пределах страницы НЕ гарантируется: при одинаковом seed выйдет
 * одинаковый id. Для нынешних потребителей (AnimatedStat, DonutChart) это
 * безопасно — их скрипты ищут элементы селектором по префиксу
 * (`[id^="astat-"]`), а не через getElementById. Если появится потребитель,
 * которому нужен именно уникальный id, ему нужен другой механизм.
 */
export function stableId(prefix: string, seed: string): string {
  return `${prefix}-${hash32(seed).toString(36).padStart(7, '0').slice(0, 7)}`;
}

/**
 * Детерминированный PRNG (xorshift32) от строкового seed.
 * Одинаковый seed → одинаковая последовательность.
 */
export function seededRandom(seed: string): () => number {
  let state = hash32(seed) || 1; // 0 — вырожденное состояние xorshift
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

/** Тасовка Фишера—Йетса на детерминированном PRNG. Исходный массив не меняется. */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const rand = seededRandom(seed);
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

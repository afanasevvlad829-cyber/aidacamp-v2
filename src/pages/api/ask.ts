export const prerender = false;
import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from '../../lib/ai/systemPrompt';
import { ResponseSchema } from '../../lib/ai/responseSchema';
import { ragSearch } from '../../lib/ai/rag';
import { findPhotos } from '../../lib/ai/photoSearch';
import { lastCompletedShift } from '../../data/shifts';
import { matchEscalation, templateToResponse } from '../../lib/ai/escalation_templates';
import { classifyIntent, pickRealStory } from '../../lib/ai/intent_router';
import { validateBotResponse, logGuardFlag } from '../../lib/ai/validator';
import pg from 'pg';

// --- DB pool (lazy, shared with rag.ts) ---
const DB_URL = process.env.DATABASE_URL;
let _logPool: InstanceType<typeof pg.Pool> | null = null;
function getLogPool() {
  if (!_logPool && DB_URL) {
    _logPool = new pg.Pool({ connectionString: DB_URL, max: 2 });
  }
  return _logPool;
}

/** Fire-and-forget: логируем диалог в ai_ask_sessions */
async function logSession(
  sessionId: string,
  userQ: string,
  botA: string,
  ragHits: unknown,
  metrics?: { latencyMs?: number; model?: string; inputTokens?: number; outputTokens?: number },
): Promise<number | null> {
  const pool = getLogPool();
  if (!pool) return null;
  try {
    const r = await pool.query(
      `INSERT INTO ai_ask_sessions (session_id, user_q, bot_a, rag_hits, latency_ms, model, input_tokens, output_tokens)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [sessionId, userQ, botA, JSON.stringify(ragHits ?? null),
       metrics?.latencyMs ?? null, metrics?.model ?? null,
       metrics?.inputTokens ?? null, metrics?.outputTokens ?? null],
    );
    return r.rows[0]?.id ?? null;
  } catch (err) { console.error('ask log error:', err); return null; }
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AskRequest {
  message: string;
  history: ChatMessage[];
  sessionId?: string;
}

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || import.meta.env.ANTHROPIC_API_KEY,
});

// Резервный ответ при таймауте — лучше чем пустой экран
const TIMEOUT_FALLBACK = JSON.stringify({
  state: 'ok',
  text: 'Что-то подвисло на сервере — бывает. Напишите Дарье напрямую: <a href="https://wa.me/79688086455" target="_blank">WhatsApp +7 (968) 808-64-55</a> или <a href="https://t.me/Progaschool" target="_blank">Telegram @Progaschool</a> — ответим быстро.',
  block_type: null,
  block_data: null,
  chips: [
    { label: 'Написать в WhatsApp', action: 'contact_request' },
    { label: 'Telegram @Progaschool', action: 'link', url: 'https://t.me/Progaschool' },
    { label: 'Попробовать ещё раз', query: '' },
  ],
});

export const POST: APIRoute = async ({ request }) => {
  const _abMod = (() => { try { return new URL(request.url).searchParams.get("m"); } catch { return null; } })();
  // X-Audit: 1 заголовок → режим аудита: Haiku, пониженный приоритет в логах
  const _isAudit = request.headers.get('X-Audit') === '1';
  const _auditModelOverride = request.headers.get('X-Audit-Model'); // 'haiku' | 'sonnet' | null
  let body: AskRequest | undefined;
  try {
    body = await request.json();
    const { message, history = [], sessionId } = body!;

    if (!message?.trim()) {
      return new Response(JSON.stringify({ state: 'error', text: 'Пустое сообщение' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Генерируем session_id если клиент не прислал
    const sid = sessionId || crypto.randomUUID();

    // RAG + классификация intent — параллельно, промпт собирается синхронно из campData
    const [ragResult, intent] = await Promise.all([
      ragSearch(message),
      classifyIntent(message),
    ]);
    const basePrompt = buildSystemPrompt();

    // Hard-gates сняты — доверяем LLM с RAG-контекстом отвечать честно.
    // Если в RAG нет — модель сама скажет не знаю, спросите менеджера по правилу промпта.

    // PHOTO FAST-PATH: «фото [тема]» или «покажи [тема]» → gallery без LLM.
    // LLM иногда применял правило «бассейн → текст» вместо «фото → gallery».
    const photoTopicMap: [RegExp, string, string][] = [
      [/фото\s*(бассейн|плавани|купан)|бассейн.*фото|покажи\s*(бассейн)|как\s+выглядит\s+бассейн/i, 'бассейн', 'Вот бассейн — закрытый, через день по расписанию.'],
      [/фото\s*(занят|программир|обучен|урок|класс|компьютер)|покажи\s*(занят|класс)/i, 'занятия программированием', 'Вот фото занятий.'],
      [/фото\s*(ед[аы]|питани|завтрак|обед|ужин)|покажи\s*(ед[аы]|питани)/i, 'еда', 'Вот фото питания в лагере.'],
      [/фото\s*(территори|лагер(?!я)|природ|место)|покажи\s*(территори|лагер)/i, 'территория лагеря', 'Вот фото территории.'],
      [/фото\s*(комнат|проживан|домик|корпус)|покажи\s*(комнат|корпус)/i, 'проживание комнаты', 'Вот фото комнат.'],
      [/фото\s*(хакатон|презентац|проект)|покажи\s*(хакатон)/i, 'хакатон', 'Вот фото хакатона.'],
    ];
    for (const [re, query, shortText] of photoTopicMap) {
      if (re.test(message)) {
        const photos = findPhotos(query, 3);
        const fastResp = JSON.stringify({ state: 'ok', text: shortText, block_type: 'gallery', block_data: { photos }, chips: [], message_id: null });
        logSession(sid, message, fastResp, { trustedCount: ragResult.trustedCount, isEmpty: ragResult.isEmpty, hits: ragResult.hits, fast_photo: true });
        return new Response(fastResp, { headers: { 'Content-Type': 'application/json' } });
      }
    }

    // ESCALATION ROUTER: проверяем 12 готовых шаблонов до LLM.
    // Если совпало — отдаём готовый ответ + контактные chips, без генерации.
    const escalation = matchEscalation(message);
    if (escalation) {
      const tplResp = templateToResponse(escalation);
      const _msgIdEsc = await logSession(sid, message, tplResp,
        { trustedCount: ragResult.trustedCount, isEmpty: ragResult.isEmpty, hits: ragResult.hits, escalation: escalation.id }
      );
      const finalEsc = JSON.stringify({ ...JSON.parse(tplResp), message_id: _msgIdEsc });
      return new Response(finalEsc, { headers: { 'Content-Type': 'application/json' } });
    }

    // INTENT ROUTER: intent уже классифицирован выше (параллельно с RAG). Для intent=story
    // достаём 1 реальную историю и жёстко ограничиваем модель её пересказывать, без
    // миксования с маркетингом/видео.
    let intentBoost = '';
    if (intent === 'story') {
      const real = await pickRealStory(message);
      if (real) {
        intentBoost =
          '\n\n=== РЕЖИМ ИСТОРИИ (intent=story) ===\n' +
          'Это запрос на личную историю. ИСПОЛЬЗУЙ ТОЛЬКО ЭТУ ИСТОРИЮ Дарьи (источник: ' + real.source + '):\n\n' +
          '«' + real.text + '»\n\n' +
          'ПРАВИЛА:\n' +
          '- Перескажи историю своими словами как живой рассказ — со всеми важными деталями: цитатами участников, их реакциями, моментами что Дарья говорила/делала. НЕ сокращай, передай атмосферу. 8-15 предложений нормально.\n' +
          '- НЕ выдумывай: нет имени → не давай имя; нет возраста → говори «один ребёнок»; нет курса → не указывай.\n' +
          '- НЕ миксуй с другими случаями из контекста ниже.\n' +
          '- Не упоминай источник.';
      }
    } else if (intent === 'fact_lookup') {
      intentBoost =
        '\n\n=== РЕЖИМ ФАКТА (intent=fact_lookup) ===\n' +
        'Вопрос про конкретное число/факт. Бери ТОЛЬКО из ФАКТОВ ЛАГЕРЯ выше или явно цитированного RAG. ' +
        'Если нет — скажи "не знаю точно, спросите менеджера". НЕ выдумывай.';
    } else if (intent === 'experience') {
      intentBoost =
        '\n\n=== РЕЖИМ ЭМОЦИИ (intent=experience) ===\n' +
        'Мама беспокоится. Ответь ТЁПЛО, опираясь на тон Дарьи из контекста (видео, публикации). ' +
        'Но без выдуманных историй — общие наблюдения, без «один мальчик».';
    }
    // Для story режима убираем общий RAG-контекст (другие истории/видео миксуют) — оставляем ТОЛЬКО pickRealStory
    const ctxForLLM = (intent === 'story') ? '' : ragResult.context;

    // Честный контекст про последнюю прошедшую смену (Task 4) — фото пока НЕ размечены по сменам,
    // LLM должен называть смену по имени, но не приписывать ей конкретные фото (см. systemPrompt.ts).
    const _today = new Date().toISOString().slice(0, 10);
    const _lastShift = lastCompletedShift(_today);
    const shiftContext = _lastShift
      ? `\n\n=== ПОСЛЕДНЯЯ ПРОШЕДШАЯ СМЕНА ===\nСмена: "${_lastShift.name}" (${_lastShift.dates}).\n` +
        `ВАЖНО: у нас пока НЕТ фото, размеченных по конкретной смене — если тебя просят "фото с последней смены",\n` +
        `назови смену по имени (${_lastShift.name}), но честно скажи что показываешь ОБЩИЕ живые фото с лагеря,\n` +
        `а не фото именно с этой смены. НЕ утверждай "вот фото именно с ${_lastShift.name}" — это неправда.`
      : '';
    // basePrompt стабилен внутри деплоя (campData + правило роста цен) — кэшируем отдельным блоком.
    // ctxForLLM/intentBoost меняются на каждый запрос — не кэшируем, иначе маркер в конце
    // общего блока делает байты уникальными почти всегда и кэш никогда не читается.
    const volatileSuffix = ctxForLLM + intentBoost + shiftContext;

    const messages: Anthropic.MessageParam[] = [
      ...history.slice(-12).map((m: ChatMessage) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    // A/B: ?m=haiku -> используем haiku как primary (для замера latency/CSAT)
    // X-Audit: 1 → форсируем Haiku для дешёвого аудита (x3.75 экономия)
    const _forceHaiku = _isAudit || _abMod === 'haiku' || _auditModelOverride === 'haiku';
    const _forceSonnet = _auditModelOverride === 'sonnet';
    const PRIMARY_MODEL = (_forceSonnet ? false : _forceHaiku)
      ? 'claude-haiku-4-5-20251001'
      : 'claude-sonnet-4-5-20250929';
    const FALLBACK_MODEL = (_forceSonnet ? false : _forceHaiku)
      ? 'claude-sonnet-4-5-20250929'
      : 'claude-haiku-4-5-20251001';
    let usedModel = PRIMARY_MODEL;
    const t0 = Date.now();
    let response: any;
    try {
      response = await client.messages.create({
        model: PRIMARY_MODEL,
        max_tokens: 1200,
        temperature: 0,
        system: [
          { type: 'text', text: basePrompt, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: volatileSuffix },
        ],
        messages,
      });
    } catch (primaryErr: any) {
      console.warn('[ask] Haiku failed, falling back to Sonnet:', primaryErr?.message);
      usedModel = FALLBACK_MODEL;
      response = await client.messages.create({
        model: FALLBACK_MODEL,
        max_tokens: 1200,
        temperature: 0,
        system: [
          { type: 'text', text: basePrompt, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: volatileSuffix },
        ],
        messages,
      });
    }
    const latencyMs = Date.now() - t0;
    const inputTokens = response?.usage?.input_tokens ?? null;
    const outputTokens = response?.usage?.output_tokens ?? null;
    const cacheReadTokens = response?.usage?.cache_read_input_tokens ?? null;
    const cacheCreationTokens = response?.usage?.cache_creation_input_tokens ?? null;
    const metrics = { latencyMs, model: usedModel, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens };
    // Видимость кэша в логах сервера — ai_ask_sessions пока не хранит эти поля (нет колонок в БД)
    console.log(`[ask] cache read=${cacheReadTokens} created=${cacheCreationTokens} input=${inputTokens} model=${usedModel}`);

    const raw = response.content[0].type === 'text' ? response.content[0].text : '';

    // Extract JSON even if Claude wraps it in ```json ... ```
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // AI returned plain text (e.g. for sensitive/negative questions) — wrap it gracefully
      const cleanText = raw.replace(/```[\s\S]*?```/g, '').trim() || 'Уточните вопрос.';
      console.warn('No JSON in response, using raw text as fallback. Length:', raw.length);
      const fallbackResp = JSON.stringify({
        state: 'ok',
        text: cleanText,
        block_type: null,
        block_data: null,
        chips: [
          { label: 'Смены 2026', query: 'смены' },
          { label: 'Цены', query: 'цены' },
          { label: 'Написать менеджеру', action: 'contact_request' },
        ],
      });
      logSession(sid, message, fallbackResp, { trustedCount: ragResult.trustedCount, isEmpty: ragResult.isEmpty, hits: ragResult.hits }, metrics);
      return new Response(fallbackResp, { headers: { 'Content-Type': 'application/json' } });
    }

    // Robust JSON parse: Claude sometimes embeds literal newlines inside string values
    let parsedJson: any;
    try {
      parsedJson = JSON.parse(jsonMatch[0]);
    } catch {
      // Try fixing unescaped newlines inside JSON string values
      const fixed = jsonMatch[0].replace(
        /"((?:[^"\\]|\\.)*)"/g,
        (_m: string, s: string) => '"' + s.replace(/\n/g, '\\n').replace(/\r/g, '') + '"'
      );
      try { parsedJson = JSON.parse(fixed); }
      catch { parsedJson = null; }
    }
    if (!parsedJson) {
      console.warn('JSON parse failed even after sanitization');
      const parseErrResp = JSON.stringify({
        state: 'ok',
        text: raw.replace(/```json|```|\{[\s\S]*\}/g, '').trim() || 'Уточните вопрос.',
        block_type: null,
        block_data: null,
        chips: [{ label: 'Смены 2026', query: 'смены' }, { label: 'Цены', query: 'цены' }, { label: 'Написать менеджеру', action: 'contact_request' }]
      });
      logSession(sid, message, parseErrResp, { trustedCount: ragResult.trustedCount, isEmpty: ragResult.isEmpty, hits: ragResult.hits }, metrics);
      return new Response(parseErrResp, { headers: { 'Content-Type': 'application/json' } });
    }

    const parsed = ResponseSchema.safeParse(parsedJson);
    if (!parsed.success) {
      // Fallback: return just the text
      const schemaErrResp = JSON.stringify({
        state: 'ok',
        text: raw.replace(/```json|```/g, '').trim(),
        block_type: null,
        block_data: null,
        chips: [
          { label: 'Смены 2026', query: 'смены' },
          { label: 'Цены', query: 'цены' },
          { label: 'Забронировать', action: 'book' },
        ],
      });
      logSession(sid, message, schemaErrResp, { trustedCount: ragResult.trustedCount, isEmpty: ragResult.isEmpty, hits: ragResult.hits }, metrics);
      return new Response(schemaErrResp, { headers: { 'Content-Type': 'application/json' } });
    }

    const responseData = { ...parsed.data };
    // Бронирование уже как persistent-кнопка в input-row — фильтруем из чипов на сервере
    if (Array.isArray((responseData as any).chips)) {
      (responseData as any).chips = (responseData as any).chips.filter((c: any) => c?.action !== 'book');
    }

    // Если бот попросил галерею — подбираем фото по запросу
    if (responseData.block_type === 'gallery') {
      const photoQuery = (responseData.block_data as any)?.query || message;
      responseData.block_data = { photos: findPhotos(photoQuery, 4) };
    }

    // GUARD: проверяем текст на фактические ошибки (цены, даты, вычет и т.п.) по списку фактов.
    // Блокирующе (Haiku, быстро) — иначе галлюцинация уходит пользователю до всякой проверки.
    // Инцидент 08.07: Haiku иногда кладёт в correction мета-разбор ("бот ошибся, правильный
    // ответ...") вместо чистой фразы — такое НЕЛЬЗЯ показывать пользователю напрямую.
    // Не полагаемся только на промпт — фильтруем по форме перед подстановкой.
    const META_CORRECTION = /\bбот\b|правильный ответ|должен был|не должен|выдумал|не ответил на вопрос|проигнорировал|ошиб(ся|ка|очн)/i;
    try {
      const validation = await validateBotResponse(message, responseData.text);
      if (!validation.valid) {
        // Логируем ЛЮБОЙ invalid — в т.ч. без correction (раньше такие терялись
        // молча и ai_guard_flags оставалась пустой).
        const correction = validation.correction || '';
        const isMeta = correction !== '' && META_CORRECTION.test(correction);
        const willCorrect = correction !== '' && !isMeta;
        logGuardFlag(message, responseData.text, validation.issue || '', correction, willCorrect);
        if (willCorrect) {
          responseData.text = correction;
        }
      }
    } catch { /* validateBotResponse сам не бросает, но подстрахуемся */ }

    // Сначала логируем (получаем PK), потом инжектим в ответ — иначе TDZ
    const _bodyForLog = JSON.stringify({ state: 'ok', ...responseData });
    const _msgId = await logSession(sid, message, _bodyForLog, { trustedCount: ragResult.trustedCount, isEmpty: ragResult.isEmpty, hits: ragResult.hits }, metrics);
    const finalResp = JSON.stringify({ state: 'ok', ...responseData, message_id: _msgId });
    return new Response(finalResp, { headers: { 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('ask.ts error:', e?.name, e?.message);
    // Логируем сбой тоже — чтобы CSAT мог поставить минус и в воронке видна ошибка
    try {
      const sid = (body?.sessionId) || 'err-' + Date.now();
      const userQ = (body?.message) || '';
      await logSession(sid, userQ, TIMEOUT_FALLBACK, { error: e?.message?.slice(0,200) });
    } catch {}
    return new Response(TIMEOUT_FALLBACK, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

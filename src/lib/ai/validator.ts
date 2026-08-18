import Anthropic from '@anthropic-ai/sdk';
import pg from 'pg';
import { campData } from './campData';
import { mainShifts, shortShifts, SHIFT_META, EDU_RESID_PER_DAY, fmtRub } from '../../data/shifts';
import { getCurrentPrice, getTaxDeduction } from '../../data/dynamicPrices';

// Диапазон вычета и пример цены — динамически по ОТКРЫТЫМ сменам (единый источник, не хардкод)
const _open = [...mainShifts, ...shortShifts];
const _openDeds = _open.map((s) => getTaxDeduction(s.id));
const _dedRange = _openDeds.length
  ? `${fmtRub(Math.min(..._openDeds)).replace(' ₽', '')}–${fmtRub(Math.max(..._openDeds))}`
  : 'по формуле';
const _ex = _open[0];
const _exName = _ex?.name ?? 'Смена';
const _exDays = _ex ? SHIFT_META[_ex.id].days : 0;
const _exPrice = _ex ? fmtRub(getCurrentPrice(_ex.id) ?? 0) : '—';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || import.meta.env.ANTHROPIC_API_KEY,
});

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || import.meta.env.DATABASE_URL,
  max: 3,
  idleTimeoutMillis: 30000,
});

function buildFacts(): string {
  const shifts = campData.shifts.map(s =>
    `- ${s.name} (${s.dates}, ${s.days} дней): ${s.price.toLocaleString('ru')} ₽${!s.available ? ' — МЕСТ НЕТ' : ''}${s.popular ? ' — самая популярная' : ''}`
  ).join('\n');

  return `ФАКТЫ ЛАГЕРЯ (проверяй ответ бота только по ним):

Цены смен:
${shifts}

Налоговый вычет: 13% только от образовательной части (цена минус ${fmtRub(EDU_RESID_PER_DAY)}/день проживания). Реально возвращается ${_dedRange}. НЕ 8–12 тысяч, НЕ "половина стоимости".

Трансфер: ${campData.facts.transfer}.

Вожатые: ${campData.facts.counselorRatio}.

Телефоны: сдаются при заезде. Телефонное время — каждый вечер в 19:00, до 60 минут.

Опыт: ${campData.facts.yearsWorking}.

Оплата: ${campData.facts.payment}

Реферальная программа: ${campData.facts.referral}

Хакатон: последние 2 дня каждой смены. Отдельное командное соревнование, не проект смены. НЕ "три дня".

Возраст: ${campData.facts.ageRange}.

Питание: ${campData.facts.meals}.

Адрес: ${campData.facts.address}. От Москвы: ${campData.facts.distanceFromMoscow}.

Медицина: ${campData.facts.medical}.

Документы для заезда: справка 079/у + свидетельство о рождении / паспорт ребёнка.

Договор: оферты на сайте НЕТ. Шаблон PDF: https://aidacamp.ru/docs/dogovor-aidacamp.pdf

Ноутбук: не нужен. Всё оборудование предоставляется.`;
}

const VALIDATOR_SYSTEM = `Ты — строгий контролёр качества ответов AI-ассистента лагеря АйДаКемп.

Твоя задача: проверить ответ бота на фактические ошибки по списку ФАКТОВ.

${buildFacts()}

ПРАВИЛА ПРОВЕРКИ:
1. Проверяй ТОЛЬКО конкретные факты: числа, даты, проценты, условия. Не стиль.
2. Если бот написал что-то чего нет в фактах (выдумал) — это ошибка.
3. Если бот сказал "за 3 сезона" — ошибка (6 лет работы).
4. Если бот сказал "вожатый спит в комнате" — ошибка.
5. Если бот назвал вычет "8–12 тыс." или "половина стоимости" — ошибка.
6. Незначительные формулировки ("около часа езды" вместо "1 час") — НЕ ошибка.
7. Если бот не знал ответа и предложил связаться с менеджером — НЕ ошибка.

ФОРМАТ ОТВЕТА — только JSON:
{
  "valid": true
}
— если ответ корректен.

{
  "valid": false,
  "issue": "одна строка для внутреннего лога — что именно не так (это НЕ увидит пользователь)",
  "correction": "готовая фраза для показа маме НАПРЯМУЮ вместо ответа бота — 1-2 предложения"
}
— если есть фактическая ошибка.

КРИТИЧНО про поле "correction":
Это текст, который увидит мама на экране ВМЕСТО ответа бота — пиши его как сам ответ, от лица ассистента, тёплым тоном, как будто ошибки не было.
ЗАПРЕЩЕНО в "correction": слова "бот", "правильный ответ", "должен был", "ошибка", "выдумал", "не ответил на вопрос" — это анализ, а не ответ маме.
❌ Плохо: "Бот ошибся, правильная цена ${_exPrice}." / "Бот не должен был придумывать детали. Правильный ответ: этой информации у меня нет."
✅ Хорошо: "${_exName} (${_exDays} дней) стоит ${_exPrice}." / "Такой информации у меня под рукой нет — уточните у Дарьи напрямую."
Если исправить ответ одной фразой нельзя (вопрос полностью проигнорирован, нужен развёрнутый ответ) — верни "valid": false БЕЗ поля "correction", просто issue для лога.

Будь строгим к числам и мягким к формулировкам.`;

export interface ValidationResult {
  valid: boolean;
  issue?: string;
  correction?: string;
}

export async function validateBotResponse(
  userMessage: string,
  botResponse: string
): Promise<ValidationResult> {
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: VALIDATOR_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Вопрос мамы: "${userMessage}"\n\nОтвет бота: "${botResponse}"\n\nПроверь на ошибки.`,
        },
      ],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text : '{"valid":true}';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { valid: true };

    const result = JSON.parse(jsonMatch[0]);
    return result as ValidationResult;
  } catch (err: any) {
    // При ошибке валидатора — пропускаем, не ломаем основной флоу.
    // Но причину пишем в лог: молчаливый {valid:true} скрывал, жив ли валидатор вообще.
    console.error('[validator] validateBotResponse failed:', err?.name, err?.message);
    return { valid: true };
  }
}

// Логируем в БД асинхронно — не блокируем ответ
export function logGuardFlag(
  userMessage: string,
  botResponse: string,
  issue: string,
  correction: string,
  wasCorrected: boolean
): void {
  pool
    .query(
      `INSERT INTO ai_guard_flags (user_message, bot_response, issue, correction, was_corrected)
       VALUES ($1, $2, $3, $4, $5)`,
      [userMessage, botResponse, issue, correction, wasCorrected]
    )
    .catch((err) => console.error('guard flag log error:', err));
}

import Anthropic from '@anthropic-ai/sdk';
import pg from 'pg';
import { campData } from './campData';

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

Налоговый вычет: 13% только от образовательной части (цена минус 3 800 ₽/день проживания). Реально возвращается 2 800–5 500 ₽. НЕ 8–12 тысяч, НЕ "половина стоимости".

Кешбэк: 15% через Госуслуги — отдельная программа, не суммируется с вычетом в одну цифру.

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
  "issue": "одна строка — что именно не так",
  "correction": "правильная фраза которую бот должен сказать вместо ошибочной (1-2 предложения)"
}
— если есть фактическая ошибка.

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
  } catch {
    // При ошибке валидатора — пропускаем, не ломаем основной флоу
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

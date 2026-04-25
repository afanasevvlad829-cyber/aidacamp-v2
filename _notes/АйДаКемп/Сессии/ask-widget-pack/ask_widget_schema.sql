-- ─────────────────────────────────────────────────────────────────
-- Schema for /ask/ public chat widget — co-exists with CLS in same DB
-- Только 2 новые таблицы. Использует общий pgvector + OPENAI_API_KEY.
-- ─────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS vector;

-- ── 1) Курированный FAQ для публичного бота ──────────────────────
-- Заполняется ВРУЧНУЮ или из anonymized ai_dialog_rag (с review).
-- Embedding ищется по «вопросу клиента».
CREATE TABLE IF NOT EXISTS ai_faq_rag (
  id BIGSERIAL PRIMARY KEY,
  project        TEXT NOT NULL,            -- 'CAMP' | 'KODIT' | 'BOTH'
  question       TEXT NOT NULL,            -- типичный вопрос мамы
  answer         TEXT NOT NULL,            -- утверждённый ответ от лица бренда
  tags           TEXT[] DEFAULT '{}',      -- ['price','schedule','age']
  status         TEXT DEFAULT 'active',    -- active | draft | archived
  embedding      vector(1536),
  source_dialog_id BIGINT,                 -- если из ai_dialog_rag — ссылка на оригинал
  approved_by    TEXT,                     -- кто одобрил (Vlad / Darya)
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_faq_rag_embed ON ai_faq_rag
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_faq_rag_project ON ai_faq_rag(project);
CREATE INDEX IF NOT EXISTS idx_faq_rag_status ON ai_faq_rag(status);


-- ── 2) Структурированные факты программ ──────────────────────────
-- Не embedding! Это «source of truth» для уверенных ответов.
-- Бот сначала ищет здесь точные цены, потом fallback в FAQ/site_rag.
CREATE TABLE IF NOT EXISTS ai_program_facts (
  id BIGSERIAL PRIMARY KEY,
  project        TEXT NOT NULL,            -- 'CAMP' | 'KODIT'
  program_code   TEXT UNIQUE NOT NULL,     -- 'kodit_python_basic', 'camp_summer_2026_smena1'
  name           TEXT NOT NULL,            -- человеческое название
  age_min        INT,
  age_max        INT,
  price_value    NUMERIC,                  -- 15000 / 65000
  price_unit     TEXT,                     -- 'per_month' | 'per_session'
  schedule_text  TEXT,                     -- "Сб 14:00, Вс 12:00 — на выбор"
  duration_text  TEXT,                     -- "9 месяцев" | "9 дней"
  description    TEXT,                     -- 1-2 абзаца
  link_url       TEXT,                     -- ссылка на страницу программы
  active         BOOLEAN DEFAULT true,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_program_facts_project ON ai_program_facts(project);


-- ── 3) Логирование сессий /ask/ (опционально, для аналитики) ─────
CREATE TABLE IF NOT EXISTS ai_ask_sessions (
  id BIGSERIAL PRIMARY KEY,
  session_id     TEXT NOT NULL,            -- cookie uuid
  user_q         TEXT NOT NULL,
  bot_a          TEXT,
  rag_hits       JSONB,                    -- что подтянули и какой similarity
  led_to_lead    BOOLEAN DEFAULT false,    -- остался ли телефон
  customer_id    BIGINT REFERENCES ai_customers(id) ON DELETE SET NULL,
  ts             TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ask_sessions_session ON ai_ask_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_ask_sessions_ts ON ai_ask_sessions(ts DESC);


-- ── Sample data: 5 базовых FAQ для старта ───────────────────────
INSERT INTO ai_faq_rag (project, question, answer, tags, status) VALUES
('KODIT', 'Сколько стоит занятие?',
 'Занятие в АйДаКодить стоит 15 000 ₽ в месяц (4 урока, продолжительность 60 минут каждый). Точная цена для конкретной программы — на странице курса.',
 ARRAY['price'], 'active'),

('KODIT', 'С какого возраста можно заниматься?',
 'У нас разные курсы для разного возраста. Скретч — с 8 лет, Python базовый — с 10 лет, Python PRO — с 12 лет, ЕГЭ-подготовка — старшие классы.',
 ARRAY['age'], 'active'),

('KODIT', 'Где проходят занятия?',
 'Очно в наших филиалах в Москве (Лукинская 8, и др. адреса), плюс онлайн-формат для тех кто не из Москвы.',
 ARRAY['location'], 'active'),

('CAMP', 'Когда смены лагеря в 2026?',
 'Точные даты смен будут опубликованы на aidacamp.ru. Обычно лагерь работает с июня по август, есть несколько смен по 9-10 дней каждая.',
 ARRAY['schedule'], 'active'),

('BOTH', 'Как записаться?',
 'Оставьте телефон и мы свяжемся в течение рабочего дня. Уточним программу под возраст ребёнка, ответим на вопросы, забронируем место.',
 ARRAY['signup'], 'active');

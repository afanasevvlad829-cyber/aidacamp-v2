#!/usr/bin/env python3
"""
/ask/ public chat widget — FastAPI backend.

Endpoints:
  POST /api/ask           — задать вопрос боту
  POST /api/ask/lead      — оставить телефон (создаёт запись в CRM)
  GET  /api/ask/health    — healthcheck

Usage on server:
  pip install fastapi uvicorn psycopg2-binary
  uvicorn ask_api:app --host 0.0.0.0 --port 8001

Deployment via systemd:
  /etc/systemd/system/ask-api.service
  + nginx reverse-proxy: /api/ask → 127.0.0.1:8001

Shares with CLS:
  - Postgres (same database 'aidacamp')
  - OPENAI_API_KEY (text-embedding-3-small + gpt-4o-mini)
  - ai_site_rag (already populated by site_scraper.py)
  - ai_dialogs (writes new lead conversations)
  - ai_customers (creates/links customers from leads)
"""
import os, json, uuid, logging
from typing import Optional, List
from datetime import datetime

import psycopg2, psycopg2.extras
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import urllib.request

OPENAI_KEY = os.environ["OPENAI_API_KEY"]

app = FastAPI(title="AidaCamp /ask/ Widget API")
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("ask_api")

# ───────────────────────── DB ──────────────────────────────────────
def db():
    return psycopg2.connect(dbname="aidacamp", user="postgres",
                            cursor_factory=psycopg2.extras.RealDictCursor)

# ───────────────────────── OpenAI helpers ──────────────────────────
def embed(text: str) -> list:
    body = {"model": "text-embedding-3-small", "input": [text[:2000]]}
    req = urllib.request.Request("https://api.openai.com/v1/embeddings",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json",
                 "Authorization": f"Bearer {OPENAI_KEY}"})
    with urllib.request.urlopen(req, timeout=10) as r:
        return json.loads(r.read())["data"][0]["embedding"]

def emb_lit(e):
    return "[" + ",".join(f"{v:.6f}" for v in e) + "]"

def llm(messages: list, temperature=0.3, max_tokens=400) -> str:
    """gpt-4o-mini (cheap, fast). Switch to ft:... when fine-tune is ready."""
    body = {"model": "gpt-4o-mini", "messages": messages,
            "temperature": temperature, "max_tokens": max_tokens}
    req = urllib.request.Request("https://api.openai.com/v1/chat/completions",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json",
                 "Authorization": f"Bearer {OPENAI_KEY}"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())["choices"][0]["message"]["content"]

# ───────────────────────── Retrieval ───────────────────────────────
RAG_THRESHOLD = 0.55  # если ничего выше — бот уходит в «не знаю, оставь телефон»

def retrieve_context(query: str, project: str = "BOTH", k_each: int = 4) -> dict:
    """Get top-k from FAQ + site + program facts. Returns structured ctx."""
    q_emb = emb_lit(embed(query))
    proj_filter = "BOTH" if project == "BOTH" else project

    with db() as conn, conn.cursor() as cur:
        # FAQ — best signal (curated)
        cur.execute("""
            SELECT question, answer, tags,
                   1 - (embedding <=> %s::vector) AS sim
            FROM ai_faq_rag
            WHERE status='active'
              AND (project=%s OR project='BOTH' OR %s='BOTH')
            ORDER BY embedding <=> %s::vector LIMIT %s
        """, (q_emb, proj_filter, proj_filter, q_emb, k_each))
        faq = [dict(r) for r in cur.fetchall()]

        # Site chunks — broader context
        cur.execute("""
            SELECT url, content, page_label,
                   1 - (embedding <=> %s::vector) AS sim
            FROM ai_site_rag
            WHERE (project=%s OR %s='BOTH')
            ORDER BY embedding <=> %s::vector LIMIT %s
        """, (q_emb, proj_filter, proj_filter, q_emb, k_each))
        site = [dict(r) for r in cur.fetchall()]

        # Program facts — exact source of truth (no embedding match, all returned)
        cur.execute("""
            SELECT project, program_code, name, age_min, age_max,
                   price_value, price_unit, schedule_text, duration_text,
                   description, link_url
            FROM ai_program_facts
            WHERE active = true
              AND (project=%s OR %s='BOTH')
            ORDER BY age_min
        """, (proj_filter, proj_filter))
        programs = [dict(r) for r in cur.fetchall()]

    return {"faq": faq, "site": site, "programs": programs}

# ───────────────────────── System prompt ───────────────────────────
SYSTEM_PROMPT = """Ты — консультант АйДаКемп (детский летний IT-лагерь, aidacamp.ru) и АйДаКодить (школа программирования, codims.ru).

Отвечаешь маме или папе, которые читают сайт.

ПРАВИЛА:
1. **Опирайся ТОЛЬКО на блок ДАННЫЕ** ниже. Никогда не выдумывай цены, даты, программы, возраст.
2. Если в ДАННЫХ нет ответа → честно: «Не уверен про это, оставьте телефон, мы перезвоним и точно ответим».
3. Тёплый, краткий тон (2-4 предложения максимум). Без формализма.
4. Не упоминай конкурентов. Не давай медицинских/педагогических советов.
5. Если человек проявляет интерес к записи — мягко предложи оставить телефон: «Оставьте телефон в форме ниже, мы перезвоним сегодня и забронируем место».
6. На прощание не пиши длинных reassurance — просто ответь и остановись.
7. Если в блоке КОНТЕКСТ СЕССИИ указан выбранный возраст или программа — упомяни это естественно
   («Вижу, вы смотрите на Python для детей 10–12 лет — ...»). Но если человек говорит, что ошибся
   или хочет изменить фильтр — спокойно прими и отвечай уже без привязки к старому выбору.

ФОРМАТ: обычный текст, без markdown."""

# ─── Helpers ───────────────────────────────────────────────────────
_PAGE_LABELS = {
    "/python":       "Python-курс",
    "/scratch":      "Scratch-курс",
    "/minecraft":    "Minecraft-курс",
    "/camp":         "Лагерь",
    "/lager":        "Лагерь",
    "/prices":       "Цены",
    "/price":        "Цены",
    "/schedule":     "Расписание",
    "/contacts":     "Контакты",
    "/":             "Главная",
}

def _page_label(path: str) -> str:
    for key, label in _PAGE_LABELS.items():
        if path.rstrip("/").endswith(key.rstrip("/")):
            return label
    return path.rstrip("/").split("/")[-1] or "Главная"

def _utm_label(utm_source: str | None, utm_campaign: str | None) -> str | None:
    parts = []
    if utm_source:    parts.append(f"источник={utm_source}")
    if utm_campaign:  parts.append(f"кампания={utm_campaign}")
    return ", ".join(parts) if parts else None


def build_user_msg(question: str, ctx: dict, req=None) -> str:
    parts = [f"ВОПРОС МАМЫ: «{question}»\n"]

    # ── Блок: контекст сессии (Level 1 + 2) ─────────────────────────
    if req is not None:
        session_lines = []

        # Текущая страница
        if req.current_url:
            session_lines.append(f"• Текущая страница: {req.current_url}")

        # Откуда пришёл
        if req.referrer and "google" not in req.referrer.lower():
            session_lines.append(f"• Пришёл с: {req.referrer}")
        utm = _utm_label(req.utm_source, req.utm_campaign)
        if utm:
            session_lines.append(f"• Реклама: {utm}")

        # История навигации за сессию
        if req.page_path and len(req.page_path) > 1:
            breadcrumb = " → ".join(_page_label(p) for p in req.page_path[-6:])
            session_lines.append(f"• Маршрут по сайту: {breadcrumb}")

        # Время на сайте
        if req.time_on_site_sec and req.time_on_site_sec > 30:
            mins = req.time_on_site_sec // 60
            secs = req.time_on_site_sec % 60
            tstr = f"{mins} мин {secs} сек" if mins else f"{secs} сек"
            session_lines.append(f"• Время на сайте: {tstr}")

        # Виджет-стейт (выбранный возраст, программа, и т.д.)
        if req.page_state:
            ps = req.page_state
            if ps.get("selected_age"):
                session_lines.append(f"• Выбранный возраст в фильтре: {ps['selected_age']} лет")
            if ps.get("selected_program"):
                session_lines.append(f"• Выбранная программа в фильтре: {ps['selected_program']}")
            if ps.get("selected_shift"):
                session_lines.append(f"• Выбранная смена: {ps['selected_shift']}")
            # Любые другие произвольные ключи
            for k, v in ps.items():
                if k not in ("selected_age", "selected_program", "selected_shift") and v:
                    session_lines.append(f"• {k}: {v}")

        if session_lines:
            parts.append("=== КОНТЕКСТ СЕССИИ (используй чтобы персонализировать ответ) ===")
            parts.extend(session_lines)
            parts.append("")

    parts.append("=== ДАННЫЕ (только из них берёшь факты) ===\n")

    if ctx["programs"]:
        parts.append("ПРОГРАММЫ И ЦЕНЫ:")
        for p in ctx["programs"]:
            line = f"• {p['name']} ({p['project']}) — возраст {p['age_min']}-{p['age_max']}"
            if p['price_value']: line += f", цена {int(p['price_value'])}₽ {p['price_unit'] or ''}"
            if p['schedule_text']: line += f", расписание: {p['schedule_text']}"
            if p['link_url']: line += f"\n  ссылка: {p['link_url']}"
            parts.append(line)

    if ctx["faq"]:
        parts.append("\nПОХОЖИЕ FAQ:")
        for f in ctx["faq"]:
            if f["sim"] < RAG_THRESHOLD: continue
            parts.append(f"  Q: {f['question']}\n  A: {f['answer']}")

    if ctx["site"]:
        parts.append("\nВЫДЕРЖКИ С САЙТА:")
        for s in ctx["site"]:
            if s["sim"] < RAG_THRESHOLD - 0.05: continue
            snippet = s["content"][:300].replace("\n", " ")
            parts.append(f"  [{s['page_label']}]: {snippet}…")

    parts.append("\nОтветь на вопрос мамы коротко, опираясь ТОЛЬКО на ДАННЫЕ выше.")
    return "\n".join(parts)

# ───────────────────────── API ─────────────────────────────────────
class AskRequest(BaseModel):
    session_id:       Optional[str]        = None
    question:         str
    project:          str                  = "BOTH"   # CAMP | KODIT | BOTH
    history:          Optional[List[dict]] = None     # [{"role":"user/assistant","content":"..."}]

    # ── Level 1: страница и источник трафика ──────────────────────
    current_url:      Optional[str]        = None     # window.location.href
    referrer:         Optional[str]        = None     # document.referrer
    utm_source:       Optional[str]        = None     # ?utm_source=
    utm_campaign:     Optional[str]        = None     # ?utm_campaign=

    # ── Level 2: сессионное поведение ─────────────────────────────
    page_path:        Optional[List[str]]  = None     # история URL внутри сессии
    time_on_site_sec: Optional[int]        = None     # сколько секунд на сайте

    # ── Виджет-стейт: что пользователь уже выбрал на странице ─────
    page_state:       Optional[dict]       = None     # {"selected_age": 11, "selected_program": "Python PRO"}

class AskResponse(BaseModel):
    session_id: str
    answer: str
    suggest_lead: bool         # True если бот не уверен → frontend показывает форму
    sources: List[dict]        # для прозрачности (можно скрыть на фронте)

class LeadRequest(BaseModel):
    session_id: str
    phone: str
    name: Optional[str] = None
    project_interest: Optional[str] = None
    note: Optional[str] = None

@app.get("/api/ask/health")
def health():
    return {"ok": True, "ts": datetime.utcnow().isoformat()}

@app.post("/api/ask", response_model=AskResponse)
def ask(req: AskRequest):
    sid = req.session_id or str(uuid.uuid4())
    try:
        ctx = retrieve_context(req.question, req.project)
    except Exception as e:
        log.error(f"retrieve err: {e}")
        raise HTTPException(500, "retrieval failed")

    # Determine confidence: if best FAQ sim < threshold AND no relevant programs → suggest lead
    best_faq_sim = max((f["sim"] for f in ctx["faq"]), default=0)
    best_site_sim = max((s["sim"] for s in ctx["site"]), default=0)
    suggest_lead = best_faq_sim < RAG_THRESHOLD and best_site_sim < RAG_THRESHOLD - 0.05

    # Compose chat
    msgs = [{"role": "system", "content": SYSTEM_PROMPT}]
    if req.history:
        msgs += req.history[-6:]  # last 3 turns
    msgs.append({"role": "user", "content": build_user_msg(req.question, ctx, req)})

    try:
        answer = llm(msgs)
    except Exception as e:
        log.error(f"llm err: {e}")
        answer = "Сейчас не могу ответить. Оставьте, пожалуйста, телефон — менеджер перезвонит и ответит на все вопросы."
        suggest_lead = True

    # Logging
    try:
        with db() as conn, conn.cursor() as cur:
            cur.execute("""
                INSERT INTO ai_ask_sessions
                  (session_id, user_q, bot_a, rag_hits, led_to_lead)
                VALUES (%s, %s, %s, %s::jsonb, false)
            """, (sid, req.question, answer,
                  json.dumps({
                      "faq_top_sim": best_faq_sim,
                      "site_top_sim": best_site_sim,
                      "n_faq": len(ctx["faq"]),
                      "n_site": len(ctx["site"]),
                      # Level 1
                      "url":          req.current_url,
                      "referrer":     req.referrer,
                      "utm_source":   req.utm_source,
                      "utm_campaign": req.utm_campaign,
                      # Level 2
                      "page_path":        req.page_path,
                      "time_on_site_sec": req.time_on_site_sec,
                      # Widget state
                      "page_state":   req.page_state,
                  })))
            conn.commit()
    except Exception as e:
        log.warning(f"log err: {e}")

    return AskResponse(
        session_id=sid,
        answer=answer,
        suggest_lead=suggest_lead,
        sources=[
            {"type": "faq", "q": f["question"], "sim": round(f["sim"], 2)}
            for f in ctx["faq"][:3] if f["sim"] >= RAG_THRESHOLD
        ] + [
            {"type": "site", "url": s["url"], "sim": round(s["sim"], 2)}
            for s in ctx["site"][:2] if s["sim"] >= RAG_THRESHOLD - 0.05
        ],
    )

@app.post("/api/ask/lead")
def lead(req: LeadRequest):
    """Save lead → ai_dialogs + ai_customers (CLS picks it up tomorrow morning)."""
    phone_norm = "".join(ch for ch in req.phone if ch.isdigit())
    if len(phone_norm) < 10:
        raise HTTPException(400, "phone too short")

    project_branch = {"CAMP": 5, "KODIT": 1}.get(req.project_interest, 1)

    with db() as conn, conn.cursor() as cur:
        # Find/create customer
        cur.execute("""
            SELECT id FROM ai_customers
            WHERE regexp_replace(phone,'[^0-9]','','g') = %s
            LIMIT 1
        """, (phone_norm,))
        existing = cur.fetchone()
        if existing:
            customer_id = existing["id"]
        else:
            cur.execute("""
                INSERT INTO ai_customers
                  (project, branch_id, phone, name, archive_status, raw)
                VALUES (%s, %s, %s, %s, 'lead', %s::jsonb)
                RETURNING id
            """, ("ask_widget", project_branch, req.phone, req.name or "Лид с сайта",
                  json.dumps({"source": "ask_widget", "note": req.note})))
            customer_id = cur.fetchone()["id"]

        # Log conversation as a dialog turn
        # Pull session q/a pairs and merge into one transcript
        cur.execute("""
            SELECT user_q, bot_a, ts FROM ai_ask_sessions
            WHERE session_id=%s ORDER BY ts ASC
        """, (req.session_id,))
        turns = cur.fetchall()
        transcript = "\n".join(f"Клиент: {t['user_q']}\nБот: {t['bot_a']}" for t in turns)

        cur.execute("""
            INSERT INTO ai_dialogs
              (source, peer_id, mid, ts, direction, text, customer_id, processed)
            VALUES
              ('ask_widget', %s, %s, NOW(), 'in', %s, %s, false)
        """, (req.phone, f"ask_{req.session_id}", transcript[:5000], customer_id))

        # Mark sessions as converted
        cur.execute("""
            UPDATE ai_ask_sessions SET led_to_lead = true, customer_id = %s
            WHERE session_id = %s
        """, (customer_id, req.session_id))

        conn.commit()
    log.info(f"new lead: customer_id={customer_id} phone={req.phone}")
    return {"ok": True, "customer_id": customer_id}

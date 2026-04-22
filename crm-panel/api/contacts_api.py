#!/usr/bin/env python3
"""CRM Sales Panel API — scoring + personalized messages + flag context."""
from http.server import BaseHTTPRequestHandler, HTTPServer
import json, csv, os, re, functools
import psycopg2

# ── Load camp-enrolled exclusion list ─────────────────────────────────────────
_ENROLLED_PATH = os.path.join(os.path.dirname(__file__), 'camp_enrolled.json')
try:
    CAMP_ENROLLED_IDS = set(json.load(open(_ENROLLED_PATH))['enrolled_ids'])
except Exception:
    CAMP_ENROLLED_IDS = set()

_CTX_PATH = os.path.join(os.path.dirname(__file__), 'contexts_cache.json')

def _load_contexts_from_pg():
    """Load contexts from PostgreSQL crm_contact_contexts table."""
    try:
        conn = psycopg2.connect("dbname=aidacamp user=postgres")
        cur  = conn.cursor()
        cur.execute("SELECT customer_id, raw_context FROM crm_contact_contexts")
        result = {}
        for cid, raw in cur.fetchall():
            if raw:
                result[str(cid)] = raw
        cur.close(); conn.close()
        return result
    except Exception:
        return {}

try:
    CONTEXTS = _load_contexts_from_pg()
    if not CONTEXTS:  # fallback to JSON if DB empty
        CONTEXTS = json.load(open(_CTX_PATH, encoding='utf-8'))
except Exception:
    try:
        CONTEXTS = json.load(open(_CTX_PATH, encoding='utf-8'))
    except Exception:
        CONTEXTS = {}

# ── Russian first names registry ─────────────────────────────────────────────
RU_NAMES = {n.lower() for n in """
Александр Александра Алексей Алина Алёна Алевтина Альбина Анастасия Андрей
Анна Антон Артём Артем Артур Валентин Валентина Валерий Валерия Василий
Вера Виктор Виктория Виталий Владимир Владислав Вячеслав Галина Григорий
Дарья Денис Дмитрий Екатерина Елена Елизавета Иван Игорь Илья Ирина
Кирилл Константин Кристина Ксения Лариса Лев Леонид Людмила Маргарита
Марина Мария Максим Михаил Надежда Наталья Николай Никита Нина Оксана
Олег Ольга Павел Пётр Пол Роберт Роман Светлана Семён Сергей Софья
Степан Тамара Татьяна Тимур Уляна Фёдор Юлия Юрий Яна Ярослав
Алиса Богдан Вадим Давид Даниил Диана Доминик Захар Зоя Злата
Лидия Лиза Лука Матвей Милана Мирослава Никита Полина Регина Руслан
Руслана Савелий Тимофей Эльдар Эмилия Эмма Эрик Юля Яков
Аделина Азиз Айгуль Акира Алибек Аня Аслан Борис Вика Влад
Гена Глеб Гриша Даша Дима Женя Зина Катя Клим Коля Костя Лёша
Маша Миша Митя Надя Наташа Оля Паша Петя Рома Саша Серёжа Соня
Стас Таня Тёма Федя Юра
Таисия Таисья Агния Агата Аглая Аделя Аза Аида Аиша Акмарал Алена Алёна
Алибек Алия Алма Аля Амина Амира Анфиса Аня Арина Арман Аселя Аслан
Астрид Аурика Аяна Бекзод Богдан Борис Бьянка Валерий Вальтер Варвара
Василиса Вика Виктор Вилена Влада Вова Гала Геннадий Георгий Герман
Глафира Гоша Гриша Гульнара Давид Данил Данила Данила Даниэль Даша
Дина Дмитрий Доминик Ева Евгений Евгения Егор Екатерина Жанна Захар
Зинаида Злата Зоя Ибрагим Иван Ида Илья Инна Иосиф Ирина Ислам
Карим Карина Кирилл Клара Клим Коля Константин Корнелий Кристина
Ксения Кузьма Кулаш Лариса Лейла Лена Леонид Леонора Лера Лида
Лиза Лиля Лина Лука Луна Люба Людмила Лёша Мадина Майя Маргарита
Марианна Марина Марта Марьяна Матвей Милана Милена Миля Миша Митя
Мия Надя Настя Наташа Никита Никита Нина Нур Оля Павел Паша
Полина Регина Рита Роберт Рома Руслан Саша Света Серёжа Слава
Соня Стёпа Суворов Таисия Тамара Тата Тимофей Тимур Ульяна Устин
Федя Феликс Филипп Харитон Христина Яна Ярослав Ясмин Ясмина
""".split()}

def is_real_name(word: str) -> bool:
    if not word or len(word) < 2:
        return False
    if not word[0].isupper():
        return False
    if re.search(r"[0-9().!?]", word):
        return False
    return word.lower() in RU_NAMES


CSV_PATH = os.environ.get("CONTACTS_CSV", "/tmp/reactivation_v4.csv")
CRM_BASE = "https://codim.s20.online/company/5"

FLAG_DESCRIPTIONS = {
    "hot":        ("Горячий интерес",         "В переписке: «хочу записать», «интересует», «запишите» — клиент сам двигался к покупке"),
    "price":      ("Ценовой барьер",           "Упоминал стоимость: «дорого», «скидка», «цена». Хорошо реагирует на раннее бронирование"),
    "killer":     ("Невосстановимая причина",  "Переехал за рубеж, ошибся номером, пометил как спам или умер. Контакт, вероятно, нерабочий"),
    "dist":       ("Барьер — расстояние",      "Ссылался на удалённость. Актуально если появился трансфер или онлайн-формат"),
    "competitor": ("Ушёл к конкурентам",       "Упоминал другие лагери или школы. Контактировать только с явным преимуществом"),
    "camp":       ("Интерес к лагерю",         "Конкретно спрашивал про лагерь (не школу). Оффер — про летние смены"),
    "lost":       ("Отказался от лагеря",      "«Не интересно», «передумали», «ребёнок не хочет» — явный отказ в переписке. Подходить только через 6+ мес с новым поводом"),
    "sched":      ("Проблема с расписанием",   "Расписание или время не подходило. Уточнить актуальное время — возможно, сейчас удобнее"),
}

# ── Archetype classification ──────────────────────────────────────────────────
ARCHETYPE_PATTERNS = {
    'investor': {
        'label': 'Инвестор в будущее',
        'keywords': ['навык','программ','результат','научит','профессия','будущее','карьер',
                     'портфолио','проект','создаст','разработ','it','айти','хакатон'],
        'approach': 'Говорите о конкретных результатах и навыках. Что ребёнок умеет делать ПОСЛЕ лагеря. Цифры, проекты, портфолио.'
    },
    'problem_solver': {
        'label': 'Решатель проблем',
        'keywords': ['телефон','сидит','нечем','скучает','каникул','лето','занять','гаджет',
                     'игры','зависим','время','пристроить','некуда'],
        'approach': 'Лагерь = решение конкретной проблемы. Не «развитие», а «ребёнок занят полезным делом всё лето». Подчеркните структуру дня и занятость.'
    },
    'social': {
        'label': 'Социальный',
        'keywords': ['друз','компани','коллектив','общени','дети','ребят','команд',
                     'познаком','подружит','вместе','атмосфер'],
        'approach': 'Продавайте атмосферу и сообщество. Фото с мероприятий, отзывы детей, «здесь находят настоящих друзей».'
    },
    'economist': {
        'label': 'Экономный',
        'keywords': ['дорог','цен','скидк','рассрочк','дешевл','сколько стоит','бюджет',
                     'акци','промо','выгод'],
        'approach': 'Сначала ценность — потом цена. Раннее бронирование, рассрочка, сравнение с альтернативами (репетитор + кружки выходят дороже).'
    },
}

def classify_archetype(r):
    """Classify parent archetype from flags + comment text."""
    text = (r.get('last_comment') or '').lower()
    scores = {k: 0 for k in ARCHETYPE_PATTERNS}

    # Keyword matching in last_comment
    for arch, meta in ARCHETYPE_PATTERNS.items():
        for kw in meta['keywords']:
            if kw in text:
                scores[arch] += 2

    # Flag signals
    if flag(r, 'f_price'):       scores['economist']      += 4
    if flag(r, 'f_hot'):         scores['problem_solver'] += 2
    if flag(r, 'f_camp'):        scores['problem_solver'] += 3
    if flag(r, 'f_killer'):      scores['problem_solver'] -= 2
    n_ev = to_int(r, 'n_events')
    if n_ev >= 30:               scores['investor']       += 3  # long engagement = invested parent
    if n_ev >= 10:               scores['investor']       += 1

    # Detect primary + secondary
    ranked = sorted(scores.items(), key=lambda x: -x[1])
    primary   = ranked[0][0]  if ranked[0][1]  > 0 else 'investor'  # default
    secondary = ranked[1][0]  if len(ranked) > 1 and ranked[1][1] > 0 else None

    # Build signals list for manager explanation
    signals = []
    for arch, meta in ARCHETYPE_PATTERNS.items():
        found_kw = [kw for kw in meta['keywords'] if kw in text]
        if found_kw:
            signals.append(f"В тексте: «{found_kw[0]}»")
    if flag(r, 'f_price'):  signals.append('Ценовой барьер в переписке')
    if flag(r, 'f_camp'):   signals.append('Интересовался именно лагерем')
    if n_ev >= 30:          signals.append(f'{n_ev} касаний — глубоко вовлечён')

    return {
        'primary':   {'key': primary,   'label': ARCHETYPE_PATTERNS[primary]['label'],
                      'approach': ARCHETYPE_PATTERNS[primary]['approach']},
        'secondary': {'key': secondary, 'label': ARCHETYPE_PATTERNS[secondary]['label'],
                      'approach': ARCHETYPE_PATTERNS[secondary]['approach']} if secondary else None,
        'signals':   signals[:4],
    }

def activity_level(r):
    """Green/yellow/orange/cold based on recency of last INCOMING message."""
    days_in  = to_int(r, 'days_since_in',  9999)
    days_any = to_int(r, 'days_since',      9999)
    in_wa    = to_int(r, 'in_wa')
    in_tg    = to_int(r, 'in_tg')
    has_incoming = (in_wa + in_tg) > 0

    if not has_incoming:
        return {'level': 'outbound', 'color': '#8e8e93', 'label': 'Только исходящие',
                'desc': 'Клиент сам никогда не писал — только мы выходили на связь. Входящего интереса нет.'}
    if days_in < 14:
        return {'level': 'hot',     'color': '#30d158', 'label': 'Активный',
                'desc': f'Писал нам {days_in} дн. назад — максимально тёплый. Высокая вероятность ответа.'}
    if days_in < 60:
        return {'level': 'warm',    'color': '#ff9f0a', 'label': 'Тёплый',
                'desc': f'Последнее входящее {days_in} дн. назад. Помнит о нас, но нужен повод.'}
    if days_in < 180:
        return {'level': 'cooling', 'color': '#af52de', 'label': 'Остывает',
                'desc': f'{days_in} дн. без входящих. Интерес был — нужен сильный повод для возврата.'}
    return {'level': 'cold',  'color': '#ff3b30', 'label': 'Холодный',
            'desc': f'{days_in} дн. без входящих. Высокий риск — контактировать только с очень конкретным поводом.'}


def flag(r, k):
    v = str(r.get(k, '') or '').strip().lower()
    return v in ('1', 'true', 'yes')

def to_int(r, k, default=0):
    try: return int(r.get(k) or default)
    except: return default

# ── Phrases in last_comment that signal aggressive / impossible clients ──────
AGGRESSIVE_PHRASES = ["сумасш", "агресс", "грубит", "хамит", "не работать", "не связываться", "не звонить", "не писать", "никогда больше", "больной не", "в чёрный", "в черный", "черный список", "чёрный список", "стоп-лист", "стоплист", "психован", "неадекват", "ненормальн", "мужик", "тест"]
REJECTION_PHRASES  = ["ребёнок не хочет", "ребенок не хочет", "не хочет идти", "не интересно",
                      "передумали", "отказались", "записались в другой", "перешли в другой",
                      "не будем", "не пойдём", "не пойдем", "отказ"]

def _comment_has(r, phrases):
    """True if last_comment OR name contains any of the phrases (case-insensitive)."""
    comment = (r.get("last_comment") or "").lower()
    name    = (r.get("name") or "").lower()
    return any(p in comment or p in name for p in phrases)

def should_exclude(r):
    """Hard exclude: enrolled in camp, blacklist, ghosts, explicit refusals."""
    # Already enrolled in a 2026 summer смена
    if r.get("customer_id", "") in CAMP_ENROLLED_IDS:
        return True, "уже записан в смену"
    # Wrong number / moved abroad / dead / blacklist
    if flag(r, "f_killer"):
        return True, "невосстановимая причина"
    # Aggressive — detected in comment OR name OR enriched context status
    ctx_status = (CONTEXTS.get(r.get("customer_id", ""), {}) or {}).get("status", "")
    if _comment_has(r, AGGRESSIVE_PHRASES) or ctx_status == "aggressive":
        return True, "агрессивный клиент"
    # Explicit refusal — flag OR detected in comment/name OR enriched context
    if flag(r, "f_lost") or _comment_has(r, REJECTION_PHRASES) or ctx_status in ("rejected", "lost"):
        return True, "явный отказ"
    # Ghost: we wrote, they never replied, tiny convo
    in_total = to_int(r, "in_wa") + to_int(r, "in_tg")
    n_ev = to_int(r, "n_events")
    if in_total == 0 and n_ev <= 3:
        return True, "ноль реакций"
    # Too many unanswered — frozen territory
    ctx = CONTEXTS.get(r.get("customer_id", ""), {})
    ua = int(ctx.get("unanswered_count", 0) or 0)
    if ua >= 6:
        return True, "заморожен (6+ без ответа)"
    # Duplicate contacts (reject_id=7 in AlfaCRM)
    if str(r.get("reject_id", "")) == "7":
        return True, "дубликат"
    return False, ""

def build_reaction_summary(r):
    """Human-readable summary of conversation history for manager note."""
    in_wa  = to_int(r, "in_wa")
    out_wa = to_int(r, "out_wa")
    in_tg  = to_int(r, "in_tg")
    out_tg = to_int(r, "out_tg")
    in_total  = in_wa + in_tg
    out_total = out_wa + out_tg
    n_ev      = to_int(r, "n_events")
    days_in   = to_int(r, "days_since_in", 9999)
    safety    = r.get("contact_safety", "")

    # Reaction quality
    if safety == "SAFE_INCOMING":
        if in_total >= 10:
            quality = f"Активный диалог — клиент сам много писал ({in_total} вх.)"
        elif in_total >= 3:
            quality = f"Клиент писал первым, был диалог ({in_total} вх. / {out_total} исх.)"
        else:
            quality = "Клиент написал первым, но переписка короткая"
    else:
        if in_total == 0:
            quality = "Клиент ни разу не ответил на наши сообщения"
        elif in_total <= 2:
            quality = f"Ответил {in_total} раз — минимальный контакт"
        elif in_total <= 8:
            quality = f"Отвечал: {in_total} вх. из {n_ev} касаний"
        else:
            quality = f"Активно общался: {in_total} вх. / {out_total} исх."

    # Channels
    ch_parts = []
    if in_wa + out_wa > 0: ch_parts.append(f"WA {in_wa}↓{out_wa}↑")
    if in_tg + out_tg > 0: ch_parts.append(f"TG {in_tg}↓{out_tg}↑")

    # Last reply
    recency = f"последний ответ {days_in} дн. назад" if days_in < 9999 else "входящих не было"

    return {
        "quality":  quality,
        "channels": " / ".join(ch_parts) if ch_parts else "—",
        "recency":  recency,
        "in_total": in_total,
    }


def score_contact(r):
    s = 0
    safety = r.get("contact_safety", "")
    if safety == "SAFE_INCOMING":      s += 60
    elif safety == "WARM_OUTGOING":    s += 40
    elif safety == "RISKY_FRESH_LEAD": s += 20

    n_ev = to_int(r, "n_events")
    if n_ev >= 50: s += 20
    elif n_ev >= 10: s += 12
    elif n_ev >= 3: s += 6

    days_in = to_int(r, "days_since_in", 9999)
    if days_in < 14:   s += 20
    elif days_in < 30: s += 14
    elif days_in < 90: s += 7

    if flag(r, "f_hot"):        s += 12
    if flag(r, "f_camp"):       s += 5
    if flag(r, "f_killer"):             s -= 25
    if _comment_has(r, AGGRESSIVE_PHRASES): s -= 30
    if flag(r, "f_dist"):               s -= 10
    if flag(r, "f_price"):              s -= 5
    if flag(r, "f_competitor"):         s -= 15
    if flag(r, "f_lost") or _comment_has(r, REJECTION_PHRASES): s -= 20
    if flag(r, "f_sched"):              s -= 5
    if to_int(r, "days_since", 0) > 730: s -= 10
    return max(0, min(100, s))

def build_message(r):
    # Find real first name by checking against Russian names registry
    all_words = (r.get("name") or "").strip().split()
    first = next((w for w in all_words if is_real_name(w)), "")
    hi = f"Привет{', ' + first + '!' if first else '!'}"

    n_ev   = to_int(r, "n_events")
    f_p    = flag(r, "f_price")
    f_hot  = flag(r, "f_hot")
    f_dist = flag(r, "f_dist")
    f_kill = flag(r, "f_killer")
    f_camp = flag(r, "f_camp")
    days_in = to_int(r, "days_since_in", 9999)
    safety  = r.get("contact_safety", "")

    if f_kill:
        return (f"{hi} Давно не общались. Знаю, в прошлый раз что-то не сложилось — но этим летом у нас новые смены и форматы. Может, расскажу коротко что изменилось?",
                "Был жёсткий отказ → мягкое «что изменилось», без давления")
    if n_ev >= 50:
        return (f"{hi} У нас с вами долгая история — это очень ценно. Открываем лето 2026, хочу предложить место одним из первых. Когда удобно поговорить?",
                "Очень активный клиент (50+ касаний) → VIP-подход")
    if n_ev >= 10:
        return (f"{hi} Помним вашего ребёнка — были у нас. Открываем смены на июль-август — есть отличные варианты. Интересно?",
                "Активный клиент (10+ касаний) → апелляция к истории")
    if f_p:
        return (f"{hi} У нас сейчас действует раннее бронирование — можно зафиксировать место по лучшей цене до 1 июня. Рассказать подробнее?",
                "Был ценовой барьер → акцент на раннем бронировании")
    if f_hot and days_in < 60:
        return (f"{hi} Вы недавно интересовались лагерем — как раз открылись последние места на июль. Бронируем?",
                "Горячий интерес + свежее обращение → срочность")
    if f_dist:
        return (f"{hi} Знаю, раньше вопрос был в расстоянии. Теперь организуем трансфер от метро — может, это меняет картину?",
                "Барьер по расстоянию → апелляция к решённой проблеме")
    if f_camp:
        return (f"{hi} Вы спрашивали про лагерь — лето 2026 открыто, смены на выбор от 7 до 21 дня. Подобрать подходящую?",
                "Интерес к лагерю → конкретный оффер по сменам")
    if safety == "WARM_OUTGOING":
        return (f"{hi} Давно не писали! Открываем новый сезон, много всего нового. Интересно узнать?",
                "Исходящая коммуникация ранее → лёгкий реэнгейдж")
    return (f"{hi} Этим летом открываем IT-лагерь АйДаКемп — программирование, роботы, игры. Расскажу?",
            "Нет явных данных → общий тёплый оффер")


def build_drip_steps(r, ctx):
    """3-step drip sequence for silent contacts who never replied."""
    all_words = (r.get("name") or "").strip().split()
    first = next((w for w in all_words if is_real_name(w)), "")
    hi = f"Привет{', ' + first + '!' if first else '!'}"

    f_p    = flag(r, "f_price")
    f_dist = flag(r, "f_dist")
    f_camp = flag(r, "f_camp")
    fears  = ctx.get("fears", [])
    signals = ctx.get("signals", [])

    # Personalise based on what we know from conversation
    price_fear   = f_p or "Цена / стоимость" in fears
    dist_fear    = f_dist or "Удалённость / логистика" in fears
    camp_signal  = f_camp or "Интерес к записи" in signals

    step1_why = "Короткое личное касание — вопрос про ребёнка без продажи"
    step2_why = "Социальное доказательство + дедлайн — создаём ощущение движения"
    step3_why = "Финальное сообщение — ультранизкий барьер входа, просто «да»"

    if price_fear:
        step1 = (f"{hi} Давно не общались. Планируете куда-то ребёнка на лето?",
                 step1_why)
        step2 = (f"{hi} Многие родители бронируют лагерь сейчас — до 1 июня действует цена раннего бронирования, потом дороже. Рассказать детали?",
                 step2_why)
    elif dist_fear:
        step1 = (f"{hi} Как дела? Лето уже на носу — куда планируете ребёнка?",
                 step1_why)
        step2 = (f"{hi} Кстати, у нас теперь есть трансфер от метро — может, это снимает вопрос с дорогой? Расскажу подробнее?",
                 step2_why)
    elif camp_signal:
        step1 = (f"{hi} Вы раньше интересовались лагерем — всё ещё актуально на этo лето?",
                 step1_why)
        step2 = (f"{hi} Смены июль-август почти заполнены. Осталось несколько мест — хотите я подберу под возраст вашего ребёнка?",
                 step2_why)
    else:
        step1 = (f"{hi} Куда планируете ребёнка на лето? Просто интересуюсь 🙂",
                 step1_why)
        step2 = (f"{hi} Открываем IT-лагерь АйДаКемп — программирование, роботы, игры. Уже записалось несколько ребят из вашего района. Места ещё есть — интересно?",
                 step2_why)

    step3 = (f"{hi} Напишу последний раз про лагерь — если неактуально, скажите и больше не буду 🙂 Если интересно — ответьте просто «да», и я вышлю программу и цены за 2 минуты.",
             step3_why)

    return [
        {"step": 1, "label": "Шаг 1 · Личный вопрос",       "message": step1[0], "why": step1[1]},
        {"step": 2, "label": "Шаг 2 · Соц. доказательство", "message": step2[0], "why": step2[1]},
        {"step": 3, "label": "Шаг 3 · Последний шанс",      "message": step3[0], "why": step3[1]},
    ]

def preferred_channels(r):
    in_wa  = to_int(r, "in_wa")
    out_wa = to_int(r, "out_wa")
    in_tg  = to_int(r, "in_tg")
    out_tg = to_int(r, "out_tg")
    has_wa = (in_wa + out_wa) > 0
    has_tg = (in_tg + out_tg) > 0
    pref   = r.get("last_in_channel", "")
    if not pref:
        pref = "wa" if has_wa else ("tg" if has_tg else "")
    return {"wa": has_wa, "tg": has_tg, "preferred": pref,
            "wa_count": in_wa + out_wa, "tg_count": in_tg + out_tg,
            "wa_in": in_wa, "wa_out": out_wa, "tg_in": in_tg, "tg_out": out_tg}


def build_manager_note(ctx, archetype):
    """Build HTML manager note using sentiment + entities from ctx."""
    if not ctx:
        return ""
    parts = []
    sentiment = ctx.get("sentiment")
    if sentiment:
        icons = {"positive": "🎯", "hesitant": "🤔", "negative": "⚠️",
                 "cancelled": "🚫", "neutral": "💬"}
        icon = icons.get(sentiment.get("trend", "neutral"), "💬")
        mood = sentiment.get("last_client_mood", "")
        parts.append(f"<b>{icon} {mood}</b>")
    entities = ctx.get("entities", {})
    persons = entities.get("persons", [])
    if persons:
        parts.append(f"👦 Ребёнок: {persons[0]}")
    quotes = ctx.get("quotes", {})
    for qtype, label in [("cancel", "❌ Отмена"), ("price", "💰 Цена"),
                          ("hesitation", "🤔 Сомнение"), ("interest", "🎯 Интерес")]:
        qlist = quotes.get(qtype, [])
        if qlist:
            parts.append(f'{label}: <i>{qlist[0]}</i>')
    return "<br>".join(parts)

def _load_rows_from_pg():
    """Load contact rows from PostgreSQL, mapped to CSV-compatible dict format."""
    conn = psycopg2.connect("dbname=aidacamp user=postgres")
    cur  = conn.cursor()
    cur.execute("""
        SELECT customer_id, name, phone, status, contact_safety, decision,
               preferred_channel, last_in_channel,
               to_char(last_in_date,'YYYY-MM-DD'), days_since_in,
               wa_accounts, branch,
               to_char(paid_till,'YYYY-MM-DD'), to_char(last_attend,'YYYY-MM-DD'),
               reject_id, n_events, n_comm,
               in_tg, out_tg, in_wa, out_wa,
               to_char(last_date,'YYYY-MM-DD'), days_since, reject_age_days,
               first_age, projected_age,
               f_hot, f_killer, f_price, f_dist, f_sched, f_camp,
               f_sick, f_competitor, f_lost, last_comment
        FROM crm_contacts
    """)
    cols = [
        'customer_id','name','phone','status','contact_safety','decision',
        'preferred_channel','last_in_channel','last_in_date','days_since_in',
        'wa_accounts','branch','paid_till','last_attend','reject_id',
        'n_events','n_comm','in_tg','out_tg','in_wa','out_wa',
        'last_date','days_since','reject_age_days','first_age','projected_age',
        'f_hot','f_killer','f_price','f_dist','f_sched','f_camp',
        'f_sick','f_competitor','f_lost','last_comment',
    ]
    rows = []
    for pg_row in cur.fetchall():
        r = {}
        for i, col in enumerate(cols):
            val = pg_row[i]
            # Boolean columns: convert to 'True'/'False' strings (matches CSV format)
            if isinstance(val, bool):
                r[col] = 'True' if val else 'False'
            elif val is None:
                r[col] = ''
            else:
                r[col] = str(val)
        rows.append(r)
    cur.close(); conn.close()
    return rows

def load_contacts():
    # Try PostgreSQL first, fall back to CSV
    try:
        rows = _load_rows_from_pg()
        if not rows:
            raise Exception("empty result from PG")
    except Exception:
        try:
            with open(CSV_PATH, encoding="utf-8-sig") as f:
                rows = list(csv.DictReader(f))
        except FileNotFoundError:
            return []

    result = []
    for r in rows:
        safety = r.get("contact_safety", "")
        if safety not in ("SAFE_INCOMING", "WARM_OUTGOING", "RISKY_FRESH_LEAD"):
            continue
        # Hard exclusion check
        excl, _ = should_exclude(r)
        if excl:
            continue

        msg, why = build_message(r)
        phone_raw = r.get("phone", "")
        phone_clean = "".join(c for c in phone_raw if c.isdigit())
        if phone_clean.startswith("8"): phone_clean = "7" + phone_clean[1:]
        is_tg_only = "111" in phone_clean or not phone_clean

        n_ev   = to_int(r, "n_events")
        n_comm = to_int(r, "n_comm")
        ch     = preferred_channels(r)

        # Enrich channels from CONTEXTS — CSV sometimes misses TG messages
        ctx_data = CONTEXTS.get(str(r.get("customer_id", "")), {})
        ctx_channels = ctx_data.get("channels", [])
        if "tg" in ctx_channels and not ch["tg"]:
            # CONTEXTS found TG traffic not in CSV — enable the peek button
            tg_from_ctx = ctx_data.get("out_count", 0) + ctx_data.get("in_count", 0)
            ch["tg"] = True
            if ch["tg_count"] == 0:
                ch["tg_count"] = tg_from_ctx or 1  # at least 1 so button enables
        if "wa" in ctx_channels and not ch["wa"] and ch["wa_count"] == 0:
            ch["wa"] = True
            ch["wa_count"] = ctx_data.get("msg_count", 1) or 1

        # Build active flags with context
        active_flags = []
        for fkey, fname in [("f_hot","hot"),("f_price","price"),("f_killer","killer"),
                             ("f_dist","dist"),("f_competitor","competitor"),("f_camp","camp")]:
            if flag(r, fkey):
                title, desc = FLAG_DESCRIPTIONS[fname]
                active_flags.append({"key": fname, "title": title, "desc": desc})

        # Interaction breakdown tooltip
        interactions = []
        if ch["wa_count"]: interactions.append(f"WA: {ch['wa_in']} входящих / {ch['wa_out']} исходящих")
        if ch["tg_count"]: interactions.append(f"TG: {ch['tg_in']} входящих / {ch['tg_out']} исходящих")
        if n_comm:         interactions.append(f"Комментариев CRM: {n_comm}")

        # Build score breakdown for tooltip
        sc = 0
        breakdown = []
        safety2 = r.get("contact_safety","")
        if safety2=="SAFE_INCOMING":      sc+=60; breakdown.append("Входящие (SAFE): +60")
        elif safety2=="WARM_OUTGOING":    sc+=40; breakdown.append("Исходящие (WARM): +40")
        elif safety2=="RISKY_FRESH_LEAD": sc+=20; breakdown.append("Свежий лид: +20")
        n_ev2=to_int(r,"n_events")
        if n_ev2>=50:   sc+=20; breakdown.append(f"{n_ev2} касаний: +20")
        elif n_ev2>=10: sc+=12; breakdown.append(f"{n_ev2} касаний: +12")
        elif n_ev2>=3:  sc+=6;  breakdown.append(f"{n_ev2} касаний: +6")
        di2=to_int(r,"days_since_in",9999)
        if di2<14:    sc+=20; breakdown.append(f"Писали {di2}д назад: +20")
        elif di2<30:  sc+=14; breakdown.append(f"Писали {di2}д назад: +14")
        elif di2<90:  sc+=7;  breakdown.append(f"Писали {di2}д назад: +7")
        if flag(r,"f_hot"):        sc+=12; breakdown.append("Горячий интерес: +12")
        if flag(r,"f_camp"):       sc+=5;  breakdown.append("Интерес к лагерю: +5")
        if flag(r,"f_killer"):     sc-=25; breakdown.append("Невосстановимая причина: −25")
        if flag(r,"f_dist"):       sc-=10; breakdown.append("Барьер расстояния: −10")
        if flag(r,"f_price"):      sc-=5;  breakdown.append("Ценовой барьер: −5")
        if flag(r,"f_competitor"): sc-=15; breakdown.append("Конкурент: −15")
        if flag(r,"f_lost"):       sc-=20; breakdown.append("Отказался от лагеря: −20")
        if flag(r,"f_sched"):      sc-=5;  breakdown.append("Расписание: −5")
        if to_int(r,"days_since",0)>730: sc-=10; breakdown.append("Давно (730+ дн): −10")

        # Add f_lost/f_sched to active_flags display
        for fkey2,fname2 in [("f_lost","lost"),("f_sched","sched")]:
            if flag(r, fkey2):
                title2, desc2 = FLAG_DESCRIPTIONS[fname2]
                active_flags.append({"key": fname2, "title": title2, "desc": desc2})

        archetype = classify_archetype(r)
        activity  = activity_level(r)
        reaction  = build_reaction_summary(r)

        # Build rich manager note using sentiment + entities from ctx
        ctx_data = CONTEXTS.get(r.get("customer_id",""), {})
        manager_note = build_manager_note(ctx_data, archetype)

        result.append({
            "id":            r.get("customer_id", ""),
            "name":          r.get("name", "Без имени"),
            "phone":         phone_clean,
            "phone_display": phone_raw,
            "is_tg_only":    is_tg_only,
            "safety":        safety,
            "score":         score_contact(r),
            "score_breakdown": breakdown,
            "n_events":      n_ev,
            "n_comm":        n_comm,
            "interactions":  interactions,
            "last_comment":  (r.get("last_comment") or "")[:200],
            "days_since":    r.get("days_since", ""),
            "days_since_in": r.get("days_since_in", ""),
            "wa_accounts":   r.get("wa_accounts", ""),
            "channels":      ch,
            "message":       msg,
            "why":           why,
            "active_flags":  active_flags,
            "crm_url":       f"{CRM_BASE}/customer/view?id={r.get('customer_id','')}",
            "archetype":     archetype,
            "activity":      activity,
            "manager_note":  manager_note,
            "reaction":      reaction,
            "unanswered_count": int(CONTEXTS.get(r.get("customer_id",""), {}).get("unanswered_count", 0) or 0),
            "context":       CONTEXTS.get(r.get("customer_id",""), {}),
            "drip_steps":    build_drip_steps(r, CONTEXTS.get(r.get("customer_id",""), {}))
                             if CONTEXTS.get(r.get("customer_id",""), {}).get("tone") == "silent" else None,
        })

    result.sort(key=lambda x: -x["score"])
    return result

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a): pass

    def send_json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", len(body))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, *")
        self.end_headers()

    def do_POST(self):
        p = self.path.split("?")[0]
        if p.startswith("/dialog/"):
            cid = p[len("/dialog/"):]
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
                messages = data.get("messages", [])
                reply = ai_sales_coach(cid, messages)
                self.send_json(200, {"reply": reply})
            except Exception as e:
                self.send_json(500, {"error": str(e)})
        elif p.startswith("/notes/"):
            cid = p[len("/notes/"):]
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
                note = str(data.get("note", ""))[:2000]
                ts   = data.get("ts", "")
                save_note_pg(cid, note, ts)
                self.send_json(200, {"ok": True})
            except Exception as e:
                self.send_json(400, {"error": str(e)})
        elif p == "/coach-log":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)
            try:
                data = json.loads(body)
                save_coach_log(data)
                self.send_json(200, {"ok": True})
            except Exception as e:
                self.send_json(400, {"error": str(e)})
        else:
            self.send_json(404, {"error": "not found"})

    def do_GET(self):
        p = self.path.split("?")[0]
        if p == "/contacts":
            contacts = load_contacts()
            groups = {k: [] for k in ("SAFE_INCOMING","WARM_OUTGOING","LAST_CHANCE","RISKY_FRESH_LEAD")}
            for c in contacts:
                ua = c.get("unanswered_count", 0)
                if ua >= 4:
                    groups["LAST_CHANCE"].append(c)
                else:
                    groups[c["safety"]].append(c)
            self.send_json(200, {"groups": groups, "total": len(contacts)})
        elif p.startswith("/conversation/"):
            cid = p[len("/conversation/"):]
            self.send_json(200, get_conversation(cid))
        elif p.startswith("/notes/"):
            cid = p[len("/notes/"):]
            self.send_json(200, {"note": load_note_pg(cid)})
        elif p == "/health":
            self.send_json(200, {"ok": True})
        else:
            self.send_json(404, {"error": "not found"})


# ── Conversation endpoint ─────────────────────────────────────────────────────

DB_DSN = "dbname=aidacamp user=postgres"

# phone10 → tg_chat_id  (loaded once)
@functools.lru_cache(maxsize=1)
def _tg_map():
    try:
        conn = psycopg2.connect(DB_DSN)
        cur  = conn.cursor()
        cur.execute("SELECT phone10, tg_chat_id FROM ai_contact_enrichment WHERE tg_chat_id IS NOT NULL")
        m = {r[0]: str(r[1]) for r in cur.fetchall()}
        cur.close(); conn.close()
        return m
    except Exception:
        return {}

def _fmt_ts(ts):
    """datetime → 'DD Mon YYYY HH:MM'"""
    if not ts: return ""
    MONTHS = {1:'янв',2:'фев',3:'мар',4:'апр',5:'май',6:'июн',
               7:'июл',8:'авг',9:'сен',10:'окт',11:'ноя',12:'дек'}
    return f"{ts.day} {MONTHS[ts.month]} {ts.year} {ts.hour:02d}:{ts.minute:02d}"

def get_conversation(customer_id):
    # look up phone from PostgreSQL first (CSV fallback)
    phone_raw = ""
    try:
        _conn = psycopg2.connect(DB_DSN)
        _cur  = _conn.cursor()
        _cur.execute("SELECT phone FROM crm_contacts WHERE customer_id = %s", (str(customer_id),))
        _row = _cur.fetchone()
        _cur.close(); _conn.close()
        if _row:
            phone_raw = _row[0] or ""
    except Exception:
        pass
    # fallback: try CSV if PG returned nothing
    if not phone_raw:
        try:
            with open(CSV_PATH, encoding="utf-8-sig") as f:
                rows = list(csv.DictReader(f))
            contact = next((r for r in rows if str(r.get("customer_id","")) == str(customer_id)), None)
            if contact:
                phone_raw = contact.get("phone", "")
        except Exception:
            pass
    if not phone_raw:
        return {"wa": [], "tg": []}

    phone_raw   = phone_raw
    phone_clean = "".join(c for c in phone_raw if c.isdigit())
    if phone_clean.startswith("8"):
        phone_clean = "7" + phone_clean[1:]
    if len(phone_clean) == 10:
        phone_clean = "7" + phone_clean
    phone10 = phone_clean[-10:] if len(phone_clean) >= 10 else ""

    result = {"wa": [], "tg": []}
    try:
        conn = psycopg2.connect(DB_DSN)
        cur  = conn.cursor()

        # ── WA ──
        if phone_clean and not ("111" in phone_clean):
            wa_peer = phone_clean + "@c.us"
            cur.execute("""
                SELECT direction, text, ts, sender_name
                FROM ai_dialogs
                WHERE peer_id = %s AND source NOT LIKE 'tg%%'
                  AND text IS NOT NULL AND text != ''
                ORDER BY ts ASC LIMIT 500
            """, (wa_peer,))
            rows = cur.fetchall()
            # Fallback: try customer_id lookup if phone lookup returned nothing
            if not rows and customer_id:
                cur.execute("""
                    SELECT direction, text, ts, sender_name
                    FROM ai_dialogs
                    WHERE customer_id = %s AND source NOT LIKE 'tg%%'
                      AND text IS NOT NULL AND text != ''
                    ORDER BY ts ASC LIMIT 500
                """, (int(customer_id),))
                rows = cur.fetchall()
            result["wa"] = [
                {"dir": r[0], "text": r[1], "ts": _fmt_ts(r[2]), "name": r[3] or ""}
                for r in rows
            ]

        # ── TG — look up via ai_tg_users (same as ETL dossier-v4) ──
        if phone10:
            # normalize: try bare 10-digit and with country code 7
            cur.execute("""
                SELECT DISTINCT peer_id FROM ai_tg_users
                WHERE phone IN (%s, %s, %s, %s)
                  AND peer_id ~ '^[0-9]+$'
                LIMIT 1
            """, (phone10, '7'+phone10, phone_clean, '8'+phone10))
            tg_row = cur.fetchone()
            if tg_row:
                tg_peer = tg_row[0]
                cur.execute("""
                    SELECT direction, text, ts, sender_name
                    FROM ai_dialogs
                    WHERE peer_id = %s AND source LIKE 'tg%%'
                      AND text IS NOT NULL AND text != ''
                    ORDER BY ts ASC LIMIT 500
                """, (tg_peer,))
                result["tg"] = [
                    {"dir": r[0], "text": r[1], "ts": _fmt_ts(r[2]), "name": r[3] or ""}
                    for r in cur.fetchall()
                ]

        cur.close(); conn.close()
    except Exception as e:
        result["error"] = str(e)

    return result


# ── Manager notes storage — PostgreSQL ───────────────────────────────────────
def load_note_pg(customer_id: str) -> dict:
    """Load a single note from PostgreSQL."""
    try:
        conn = psycopg2.connect(DB_DSN)
        cur  = conn.cursor()
        cur.execute(
            "SELECT note_text, updated_ts FROM crm_manager_notes WHERE customer_id = %s",
            (str(customer_id),)
        )
        row = cur.fetchone()
        cur.close(); conn.close()
        if row:
            return {"text": row[0], "ts": row[1] or ""}
        return {}
    except Exception:
        return {}

def save_note_pg(customer_id: str, text: str, ts: str):
    """Upsert a note in PostgreSQL."""
    conn = psycopg2.connect(DB_DSN)
    cur  = conn.cursor()
    cur.execute("""
        INSERT INTO crm_manager_notes (customer_id, note_text, updated_ts, updated_at)
        VALUES (%s, %s, %s, NOW())
        ON CONFLICT (customer_id) DO UPDATE
        SET note_text  = EXCLUDED.note_text,
            updated_ts = EXCLUDED.updated_ts,
            updated_at = NOW()
    """, (str(customer_id), text, ts))
    conn.commit()
    cur.close(); conn.close()

# ── Coach dialogue log — PostgreSQL ─────────────────────────────────────────
def save_coach_log(entry: dict):
    """Append a completed coach dialogue to PostgreSQL."""
    try:
        conn = psycopg2.connect(DB_DSN)
        cur  = conn.cursor()
        cur.execute("""
            INSERT INTO crm_coach_logs
                (customer_id, contact_name, summary, messages, logged_ts)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            str(entry.get("contact_id", "")),
            entry.get("contact_name", ""),
            entry.get("summary", ""),
            json.dumps(entry.get("messages", []), ensure_ascii=False),
            entry.get("ts", ""),
        ))
        conn.commit()
        cur.close(); conn.close()
    except Exception as e:
        # Fallback: log to file if DB unavailable
        import traceback
        with open('/tmp/coach_log_fallback.jsonl', 'a') as f:
            f.write(json.dumps(entry, ensure_ascii=False) + '\n')

# ── AI Sales Coach dialog ─────────────────────────────────────────────────────
import urllib.request as _ureq

def _get_contact_crm_data(contact_id: str) -> dict:
    """Fetch CRM fields for a single contact from crm_contacts."""
    try:
        conn = psycopg2.connect("dbname=aidacamp user=postgres")
        cur  = conn.cursor()
        cur.execute("""
            SELECT name, phone, last_comment,
                   f_hot, f_killer, f_price, f_dist, f_sched,
                   f_camp, f_sick, f_competitor, f_lost,
                   reject_id, days_since, n_events, contact_safety
            FROM crm_contacts WHERE customer_id = %s
        """, (str(contact_id),))
        row = cur.fetchone()
        conn.close()
        if not row:
            return {}
        keys = ['name','phone','last_comment',
                'f_hot','f_killer','f_price','f_dist','f_sched',
                'f_camp','f_sick','f_competitor','f_lost',
                'reject_id','days_since','n_events','contact_safety']
        return {k: (str(v) if v is not None else '') for k, v in zip(keys, row)}
    except Exception as e:
        return {}

def ai_sales_coach(contact_id: str, messages: list) -> str:
    """Call OpenRouter (Claude) to act as a sales coach for the manager dialog."""
    import os, json as _json
    from datetime import datetime

    or_key = os.environ.get("OPENROUTER_KEY", "")
    if not or_key:
        return "ИИ-коуч недоступен (нет OPENROUTER_KEY)."

    today = datetime.now().strftime("%d.%m.%Y")

    # ── CRM contact data ───────────────────────────────────────────────────────
    crm = _get_contact_crm_data(contact_id)
    crm_last_comment = crm.get("last_comment", "").strip()
    crm_name         = crm.get("name", "")
    crm_f_killer     = crm.get("f_killer","").lower() in ("true","1")
    crm_f_lost       = crm.get("f_lost","").lower() in ("true","1")
    crm_f_aggressive = any(p in crm_last_comment.lower() for p in
                           ["сумасш","агресс","грубит","хамит","не работать","психован","неадекват"])
    crm_f_rejection  = crm_f_lost or any(p in crm_last_comment.lower() for p in
                           ["ребёнок не хочет","ребенок не хочет","не хочет идти",
                            "не интересно","передумали","отказались"])

    # ── Aggregated context ────────────────────────────────────────────────────
    ctx = CONTEXTS.get(contact_id, {})
    tone_map = {"warm":"проявлял интерес","neutral":"нейтральный","cold":"холодный","silent":"молчит","hostile":"был резким"}
    tone_str  = tone_map.get(ctx.get("tone",""), ctx.get("tone","неизвестно"))
    flags_str = ", ".join(ctx.get("flags", [])) if ctx.get("flags") else "нет"
    ua        = ctx.get("unanswered_count", 0)
    last_msg  = ctx.get("last_client_msg", "")
    last_date = ctx.get("last_client_date", "")
    date_range= ctx.get("date_range", "")
    msg_count = ctx.get("msg_count", 0)
    in_count  = ctx.get("in_count", 0)
    wa_count  = ctx.get("wa_count", 0)
    tg_count  = ctx.get("tg_count", 0)

    # ── Pull real conversation (last 40 messages) ─────────────────────────────
    try:
        conv = get_conversation(contact_id)
        all_msgs = []
        for m in conv.get("wa", []):
            all_msgs.append(("WA", m))
        for m in conv.get("tg", []):
            all_msgs.append(("TG", m))
        # sort by timestamp string (ISO-ish, sortable as text)
        all_msgs.sort(key=lambda x: x[1].get("ts",""))
        recent = all_msgs[-40:] if len(all_msgs) > 40 else all_msgs
        if recent:
            lines = []
            for ch, m in recent:
                who = "Клиент" if m["dir"] == "in" else "Менеджер"
                txt = (m.get("text","") or "")[:300].replace("\n"," ")
                ts  = (m.get("ts","") or "")[:16]
                lines.append(f"[{ts}] {who} ({ch}): {txt}")
            conv_block = "\n".join(lines)
        else:
            conv_block = "Переписка в базе не найдена."
    except Exception as e:
        conv_block = f"(Не удалось загрузить переписку: {e})"

    # Build CRM warning block
    if crm_f_aggressive:
        crm_alert = f"""⛔ ВНИМАНИЕ: В CRM-комментарии есть метка агрессивного/неадекватного клиента.
Комментарий: «{crm_last_comment}»
→ Рекомендация: НЕ работать с этим клиентом. Сразу скажи менеджеру пометить в имени «агрессивный, не работать» и закрыть карточку."""
    elif crm_f_rejection:
        crm_alert = f"""⚠️ ВНИМАНИЕ: В CRM-комментарии — явный отказ или «ребёнок не хочет».
Комментарий: «{crm_last_comment}»
→ Это не закрытый клиент — это временная пауза. Помоги менеджеру понять: когда возвращаться, с каким поводом, и нужно ли сейчас вообще давить."""
    elif crm_last_comment:
        crm_alert = f"📝 Комментарий в CRM: «{crm_last_comment}»"
    else:
        crm_alert = "📝 Комментарий в CRM: отсутствует"

    system = f"""Ты опытный руководитель отдела продаж детского лагеря АйДаКемп.
Ведёшь короткий диалог с менеджером после контакта с клиентом (ID {contact_id}, {crm_name}).
Сегодня: {today}.

{crm_alert}

═══ ИСТОРИЯ ПЕРЕПИСКИ С КЛИЕНТОМ (последние 40 сообщений) ═══
{conv_block}
════════════════════════════════════════════════════════════

СВОДКА:
- WA-сообщений: {wa_count}, TG-сообщений: {tg_count}
- Всего: {msg_count}, ответов клиента: {in_count}, наших без ответа подряд: {ua}
- Период: {date_range}
- Последнее сообщение клиента: «{last_msg}» ({last_date})
- Тональность: {tone_str}
- Флаги: {flags_str}

ТВОИ ПРАВИЛА:
1. Используй реальную переписку выше И комментарий CRM — ссылайся на конкретные слова, даты, темы.
2. Если в комментарии CRM «агрессивный» / «сумасшедший» / «не работать» — ПЕРВЫМ ДЕЛОМ скажи менеджеру закрыть карточку с пометкой, не тратить время.
3. Если «ребёнок не хочет» или явный отказ в комментарии — не советуй звонить прямо сейчас. Объясни почему пауза нужна и с каким конкретным поводом возвращаться.
4. НИКОГДА не соглашайся закрывать активного клиента без железных оснований.
3. На любой негатив — задай уточняющий вопрос по библиотеке ниже.
4. Выясняй детали семьи: сколько детей, возраст, братья/сёстры — это ценные данные.
7. Один вопрос за раз. Кратко — 2-3 предложения максимум.
8. Настойчивый, но дружелюбный наставник, не критик.
9. После 4-5 ответов менеджера — дай итоговую рекомендацию и заверши «[ГОТОВО]» в конце.
10. Пиши по-русски, неформально, как коллега.

═══ БИБЛИОТЕКА РЕАЛЬНЫХ СИТУАЦИЙ (опыт руководителя АйДаКемп) ═══

СИТУАЦИЯ: Не берёт трубку
Правильный алгоритм:
  → Звонок 1 → пауза 5 мин → Звонок 2 → не берёт → написать в WA
    (люди часто не берут с незнакомых номеров, WA сигнализирует кто звонит)
  → Не ответил в WA → написать ещё раз через 1-2 дня → затем ещё звонок
  → После каждого звонка — отписываться в WA что это АйДаКемп (не спам)
  → Если 2 месяца нет ответа — закрыть с пометкой «не дозвониться»
Ошибка менеджера: ставить «невалидный» после 1-2 попыток

СИТУАЦИЯ: «Дорого»
Правильный алгоритм:
  → Уточнить: дорого по сравнению с чем? Какой бюджет комфортен?
  → Есть рассрочка 50/50, можно гибко — например по 25% каждые 2 недели, всё решается вручную
  → Если не переубедили — не давить, внести в отдельный список на случай акции/форсмажора
  → Мало кто говорит «дорого» прямо — чаще это маскировка другого возражения, копать глубже
Ошибка менеджера: сразу давать скидку не выяснив причину

СИТУАЦИЯ: «Ребёнок не хочет»
Правильный алгоритм:
  → Спросить чем интересуется ребёнок → подобрать программу под интересы
  → Рассказать что будут сверстники/одногодки — это главный аргумент для детей
  → Программа = главный инструмент убеждения
Ошибка менеджера: убеждать родителя логикой вместо того чтобы зацепить интересы ребёнка

СИТУАЦИЯ: «Подумаем»
Правильный алгоритм:
  → Уточнить что именно нужно обдумать
  → Перезвонить не позднее чем через неделю — недели достаточно для реального решения
  → Не ждать больше — интерес остывает
Ошибка менеджера: говорить «звоните когда решите» и ждать

СИТУАЦИЯ: «В прошлый раз не понравилось»
Если не у нас:
  → Рассказать чем АйДаКемп отличается, почему у нас понравится
Если у нас:
  → Выяснить что именно не понравилось (программа? питание? вожатые?)
  → Сказать что усилили программу, добавили внеурочную деятельность
  → Это сложная ситуация — быть честным и конкретным

СИТУАЦИЯ: Возраст 15-16 лет (пограничный)
  → До 15 лет — берём, программа подходит
  → 16 лет и старше — как правило не подходит, другая динамика в группе
  → Предложить смены где группа постарше если есть
  → Не брать «в надежде» — с подростками 16+ могут быть другие проблемы

СИТУАЦИЯ: «Запишемся в следующем году»
Правильный алгоритм:
  → Внести в CRM, поставить напоминание на октябрь следующего года
  → В течение года слать информацию о программах и сменах
  → Не терять контакт — напоминать о себе 2-3 раза в год
Ошибка: считать клиента потерянным

СИТУАЦИЯ: Клиент агрессивный / грубит
  → Не давать выход эмоциям, оставаться спокойным
  → С агрессивным клиентом не работать
  → В CRM пометить в имени клиента «агрессивный, не работать»
  → Метку не удалять — он может вернуться через год, надо опознать
  → Это правило без исключений

СИТУАЦИЯ: Долго не отвечает в WA/TG
  → Написать повторно — сообщение могло потеряться среди других
  → После каждого пропущенного звонка — писать сообщение «это АйДаКемп»
  → Если 2 месяца без реакции на звонки И сообщения — закрыть «не дозвониться»

СИТУАЦИЯ: «Уже записались в другой лагерь»
  → НЕ закрывать — многие дети ходят в 2-4 лагеря за лето (спортивный, творческий, языковой и т.д.)
  → Предложить другой период / другую смену
  → Уточнить на какой срок записались — возможно есть окна
═══════════════════════════════════════════════════════════════"""

    payload = _json.dumps({
        "model": "anthropic/claude-3-5-haiku",
        "messages": [{"role": "system", "content": system}] + messages,
        "max_tokens": 300,
        "temperature": 0.7,
    }).encode()

    req = _ureq.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=payload,
        headers={
            "Authorization": f"Bearer {or_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://aidacamp.ru",
        }
    )
    try:
        with _ureq.urlopen(req, timeout=20) as r:
            resp = _json.loads(r.read())
            return resp["choices"][0]["message"]["content"].strip()
    except Exception as e:
        return f"Ошибка ИИ: {e}"


if __name__ == "__main__":
    port = int(os.environ.get("CRM_PANEL_PORT", 6300))
    print(f"CRM Panel API :{port}")
    HTTPServer(("0.0.0.0", port), Handler).serve_forever()

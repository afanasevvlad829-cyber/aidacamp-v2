import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import https from 'node:https';
import pg from 'pg';
import { readFileSync } from 'node:fs';

const campData = {
  shifts: [
    {
      id: "smena-1",
      name: "Смена 1",
      dates: "30 мая — 8 июня",
      days: 10,
      price: 74900,
      available: true,
      desc: "За 10 дней — от первого шага до собственного проекта с AI и понятным результатом.",
      enrolled: 23,
      total: 35,
      enrolledByAge: { "7-9": 5, "10-12": 10, "13-16": 8 }
    },
    {
      id: "smena-2",
      name: "Смена 2",
      dates: "10 — 23 июня",
      days: 14,
      price: 95e3,
      available: true,
      popular: true,
      desc: "Полный цикл создания проекта: больше самостоятельности и более сложный результат.",
      enrolled: 41,
      total: 45,
      enrolledByAge: { "7-9": 9, "10-12": 19, "13-16": 13 }
    },
    {
      id: "smena-2-1",
      name: "Смена 2.1",
      dates: "10 — 16 июня",
      days: 7,
      price: 48e3,
      available: true,
      short: true,
      desc: "За 7 дней — быстрый вход, свой проект и понятный результат без перегруза.",
      enrolled: 29,
      total: 40,
      enrolledByAge: { "7-9": 7, "10-12": 13, "13-16": 9 }
    },
    {
      id: "smena-2-2",
      name: "Смена 2.2",
      dates: "16 — 23 июня",
      days: 8,
      price: 65e3,
      available: true,
      short: true,
      desc: "Интенсивная смена: больше времени на доработку и более сильный итоговый проект.",
      enrolled: 37,
      total: 45,
      enrolledByAge: { "7-9": 8, "10-12": 17, "13-16": 12 }
    },
    {
      id: "smena-3",
      name: "Смена 3",
      dates: "3 — 15 августа",
      days: 13,
      price: 89400,
      available: true,
      desc: "Проект от идеи до результата с акцентом на командную работу.",
      enrolled: 40,
      total: 45,
      enrolledByAge: { "7-9": 9, "10-12": 18, "13-16": 13 }
    },
    {
      id: "smena-4",
      name: "Смена 4",
      dates: "17 — 26 августа",
      days: 10,
      price: 69600,
      available: true,
      desc: "Закрытие лета: сильный проект и уверенный результат.",
      enrolled: 31,
      total: 45,
      enrolledByAge: { "7-9": 7, "10-12": 14, "13-16": 10 }
    }
  ],
  courses: [
    {
      id: "scratch",
      name: "Scratch",
      ageRange: "8–10 лет",
      minAge: 8,
      maxAge: 10,
      icon: "keyboard",
      desc: "Визуальные блоки. Первые игры, анимации, персонажи — без страха перед кодом.",
      campHook: "Сделает свою первую игру с нуля — с персонажами, уровнями и системой наград. Покажет маме работающее приложение",
      result: "Первый код без страха"
    },
    {
      id: "minecraft",
      name: "Minecraft",
      ageRange: "8–12 лет",
      minAge: 8,
      maxAge: 12,
      icon: "blocks",
      desc: "Программирование агента, автоматизация, мини-игры — через любимую игру.",
      campHook: "Создаст автоматизированный мир или мини-игру на Python/Scratch — мир, который не как у всех. Одноклассники оценят",
      result: "Хвастается в школе"
    },
    {
      id: "python",
      name: "Python",
      ageRange: "10–16 лет",
      minAge: 10,
      maxAge: 16,
      icon: "code-slash",
      desc: "Самый востребованный язык. Игры на Pygame, веб-приложения, продвинутые проекты.",
      campHook: "Напишет игру или веб-приложение — реальный проект, который можно показать",
      result: "Покажет друзьям в телефоне"
    },
    {
      id: "javascript",
      name: "JavaScript",
      ageRange: "10–12 лет",
      minAge: 10,
      maxAge: 12,
      icon: "globe",
      desc: "Язык веба. Создаёт сайты с современным интерфейсом и интерактивностью.",
      campHook: "Сделает живой сайт с интерфейсом — то, что открывается в браузере и реально работает",
      result: "Показывает сайт всем"
    },
    {
      id: "java",
      name: "Java / ООП",
      ageRange: "13–16 лет",
      minAge: 13,
      maxAge: 16,
      icon: "laptop",
      desc: "Объектно-ориентированное программирование и алгоритмы. Уровень junior.",
      campHook: "Освоит настоящую архитектуру кода — то, что используют в серьёзных командах",
      result: "Уровень junior-разработчика"
    },
    {
      id: "ai",
      name: "AI-проекты",
      ageRange: "8–16 лет",
      minAge: 8,
      maxAge: 16,
      icon: "cpu",
      desc: "ИИ как инструмент: GPT, нейросети, ИИ-агенты для разработки.",
      campHook: "Научится использовать ИИ как инструмент разработчика — поймёт то, о чём все говорят",
      result: "Тема на 5 лет вперёд"
    }
  ],
  facts: {
    address: "Санаторий Изумруд, Наро-Фоминский район МО",
    distanceFromMoscow: "66 км от МКАД по Калужскому шоссе (A-101), ~1 час",
    ageRange: "7–16 лет",
    accommodation: "Корпуса по 2–4 человека, WiFi",
    meals: "5 раз в день: завтрак, второй завтрак, обед, полдник, ужин. Горячее. Аллергии учитываются.",
    pool: "Через день, открытый",
    security: "Охрана 24/7, закрытая территория, видеонаблюдение на ключевых зонах",
    medical: "Медсестра круглосуточно, больница в 15 минутах",
    hackathon: "Последний день смены — хакатон «Стартап из будущего». Команды 5–7 человек делают реальный продукт за день: от идеи до питча перед «инвесторами». Есть игровая валюта — можно купить ноутбук, консультацию ментора или лишнее время на презентацию. В финале — защита проекта, оценки, награждение.",
    contact: "+7 (968) 808-64-55, wa.me/79688086455, @Progaschool",
    workingHours: "11:00–20:00 МСК, обычно отвечаем за 10 минут",
    payment: "50% при подписании договора, оставшиеся 50% за 3 недели до смены. При оплате 100% в течение 2–3 дней после подписания — скидка 5%. Рассрочку лагерь не оформляет — при необходимости через банк (Сбер, Тинькофф — за 5 минут в приложении).",
    referral: "Приводишь 1 друга → −10% вам обоим + мерч обоим в подарок. Приводишь 5 человек → тебе −50%, пятому −50%. Приводишь 10 человек → твоя путёвка стоит 100 руб.",
    counselorRatio: "1 вожатый на 8–10 детей, работают парами. Дети живут по 2–4 человека в комнате с полноценным санузлом и душевой. Вожатые на том же этаже."}
};

function buildShiftsText(shifts) {
  return shifts.map((s) => {
    const free = s.total - s.enrolled;
    const freeStr = free <= 5 ? ` — осталось ${free} мест` : "";
    const popularStr = s.popular ? " — самая популярная" : "";
    const shortStr = s.short ? " (короткая)" : "";
    const availStr = !s.available ? " — МЕСТ НЕТ" : "";
    return `- ${s.name}${shortStr}: ${s.dates} (${s.days} дней), ${s.price.toLocaleString("ru")} ₽, записалось ${s.enrolled}/${s.total}${freeStr}${popularStr}${availStr}`;
  }).join("\n");
}
const coursesText = campData.courses.map(
  (c) => `- ${c.name} (${c.minAge}–${c.maxAge} лет): ${c.campHook}`
).join("\n");
function getEnrolledByAge(shifts, age) {
  const key = age <= 9 ? "7-9" : age <= 12 ? "10-12" : "13-16";
  const counts = [];
  for (const s of shifts) {
    if (!s.available) continue;
    const byAge = s.enrolledByAge;
    const n = byAge?.[key];
    if (n) counts.push(`${s.name}: ${n} детей`);
  }
  return counts.join(", ");
}
function buildSystemPrompt(liveShifts) {
  const shifts = liveShifts ?? campData.shifts;
  const shiftsText = buildShiftsText(shifts);
  const socialProofByAge = [8, 10, 12, 14].map((age) => {
    const s = getEnrolledByAge(shifts, age);
    return s ? `- возраст ${age} лет: ${s}` : "";
  }).filter(Boolean).join("\n") || "- данные обновляются";
  return `Ты — AI-ассистент IT-лагеря АйДаКемп (aidacamp.ru). Отвечаешь живым языком подруги — не скриптами.

КТО ЧИТАЕТ: мама 35–45 лет, Москва, смартфон. Решает сама.
Она ПОКУПАЕТ: ощущение «я хорошая мама» — не технологии. Говори о том, что сделает и покажет участник, не об «изучении» и «компетенциях».

ЖЁСТКИЙ ЗАПРЕТ — НИКОГДА не упоминать следующее ни в text, ни в chips, ни в label, ни в query:
- Unity / 3D игры / 3D-игры — всё запрещено полностью. Не писать, не называть, не ссылаться.
- Кибербезопасность / Кибербез / CTF / хакинг — всё это запрещено. Не писать, не называть.
- Рассрочка от лагеря — не предлагать; если спрашивают: только через банк (Сбер, Тинькофф), 5 минут в приложении.
Если мама сама спрашивает про Unity или Кибербезопасность — ответь одной фразой «сейчас это направление на паузе» и предложи Python или AI как альтернативу. Не объясняй подробно.

ОБРАЩЕНИЕ: всегда на «Вы». Никогда на «ты».
ЗАПРЕЩЕНО слово «ребёнок» в любом падеже — «ребёнка», «ребёнку», «ребёнком», «ребёнке» — полностью и навсегда. Ни разу, ни в каком контексте.
Вместо него — «он», «она», «дети», «ребята», «в этом возрасте», «сын», «дочь», «участник» (если известно).
Пример замены: «с ребёнком» → «с дочкой / с сыном / с детьми».

❌ ЗАПРЕЩЕНО: «Ребёнок создаст игру», «Ребёнок напишет бота», «Ваш ребёнок попадёт в группу»
✅ ПРАВИЛЬНО: «Создаст игру», «Напишет бота», «В этом возрасте попадают в группу по уровню»

❌ ЗАПРЕЩЕНО: «В 9 лет ребёнок уже может»
✅ ПРАВИЛЬНО: «В 9 лет уже можно», «В этом возрасте отлично заходит»

ГЕНДЕР — слушай внимательно:
- Если мама написала «дочь», «дочка», «девочка» → используй «она», «ей», «свою» — НЕ «он» или «ему».
- Если написала «сын», «мальчик», «парень» → «он», «ему», «своего».
- Если пол не упоминался → нейтрально: «ребята», «дети», «в этом возрасте». Без слова «ребёнок».
- Никогда не угадывай пол по имени — только по прямым словам мамы.

ТОНАЛЬНОСТЬ:
- Как подруга которая уже отправляла своего. Не продавец, не эксперт в очках.
- Коротко: 2–3 предложения в тексте. Мама читает на телефоне.
- Никаких: "Отличный выбор!", "Конечно!", "Замечательно!". Это маркер скрипта.
- Никаких педагогических слов: "soft-skills", "фундамент знаний", "компетенции".
- Говори что ребёнок СДЕЛАЕТ и ПОКАЖЕТ — не что «изучит» или «освоит».
- Можно лёгкий юмор — одна фраза в конце если уместно. Не каламбур, а наблюдение подруги.
  Примеры духа (не копировать буквально):
  «Дома такого расписания обычно нет — мамы это иногда ценят больше детей»
  «Первые два дня грустит по майонезу. Потом привыкает»
  «Почти все дети в итоге не тратят даже всё заработанное время на телефон — некогда»
  «Уедет с проектом. Это работает лучше любых разговоров о будущем»
  Одна такая деталь делает ответ живым. Но не в каждом сообщении — по ощущению.

ФОРМАТ ОТВЕТА: ВСЕГДА JSON и только JSON. Никакого текста вне JSON.
{
  "text": "1–2 предложения с <strong>акцентами</strong> и <br> переносами",
  "block_type": "smeny" | "courses" | "day_schedule" | "conditions" | "prices" | "location" | null,
  "block_data": { ... } | null,
  "chips": [ {"label": "...", "query": "..."}, {"label": "Забронировать", "action": "book"} ]
}

КРИТИЧЕСКИ ВАЖНО — НЕ ДУБЛИРУЙ БЛОК В ТЕКСТЕ:
Если указан block_type — в "text" пишешь только короткий мостик (1 предложение), но НЕ повторяешь содержимое блока.
Блок сам покажет всю информацию визуально — не надо её ещё раз описывать словами.

❌ Плохо (дублирование):
"text": "Вот расписание: 8:30 — завтрак, 9:30–11:30 — IT-занятия, 11:30 — перемена...",
"block_type": "day_schedule"

✅ Хорошо:
"text": "День насыщенный, но без перегруза — IT утром и после обеда, бассейн через день, вечером что-то интересное.",
"block_type": "day_schedule"

❌ Плохо (дублирование):
"text": "Смена 1 — 30 мая, 74 900₽. Смена 2 — 10 июня, 95 000₽...",
"block_type": "smeny"

✅ Хорошо:
"text": "Открыто 5 смен — с мая по август. Самая популярная — июньская на 14 дней.",
"block_type": "smeny"

ПРАВИЛА БЛОКОВ:
- Смены/даты/когда → block_type: "smeny"
- Курсы/направления/что делают → block_type: "courses", передай {"age": N} если знаешь возраст
- Распорядок/как день проходит → block_type: "day_schedule"
- Условия целиком / проживание+безопасность+всё-что-входит → block_type: "conditions"
- ОДИН конкретный вопрос (питание, бассейн, медицина, охрана отдельно) → block_type: null, ответь коротко в тексте
- Цены/стоимость → block_type: "prices"
- Налоговый вычет / "сколько вернут" / "вычет 13%" / калькулятор вычета → block_type: "tax_calculator", block_data: null
- Как добраться/трансфер/адрес → block_type: "location"
- Просят показать фото / "как выглядит" / "покажи" + тема → block_type: "gallery", block_data: {"query": "тема по-русски"} (например "бассейн", "занятия программированием", "территория", "еда", "хакатон")
- Просят видео / "расскажи на видео" / "покажи видео" → block_type: "video_player", выбери подходящее:
  {"video_id":"qmLxu2S7uaS44CKkhoV1Jj","title":"IT-лагерь — не просто компьютер"} — общее о лагере
  {"video_id":"tJAaAnvCYYJ5vRz7uyUepj","title":"За неделю меняется больше, чем за год дома"} — про эффект
  {"video_id":"naDfzrei9duApz3AnaencH","title":"Не хочу в лагерь… через 3 дня: хочу ещё"} — про тревожных детей
  {"video_id":"eTmCgZHcwhcWQQs3HLCz1S","title":"Сам откажется от телефона за 3 дня"} — про телефоны
  {"video_id":"s1SCYKqLx6C94fMRumitHF","title":"Зачем детям копить деньги в лагере"} — про внутреннюю экономику
  {"video_id":"g2S7xxtEUP4S2E3WXYFNqZ","title":"Моя ферма — проект участника"} — про проекты (Scratch/Python)
  {"video_id":"2ULnxEqqC4ssLNYCh5YPvo","title":"Программирование дронов — проект"} — про дроны/Python
  {"video_id":"iFCF2uprpHLxx9VgJ1M7SP","title":"Игра на Unity — проект"} — про Unity/игры
- Всё остальное → block_type: null
- СОЦИАЛЬНОЕ ДОКАЗАТЕЛЬСТВО — показывай НЕ ЧАЩЕ 1 раза за диалог, только когда человек проявляет живой интерес («хочу записать», «звучит интересно», «наверное возьмём», «хочу к вам») → block_type: "youtube_comment", block_data: null. Не показывай при первом вопросе и не показывай если уже показывал.

CHIPS: всегда 3–4 кнопки. Делай разнообразными — не повторяй одинаковые вопросы в разных ответах.
Последняя chip — либо {"label":"Забронировать","action":"book"}, либо {"label":"Написать менеджеру","action":"contact_request"}.

Банк наводящих вопросов для chips — выбирай подходящие к теме разговора:
- {"label":"Что будет делать на смене?","query":"чем занимаются на смене"}
- {"label":"Опыт нужен?","query":"нужен ли опыт программирования"}
- {"label":"Как подбирают группу?","query":"как подбирают группу по уровню"}
- {"label":"Есть ли бассейн?","query":"бассейн и активности"}
- {"label":"Как с едой?","query":"питание в лагере"}
- {"label":"Телефон заберут?","query":"телефон и связь с родителями"}
- {"label":"Безопасность?","query":"безопасность и охрана"}
- {"label":"Как добраться?","query":"трансфер и дорога"}
- {"label":"Вычет 13%","query":"налоговый вычет за лагерь"}
- {"label":"Хакатон — это что?","query":"что такое хакатон"}
- {"label":"Июнь или август?","query":"какую смену выбрать июнь или август"}
- {"label":"Короткая смена","query":"короткая смена 7 или 8 дней"}
- {"label":"Кто преподаватели?","query":"кто ведёт занятия"}
- {"label":"Сколько мест осталось?","query":"сколько мест осталось"}
- {"label":"Если не понравится?","query":"возврат если не понравится"}
- {"label":"Скидки и акции","query":"скидки реферальная программа"}
- {"label":"Как оплатить?","query":"оплата договор условия"}
- {"label":"Отзывы родителей","query":"отзывы о лагере"}
- {"label":"Python или AI?","query":"что выбрать Python или AI проекты"}
- {"label":"Minecraft или Scratch?","query":"что выбрать Minecraft или Scratch"}

РЕЖИМ ИСТОРИЙ (когда просят «расскажи историю», «весёлую историю», «грустную» и т.п.):
3–4 предложения. Тон — как подруга пишет в чате, без выводов и морали в конце.
ЗАПРЕЩЕНО: «он вернулся другим человеком», «обрёл уверенность», «раскрылся», «это стало переломным моментом», «с тех пор всё изменилось» — любой пафос и «трансформация».
ЗАПРЕЩЕНО: имена. Только «один мальчик», «девочка лет одиннадцати», «один из вожатых».
История должна звучать как что-то что реально могло случиться — конкретная бытовая деталь, не вдохновляющий нарратив.
Заканчивай нейтрально или с лёгкой иронией — не моралью.

Примеры правильного тона:
✅ «Один мальчик спрятал телефон в носке. Вожатый нашёл через полтора часа — не потому что искал, а потому что носок лежал на полу.»
✅ «На хакатоне одна команда два часа спорила как назвать проект. Сам проект сделали за 40 минут. Заняли второе место.»
✅ «Первые два дня одна девочка писала маме что скучает. На третий день забыла зарядить телефон и не написала вообще.»
❌ «Он вернулся другим — уверенным в себе, готовым к новым вызовам.»
❌ «Это стало моментом, когда она поняла что может всё.»

После истории chips:
- { "label": "Ещё одну", "query": "расскажи ещё историю из лагеря" }
- { "label": "Весёлую", "query": "расскажи весёлую историю из лагеря" }
- { "label": "Про хакатон", "query": "расскажи историю про хакатон в лагере" }
- { "label": "Забронировать", "action": "book" }

ОБЪЯСНЕНИЕ НАПРАВЛЕНИЙ (отвечай просто, без жаргона):

Что такое Scratch?
Это программирование без классического написания кода — вместо букв и символов цветные блоки-кубики, как Lego.
Ребёнок перетаскивает блоки мышкой и сразу видит как движется персонаж, играет музыка, меняется сцена.
Идеально для 7–9 лет: никакого страха «я не понимаю код», сразу получается результат — своя игра или мультик.

Что такое Minecraft-программирование?
Ваш ребёнок уже знает Minecraft. Мы учим его менять игру изнутри: написать мод, создать своего моба, сделать собственный мир с правилами.
Это настоящий код (Python или Java), но в среде которую ребёнок обожает — поэтому не страшно и интересно.
Подходит 8–12 лет, особенно тем кто уже играет.

Что такое Python?
Самый популярный язык программирования в мире — на нём пишут банки, Яндекс, Instagram, ChatGPT.
На смене ребёнок напишет телеграм-бота или простую игру — реальный проект, который можно показать.
С 10 лет уже воспринимается нормально, это первый «взрослый» язык.

Что такое AI-проекты?
ИИ как инструмент разработчика: GPT для идей и текстов, ИИ-агенты для разработки и тестирования.
Даже в 8 лет — знакомство с ChatGPT для создания игр и проектов. В старших группах — нейросети, ML, реальные проекты.
Подходит всем возрастам — формат зависит от уровня.

Что такое JavaScript?
Язык веба. Создают сайт с современным интерфейсом — переменные, функции, интерактивность, дизайн.
В итоге — живой сайт, который открывается в браузере. Для 10–12 лет.

Что такое Java / ООП?
Объектно-ориентированное программирование и алгоритмы — то, что используют в серьёзных командах.
Python/Java, создание реального проекта, работа с ИИ-инструментами для разработки. Для 13–16 лет.

Что такое хакатон в лагере?
В финале смены — хакатон. Команды 5–7 детей придумывают стартап и за день делают его: приложение, игру, бота.
«Питчат» идею взрослым-«инвесторам». Есть игровые деньги — на ноутбук, подсказку ментора, лишнее время.
В финале — защита, оценки, награждение.

КАК ПОДБИРАЕТСЯ ТРЕК:
В первый день педагоги беседуют с каждым — оценивают возраст, интересы и текущий уровень.
Потом помогают выбрать направление. Опыт не нужен — начинают с нуля.
Занятия 2 раза в день по 90 минут.

ПОЧЕМУ ВОЗРАСТ ВАЖЕН:
8–10 лет: Scratch, Minecraft или знакомство с ИИ/GPT. Нужна игровая оболочка — сразу понятный результат.
10–12 лет: Python (игры на Pygame), JavaScript (сайты) или Minecraft. Уже готовы к настоящему коду.
13–16 лет: Python продвинутый, Java/ООП или AI-проекты с ИИ-агентами. Больше самостоятельности, сложнее результат.

TELEGRAM-КАНАЛ СМЕНЫ:
Под каждую смену заводится отдельный Telegram-канал. Туда вожатые, руководитель смены и преподаватели выкладывают фото и видео каждый день — учёба, игры, столовая, вечерняя программа. Мама видит всё что происходит в реальном времени.
Ссылку на канал отправляем после бронирования, за 2 недели до заезда.
Если спрашивают «как следить», «будут ли фото», «как узнаю что с ним всё хорошо» — обязательно расскажи про канал.

КАК РАБОТАТЬ С КОНТЕКСТОМ ИЗ БАЗЫ ЗНАНИЙ:
Внизу системного промпта (после "КОНТЕКСТ ИЗ БАЗЫ ЗНАНИЙ") появятся реальные тексты — отзывы родителей, истории из лагеря, ответы на возражения. Используй их как основу. Не копируй дословно — пересказывай своими словами в тоне подруги.

ПРАВИЛО ФАКТОВ — АБСОЛЮТНОЕ:
Любая цифра — только из раздела "Факты" ниже или из КОНТЕКСТА. Не придумывай.
Отзывы — только из КОНТЕКСТА. Не сочиняй похожие.
Статистика (рейтинг, количество детей) — только: 5.0★ на Яндекс.Картах, 40+ отзывов, 7 лет, 1200+ детей, 60% возвращаются.

КАК ОТВЕЧАТЬ НА ВОЗРАЖЕНИЯ:
Не по скрипту. Опирайся на КОНТЕКСТ — там есть реальные ответы и истории. Добавь бытовую деталь, лёгкую иронию. Называй минусы первыми — это доверие.

МЯГКОЕ ПРЕДЛОЖЕНИЕ КОНТАКТА — один раз после 3–4 обменов когда мама явно заинтересована:
chip: { "label": "Написать менеджеру", "action": "contact_request" }
Когда просит "перезвоните / оставить заявку": НЕ говори "передал". Скажи: "Чтобы Дарья написала первой — оставьте контакт." + chip contact_request.

СОЦИАЛЬНОЕ ДОКАЗАТЕЛЬСТВО — не чаще 1 раза за диалог, только когда явный интерес:
Данные по записям (не цитировать буквально):
${socialProofByAge}

ФАКТЫ ЛАГЕРЯ (единственный источник правды):

Смены 2026:
${shiftsText}

Направления по возрасту:
${coursesText}

Базовые факты:
- Адрес: ${campData.facts.address}
- От Москвы: ${campData.facts.distanceFromMoscow}, трансфер от м. Солнцево включён
- Возраст участников: ${campData.facts.ageRange}
- Проживание: ${campData.facts.accommodation}
- Питание: ${campData.facts.meals}
- Бассейн: ${campData.facts.pool}
- Охрана: ${campData.facts.security}
- Медицина: ${campData.facts.medical}
- Вожатые: ${campData.facts.counselorRatio}
- Ноутбук: не нужен — всё предоставляется
- Telegram-канал смены: отдельный канал, ссылка после бронирования
- Хакатон: ${campData.facts.hackathon}
- Оплата: ${campData.facts.payment}
- Рассрочка от лагеря: НЕТ. Только через банк (Сбер/Тинькофф)
- Реферальная программа: ${campData.facts.referral}
- Мерч: первая смена → футболка, вторая и далее → толстовка-худи
- Налоговый вычет: 13% через ФНС, образовательная часть выделяется в договоре
- Документы: справка 79-у (3 мес.), справка об отсутствии контактов (3 дня), полис ОМС, копия паспорта/свидетельства, согласие на обработку данных, справка для бассейна
- Договор: шаблон на https://aidacamp.ru/docs/dogovor-aidacamp.pdf
- Контакт: ${campData.facts.contact} (${campData.facts.workingHours})`;
}
buildSystemPrompt();

const ChipSchema = z.object({
  label: z.string(),
  query: z.string().optional(),
  action: z.enum(["book", "contact_request"]).optional()
});
const ResponseSchema = z.object({
  text: z.string(),
  block_type: z.enum([
    "smeny",
    "courses",
    "day_schedule",
    "conditions",
    "prices",
    "location",
    "gallery",
    "video_player",
    "youtube_comment",
    "tax_calculator"
  ]).nullable(),
  block_data: z.record(z.string(), z.any()).nullable(),
  chips: z.array(ChipSchema).max(4)
});

const { Pool } = pg;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const MIN_SCORE = 0.4;
let _pool = null;
function getPool() {
  if (!_pool && DATABASE_URL) {
    _pool = new Pool({ connectionString: DATABASE_URL, max: 3 });
  }
  return _pool;
}
function openaiEmbed(text) {
  return new Promise((resolve) => {
    if (!OPENAI_API_KEY) return resolve([]);
    const body = JSON.stringify({ input: [text], model: "text-embedding-3-small" });
    const req = https.request({
      hostname: "api.openai.com",
      path: "/v1/embeddings",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Length": Buffer.byteLength(body)
      }
    }, (res) => {
      let data = "";
      res.on("data", (d) => data += d);
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve(json?.data?.[0]?.embedding ?? []);
        } catch {
          resolve([]);
        }
      });
    });
    req.on("error", () => resolve([]));
    req.setTimeout(8e3, () => {
      req.destroy();
      resolve([]);
    });
    req.write(body);
    req.end();
  });
}
async function ragContext(question, topK = 5) {
  const pool = getPool();
  if (!pool || !OPENAI_API_KEY) return "";
  let qVec;
  try {
    qVec = await openaiEmbed(question);
  } catch {
    return "";
  }
  if (!qVec.length) return "";
  try {
    const { rows } = await pool.query(
      `SELECT source, text, 1 - (embedding <=> $1::vector) AS score
       FROM knowledge_chunks
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [`[${qVec.join(",")}]`, topK]
    );
    const relevant = rows.filter((r) => r.score >= MIN_SCORE);
    if (!relevant.length) return "";
    const texts = relevant.map((r) => `[${r.source}]
${r.text}`).join("\n\n---\n\n");
    return `

КОНТЕКСТ ИЗ БАЗЫ ЗНАНИЙ (реальные истории и слова Дарьи — используй если релевантно, своими словами):

${texts}
`;
  } catch {
    return "";
  }
}

const base = "https://aidacamp.ru/images/gallery/jpg/";
const photos = [{"file":"study-dome-group.jpg","tags":["занятия","программирование","группа","дети учатся","ноутбуки"],"caption":"Групповые занятия в куполе"},{"file":"study-dome-row.jpg","tags":["занятия","программирование","ряд","ноутбуки","дети"],"caption":"Занятия в куполе — общий вид"},{"file":"study-pitch.jpg","tags":["занятия","презентация","выступление","проект"],"caption":"Питч-сессия — дети представляют проект"},{"file":"study-stage-girl.jpg","tags":["хакатон","презентация","девочка","сцена","проект"],"caption":"Девочка представляет проект на сцене"},{"file":"hackathon-present.jpg","tags":["хакатон","финал","презентация","команда"],"caption":"Хакатон — финальная презентация команды"},{"file":"camp-group-beanbags.jpg","tags":["отдых","группа","бинбэг","общение","дети вместе"],"caption":"Дети общаются на бинбэгах"},{"file":"camp-smile.jpg","tags":["улыбки","счастье","дети","атмосфера","настроение"],"caption":"Счастливые дети в лагере"},{"file":"camp-two-beanbags.jpg","tags":["отдых","двое","бинбэг","дружба","общение"],"caption":"Двое на бинбэгах"},{"file":"IMG_7209.jpg","tags":["дети","лагерь","занятия","атмосфера"],"caption":"Рабочая атмосфера в лагере"},{"file":"IMG_7219.jpg","tags":["дети","лагерь","команда","вместе"],"caption":"Команда в лагере"},{"file":"pool-interior.jpg","tags":["бассейн","вода","интерьер","спорт"],"caption":"Бассейн — общий вид"},{"file":"pool-kids-edge.jpg","tags":["бассейн","дети","вода","плавание","отдых"],"caption":"Дети у бассейна"},{"file":"pool-noodles.jpg","tags":["бассейн","нудлы","веселье","вода","игра"],"caption":"Веселье в бассейне с нудлами"},{"file":"food-buffet.jpg","tags":["еда","питание","шведский стол","буфет"],"caption":"Шведский стол — питание в лагере"},{"file":"food-kids-peace.jpg","tags":["еда","питание","дети едят","столовая","обед"],"caption":"Дети обедают"},{"file":"sport-ball.jpg","tags":["спорт","мяч","игра","активность"],"caption":"Спортивные игры с мячом"},{"file":"sport-field.jpg","tags":["спорт","поле","активность","улица"],"caption":"Спортивное поле"},{"file":"sport-football.jpg","tags":["футбол","спорт","игра","дети"],"caption":"Футбол на улице"},{"file":"sport-goal.jpg","tags":["футбол","ворота","спорт","гол"],"caption":"Спортивные ворота"},{"file":"territory-admin.jpg","tags":["территория","корпус","здание","база"],"caption":"Административный корпус базы"},{"file":"territory-alley.jpg","tags":["территория","аллея","природа","база","прогулка"],"caption":"Аллея на территории базы"},{"file":"territory-korpus.jpg","tags":["территория","корпус","проживание","здание"],"caption":"Жилой корпус"},{"file":"gallery-04.jpg","tags":["лагерь","дети","занятия","атмосфера"],"caption":"Атмосфера лагеря"},{"file":"gallery-05.jpg","tags":["лагерь","дети","команда","программирование"],"caption":"Работа в команде"},{"file":"gallery-08.jpg","tags":["лагерь","дети","вечер","активность"],"caption":"Вечерняя активность"}];
const photoIndex = {
  base,
  photos};

function findPhotos(query, count = 3) {
  const q = query.toLowerCase();
  const base = photoIndex.base;
  const scored = photoIndex.photos.map((photo) => {
    const score = photo.tags.filter(
      (tag) => q.includes(tag) || tag.split(" ").some((w) => q.includes(w))
    ).length;
    return { photo, score };
  });
  const results = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, count).map((s) => ({
    url: base + s.photo.file,
    caption: s.photo.caption
  }));
  if (!results.length) {
    return [
      { url: base + "camp-smile.jpg", caption: "Атмосфера лагеря" },
      { url: base + "camp-group-beanbags.jpg", caption: "Дети в лагере" },
      { url: base + "study-dome-group.jpg", caption: "Занятия" }
    ].slice(0, count);
  }
  return results;
}

const prerender = false;
function getLivePrompt() {
  try {
    const raw = readFileSync("/var/www/aidacamp-data/shifts.json", "utf-8");
    const data = JSON.parse(raw);
    if (data?.shifts?.length >= 4) {
      return buildSystemPrompt(data.shifts);
    }
  } catch {
  }
  return buildSystemPrompt();
}
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ""
});
const TIMEOUT_FALLBACK = JSON.stringify({
  state: "ok",
  text: 'Что-то подвисло на сервере — бывает. Напишите нам напрямую, ответим быстро: <a href="https://wa.me/79688086455" target="_blank" rel="noopener">WhatsApp</a> или <a href="https://t.me/Progaschool" target="_blank" rel="noopener">Telegram @Progaschool</a>.',
  block_type: null,
  block_data: null,
  chips: [
    { label: "Попробовать ещё раз", query: "" },
    { label: "Написать менеджеру", action: "contact_request" }
  ]
});
const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const { message, history = [] } = body;
    if (!message?.trim()) {
      return new Response(JSON.stringify({ state: "error", text: "Пустое сообщение" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }
    const [rag, basePrompt] = await Promise.all([
      ragContext(message, 4),
      Promise.resolve(getLivePrompt())
    ]);
    const systemText = basePrompt + rag;
    const messages = [
      ...history.slice(-10).map((m) => ({
        role: m.role,
        content: m.content
      })),
      { role: "user", content: message }
    ];
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: systemText,
          cache_control: { type: "ephemeral" }
        }
      ],
      messages
    });
    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      const cleanText = raw.replace(/```[\s\S]*?```/g, "").trim() || "Уточните вопрос.";
      console.warn("No JSON in response, using raw text as fallback. Length:", raw.length);
      return new Response(
        JSON.stringify({
          state: "ok",
          text: cleanText,
          block_type: null,
          block_data: null,
          chips: [
            { label: "Смены 2026", query: "смены" },
            { label: "Цены", query: "цены" },
            { label: "Написать менеджеру", action: "contact_request" }
          ]
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
    let parsedJson;
    try {
      parsedJson = JSON.parse(jsonMatch[0]);
    } catch {
      const fixed = jsonMatch[0].replace(
        /"((?:[^"\\]|\\.)*)"/g,
        (_m, s) => '"' + s.replace(/\n/g, "\\n").replace(/\r/g, "") + '"'
      );
      try {
        parsedJson = JSON.parse(fixed);
      } catch {
        parsedJson = null;
      }
    }
    if (!parsedJson) {
      console.warn("JSON parse failed even after sanitization");
      return new Response(
        JSON.stringify({
          state: "ok",
          text: raw.replace(/```json|```|\{[\s\S]*\}/g, "").trim() || "Уточните вопрос.",
          block_type: null,
          block_data: null,
          chips: [{ label: "Смены 2026", query: "смены" }, { label: "Цены", query: "цены" }, { label: "Написать менеджеру", action: "contact_request" }]
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
    const parsed = ResponseSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          state: "ok",
          text: raw.replace(/```json|```/g, "").trim(),
          block_type: null,
          block_data: null,
          chips: [
            { label: "Смены 2026", query: "смены" },
            { label: "Цены", query: "цены" },
            { label: "Забронировать", action: "book" }
          ]
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
    const responseData = { ...parsed.data };
    if (responseData.block_type === "gallery") {
      const photoQuery = responseData.block_data?.query || message;
      responseData.block_data = { photos: findPhotos(photoQuery, 3) };
    }
    return new Response(
      JSON.stringify({ state: "ok", ...responseData }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ask.ts error:", e?.name, e?.message);
    return new Response(TIMEOUT_FALLBACK, {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };

1. Что проверено
- https://codims.ru/courses/scratch/ и https://codims.ru/courses/python/ в Chrome, viewport 390x844.
- Проверены: видимость CTA на первом экране, клик по CTA без отправки формы, console error/warn, текст оранжевого баннера лагеря.

2. Что найдено
- Scratch: CTA «Записаться на пробный урок — 500 ₽» виден без прокрутки: top 647, bottom 728 при высоте 844. Клик открывает/прокручивает к `#course-form`, URL становится `https://codims.ru/courses/scratch/#course-form`; видна форма «Пробный урок — Scratch». Ошибки/предупреждения консоли: не обнаружены.
- Python: CTA «Записаться на пробный урок — 500 ₽» виден без прокрутки: top 647, bottom 728 при высоте 844. Клик открывает/прокручивает к `#course-form`, URL становится `https://codims.ru/courses/python/#course-form`; видна форма «Пробный урок — Python». Ошибки/предупреждения консоли: не обнаружены.
- Оранжевый баннер лагеря на обеих страницах: «Летний IT-лагерь 2026 — набор открыт! Смотреть смены →». В viewport 390x844 он начинается около y=784 и частично попадает на первый экран.

3. Что изменено
- На сайте ничего не менялось, формы не заполнялись и не отправлялись.
- Из-за sandbox не удалось записать в `~/.claude/agent-results/codex-codims-courses-cta2.md`; копия сохранена в `.agent-results/codex-codims-courses-cta2.md`.

4. Результат / метрики
- Scratch: CTA fullyInFirstViewport=true; console errors/warnings=0.
- Python: CTA fullyInFirstViewport=true; console errors/warnings=0.

5. Next minimal step
- При доступе на запись в `~/.claude/agent-results/` перенести копию туда.

/**
 * Nudge system — 7 согласованных флоу
 * Только утверждённые тексты и тайминги
 */

const NUDGE_KEY = 'aidacamp_nudges';
const MAX_PER_SESSION = 3;
const MIN_INTERVAL_MS = 60000;

function getMskHour(): number {
  return new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Moscow' })
  ).getHours();
}

function canShow(): boolean {
  const shown = JSON.parse(sessionStorage.getItem(NUDGE_KEY) || '[]');
  if (shown.length >= MAX_PER_SESSION) return false;
  const last = shown[shown.length - 1]?.time || 0;
  if (Date.now() - last < MIN_INTERVAL_MS) return false;
  if (document.querySelector('dialog[open]')) return false;
  if (sessionStorage.getItem('form_interacted')) return false;
  return true;
}

export function showNudge(
  id: string,
  text: string,
  sub: string,
  onClick?: () => void
) {
  if (!canShow()) return;
  const shown = JSON.parse(sessionStorage.getItem(NUDGE_KEY) || '[]');
  if (shown.find((n: { id: string }) => n.id === id)) return;

  const toast = document.getElementById('nudge-toast');
  const textEl = document.getElementById('nudge-text');
  const subEl = document.getElementById('nudge-sub');
  if (!toast || !textEl || !subEl) return;

  textEl.textContent = text;
  subEl.textContent = sub;
  toast.style.display = 'block';
  toast.style.cursor = onClick ? 'pointer' : 'default';
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  if (onClick) {
    toast.onclick = (e: MouseEvent) => {
      if ((e.target as Element).id !== 'nudge-close') onClick();
    };
  } else {
    toast.onclick = null;
  }

  setTimeout(hideNudge, 7000);

  shown.push({ id, time: Date.now() });
  sessionStorage.setItem(NUDGE_KEY, JSON.stringify(shown));
}

export function hideNudge() {
  const toast = document.getElementById('nudge-toast');
  if (!toast) return;
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(10px)';
  setTimeout(() => { toast.style.display = 'none'; }, 300);
}

export function initNudges() {
  // Кнопка закрытия
  document.getElementById('nudge-close')?.addEventListener('click', (e) => {
    e.stopPropagation();
    hideNudge();
  });

  // Отмечаем взаимодействие с формой
  document.querySelectorAll('[data-form] input, [data-form] button').forEach(el => {
    el.addEventListener('click', () =>
      sessionStorage.setItem('form_interacted', '1'), { once: true }
    );
  });

  // Глобально для дебага
  (window as unknown as Record<string, unknown>).showNudge = showNudge;
  (window as unknown as Record<string, unknown>).hideNudge = hideNudge;

  // ФЛОУ 1 — завис на Hero > 15 сек
  let heroTimer: ReturnType<typeof setTimeout>;
  const heroObs = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      heroTimer = setTimeout(() => showNudge(
        'hero_idle',
        'Обычно начинают с возраста',
        'Выберите — и подберём подходящую смену →',
        () => document.querySelector<HTMLElement>('[data-form] [data-age-btn]')
               ?.scrollIntoView({ behavior: 'smooth' })
      ), 15000);
    } else {
      clearTimeout(heroTimer);
    }
  }, { threshold: 0.5 });
  const hero = document.getElementById('hero');
  if (hero) heroObs.observe(hero);

  // ФЛОУ 2 — пролетел смены быстро (< 5 сек)
  let shiftsEnter = 0;
  const shiftsObs = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      shiftsEnter = Date.now();
    } else if (shiftsEnter && Date.now() - shiftsEnter < 5000) {
      const cards = Array.from(document.querySelectorAll('#shifts article'));
      const card = cards.find(c => (c as HTMLElement).offsetWidth > 0) || cards[1];
      const freePlaces = card?.querySelector('[data-free]')?.textContent?.trim() || '4';
      setTimeout(() => showNudge(
        'shifts_fast',
        'Смена 2 — самая популярная',
        `Осталось ${freePlaces} места · полный цикл проекта за 14 дней`,
        () => document.getElementById('shifts')?.scrollIntoView({ behavior: 'smooth' })
      ), 3000);
      shiftsEnter = 0;
    }
  }, { threshold: 0.3 });
  const shifts = document.getElementById('shifts');
  if (shifts) shiftsObs.observe(shifts);

  // ФЛОУ 3 — завис на Фото/Видео > 20 сек
  let mediaTimer: ReturnType<typeof setTimeout>;
  const mediaObs = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      mediaTimer = setTimeout(() => showNudge(
        'media_engaged',
        'Наш рекорд — 6 возвратов',
        'Некоторые ездят дважды за лето: в начале и в конце'
      ), 20000);
    } else {
      clearTimeout(mediaTimer);
    }
  }, { threshold: 0.4 });
  const gallery = document.getElementById('gallery');
  const videos = document.getElementById('videos');
  if (gallery) mediaObs.observe(gallery);
  if (videos) mediaObs.observe(videos);

  // ФЛОУ 4 — открыл 2+ вопроса в FAQ
  let faqOpens = 0;
  document.querySelectorAll('#faq details').forEach(d => {
    d.addEventListener('toggle', () => {
      if ((d as HTMLDetailsElement).open) {
        faqOpens++;
        if (faqOpens >= 2) {
          setTimeout(() => showNudge(
            'faq_engaged',
            'Закрытая территория · вожатые на связи 24/7',
            'Каждый день публикуем фотографии со смены'
          ), 1000);
        }
      }
    });
  });

  // ФЛОУ 5 — доскроллил до Команды
  const teamObs = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) {
      setTimeout(() => showNudge(
        'team_reached',
        '94% родителей рекомендуют лагерь друзьям',
        '★ 5.0 на Яндекс Картах →',
        () => window.open('https://yandex.ru/maps/org/aidacamp/187591197654/', '_blank')
      ), 2000);
    }
  }, { threshold: 0.2 });
  const team = document.getElementById('team');
  if (team) teamObs.observe(team);

  // ФЛОУ 6 — exit intent (только десктоп)
  if (window.matchMedia('(min-width: 1024px)').matches) {
    document.addEventListener('mouseleave', (e: MouseEvent) => {
      if (e.clientY <= 0) {
        const hour = getMskHour();
        const isNight = hour >= 20 || hour < 11;
        showNudge(
          'exit_intent',
          isNight
            ? 'Оставьте номер — свяжемся с 11 до 12 МСК'
            : 'Оставьте номер — перезвоним за 10 минут',
          'Без давления — просто расскажем про смены',
          () => {
            document.getElementById('hero')?.scrollIntoView({ behavior: 'smooth' });
            setTimeout(() => {
              document.querySelector<HTMLInputElement>(
                '[data-form=booking_desktop] input[type=tel]'
              )?.focus();
            }, 700);
          }
        );
      }
    });
  }

  // ФЛОУ 7 — 3 мин без взаимодействия с формой
  setTimeout(() => showNudge(
    'long_session',
    'Сам ребёнок может позвонить в любой момент',
    'Плюс вожатые и руководитель смены на связи 24/7'
  ), 180000);
}

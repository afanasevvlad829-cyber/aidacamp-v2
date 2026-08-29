/**
 * Общий контроллер лайтбокса с Plyr + караоке-субтитрами (VTT) для
 * VideoGallery.astro и VideoCarouselVertical.astro. Разметка и CSS у них
 * разные (десктоп-грид+карусель с альбомными превью vs только карусель
 * с портретными) — сливать рискованно для вёрстки двух живых страниц.
 * Здесь только JS-поведение, которое у них буквально совпадало.
 */

import { trackGoal } from './analytics';

export interface VideoLightboxConfig {
  lbId: string;
  titleId: string;
  closeId: string;
  overlayId: string;
  karaokeId: string;
  videoId: string;
  cardSelector: string;
  trackId: string;
  dotsSelector: string;
  slideSelector: string;
  lineStyle: string;
  /** Doждаться canplay перед play() — так делает VideoCarouselVertical, VideoGallery — нет (play() сразу). */
  waitForCanplay?: boolean;
  /** Опциональная цель Яндекс.Метрики при открытии лайтбокса (только у VideoCarouselVertical). */
  analyticsGoal?: string;
}

export function initVideoLightbox(cfg: VideoLightboxConfig) {
  const lb       = document.getElementById(cfg.lbId);
  const titleEl  = document.getElementById(cfg.titleId);
  const closeBtn = document.getElementById(cfg.closeId);
  const overlay  = document.getElementById(cfg.overlayId);
  const kEl      = document.getElementById(cfg.karaokeId);
  if (!lb || !titleEl || !closeBtn || !overlay || !kEl) return;
  const lightbox = lb;
  const lightboxTitle = titleEl;
  const karaoke = kEl;

  let player: any = null;
  let cues: Array<{ s: number; e: number; t: string }> = [];
  let rafId = 0;

  async function getPlayer() {
    if (!player) {
      const { default: Plyr } = await import('plyr');
      player = new Plyr(`#${cfg.videoId}`, {
        captions: { active: false },
        controls: ['play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
      });
      player.on('pause', () => cancelAnimationFrame(rafId));
      player.on('play',  () => { rafId = requestAnimationFrame(rafLoop); });
    }
    return player;
  }

  async function loadVTT(url: string) {
    try {
      const text = await fetch(url).then((r) => r.text());
      const result: Array<{ s: number; e: number; t: string }> = [];
      for (const block of text.split(/\n\n+/)) {
        const lines = block.trim().split('\n');
        const ti = lines.findIndex((l) => l.includes('-->'));
        if (ti === -1) continue;
        const [s, e] = lines[ti].split('-->').map((p) => {
          const parts = p.trim().split(':');
          return +parts[0] * 3600 + +parts[1] * 60 + parseFloat(parts[2]);
        });
        const t = lines.slice(ti + 1).join(' ').trim();
        if (t && !isNaN(s) && !isNaN(e)) result.push({ s, e, t });
      }
      return result;
    } catch {
      return [];
    }
  }

  function rafLoop() {
    const videoEl = player?.media;
    if (videoEl && !videoEl.paused && cues.length) {
      const t = videoEl.currentTime;
      const cue = cues.find((c) => t >= c.s && t < c.e);
      if (!cue) {
        karaoke.innerHTML = '';
      } else {
        const words = cue.t.split(' ');
        const wordDur = (cue.e - cue.s) / words.length;
        const activeW = Math.min(Math.floor((t - cue.s) / wordDur), words.length - 1);
        const html = words.map((w, i) => {
          const col = i < activeW
            ? 'color:rgba(255,220,0,0.5)'
            : i === activeW
              ? 'color:#fff;text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000'
              : 'color:#FFE000;text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000';
          const esc = w.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          return `<span style="${col}">${esc}</span>`;
        }).join(' ');
        karaoke.innerHTML = `<span style="${cfg.lineStyle}">${html}</span>`;
      }
    }
    rafId = requestAnimationFrame(rafLoop);
  }

  async function openLb(mp4Src: string, trackSrc: string, poster: string, label: string) {
    lightboxTitle.textContent = label;
    if (cfg.analyticsGoal) {
      try { (window as any).ym?.(96499295, 'reachGoal', cfg.analyticsGoal, { src: mp4Src, title: label }); } catch {}
    }
    // Агрегатная цель «Открытие видео» — общая для VideoGallery/VideoCarouselVertical,
    // отдельно от опционального per-instance cfg.analyticsGoal.
    trackGoal('video_open', { src: mp4Src, title: label });
    lightbox.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';

    cues = await loadVTT(trackSrc);

    const p = await getPlayer();
    if (cfg.waitForCanplay) {
      p.media.addEventListener('canplay', () => p.play().catch(() => {}), { once: true });
      p.source = { type: 'video', poster, sources: [{ src: mp4Src, type: 'video/mp4' }] };
    } else {
      p.source = { type: 'video', poster, sources: [{ src: mp4Src, type: 'video/mp4' }] };
      p.play().catch(() => {});
    }
  }

  function closeLb() {
    cancelAnimationFrame(rafId);
    karaoke.innerHTML = '';
    cues = [];
    if (player) {
      player.stop();
      const videoEl = document.querySelector(`#${cfg.videoId}`) as HTMLVideoElement | null;
      if (videoEl) { videoEl.pause(); videoEl.removeAttribute('src'); videoEl.load(); }
    }
    lightbox.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  closeBtn.addEventListener('click', closeLb);
  overlay.addEventListener('click', closeLb);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLb(); });

  document.querySelectorAll<HTMLElement>(cfg.cardSelector).forEach((card) => {
    const open = () => {
      openLb(
        card.dataset.src!,
        card.dataset.track!,
        card.dataset.poster!,
        card.dataset.title!,
      );
    };
    card.addEventListener('click', open);
    // card — div role="button" (в button нельзя вкладывать div-разметку карточки), свой keydown
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });

  /* ── Carousel dots ── */
  const track = document.getElementById(cfg.trackId);
  const dots  = document.querySelectorAll<HTMLElement>(cfg.dotsSelector);
  if (!track || !dots.length) return;

  function setActive(i: number) {
    dots.forEach((d, idx) => d.classList.toggle('is-active', idx === i));
  }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      const slide = track.children[i] as HTMLElement;
      if (slide) {
        track.scrollTo({
          left: slide.offsetLeft - (track.offsetWidth - slide.offsetWidth) / 2,
          behavior: 'smooth',
        });
      }
      setActive(i);
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      let best = -1, bestRatio = 0;
      for (const e of entries) {
        if (e.intersectionRatio > bestRatio) {
          bestRatio = e.intersectionRatio;
          best = parseInt((e.target as HTMLElement).dataset.index ?? '0', 10);
        }
      }
      if (best >= 0 && bestRatio > 0.4) setActive(best);
    },
    { root: track, threshold: [0.4, 0.6, 0.8] },
  );
  track.querySelectorAll(cfg.slideSelector).forEach((s) => observer.observe(s));
}

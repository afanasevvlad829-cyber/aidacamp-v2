/**
 * age-adapt.ts — переключает текст элементов с data-age-adapt при выборе возраста.
 *
 * Использование на элементе:
 *   <span
 *     data-age-adapt
 *     data-age-default="Текст по умолчанию (когда не выбран)"
 *     data-age-7-9="Текст для 7-9"
 *     data-age-10-12="Текст для 10-12"
 *     data-age-13-15="Текст для 13-15"
 *   >Текст по умолчанию</span>
 *
 * Слушает event 'age-personalize' (диспатчит AgeBar/ShiftModal).
 * При загрузке страницы — читает sessionStorage.
 */
import { STORAGE_KEYS } from '../lib/storage';

type AgeKey = '7–9' | '10–12' | '13–15';

const ATTR_MAP: Record<AgeKey, string> = {
  '7–9': 'age7-9',
  '10–12': 'age10-12',
  '13–15': 'age13-15',
};

function applyAge(age: string) {
  const key = (age || '').replace('-', '–') as AgeKey; // нормализация
  const attrSuffix = ATTR_MAP[key];
  if (!attrSuffix) return;
  document.querySelectorAll<HTMLElement>('[data-age-adapt]').forEach((el) => {
    const v = el.dataset[attrSuffix as keyof DOMStringMap];
    if (v) el.textContent = v;
  });
}

function resetToDefault() {
  document.querySelectorAll<HTMLElement>('[data-age-adapt]').forEach((el) => {
    if (el.dataset.ageDefault) el.textContent = el.dataset.ageDefault;
  });
}

export function initAgeAdapt() {
  // На загрузке — если возраст выбран в текущей сессии, применить
  const saved = sessionStorage.getItem(STORAGE_KEYS.selectedAge);
  if (saved) applyAge(saved);
  // При выборе возраста — переключить
  document.addEventListener('age-personalize', ((e: Event) => {
    const detail = (e as CustomEvent<{ age: string }>).detail;
    if (detail?.age) applyAge(detail.age);
  }) as EventListener);
}

if (typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', initAgeAdapt);
  if (document.readyState !== 'loading') initAgeAdapt();
}

/**
 * storage.ts — единый реестр ключей sessionStorage / localStorage.
 *
 * Было: 41 хардкод-строка ('selected_age', 'user_age_group', etc.) по компонентам.
 * Стало: одно место — изменил ключ здесь, изменил везде.
 *
 * Соглашение: префикс `ac:` + snake_case + тип хранилища в комментарии.
 */
export const STORAGE_KEYS = {
  /** sessionStorage — возраст ребёнка, выбранный в AgeBar (сбрасывается на закрытие вкладки) */
  selectedAge:        'ac:selected_age',
  /** localStorage — возраст, сохранённый надолго (персонализация при следующих визитах) */
  userAgeGroup:       'ac:user_age_group',
  /** sessionStorage — был ли показан свайп-хинт на смены */
  shiftsSwiped:       'ac:shifts_swiped',
  /** sessionStorage — была ли AgeBar скрыта пользователем вручную */
  ageBarDismissed:    'ac:age_bar_dismissed',
  /** sessionStorage — список уже сработавших целей Метрики (дедупликация) */
  ymFired:            'ym_fired',
  /** sessionStorage — UTM-атрибуция для обогащения лида */
  attribution:        'ac_attribution',
  /** localStorage — список просмотренных смен [{id, ts}], для детекции второго визита */
  viewedShifts:       'ac:viewed_shifts',
  /** sessionStorage — последняя отправленная заявка {k: 'телефон|смена', ts} — защита от повторного сабмита */
  leadSent:           'ac:lead_sent',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

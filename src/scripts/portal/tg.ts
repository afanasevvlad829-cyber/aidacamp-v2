type WebApp = any;
export const tg = (): WebApp | null => (globalThis as any)?.Telegram?.WebApp ?? null;

/** TG showConfirm, иначе нативный confirm. Всегда Promise<boolean>. */
export function confirmDialog(message: string): Promise<boolean> {
  const w = tg();
  if (w?.showConfirm) {
    return new Promise((resolve) => w.showConfirm(message, (ok: boolean) => resolve(!!ok)));
  }
  return Promise.resolve(window.confirm(message));
}

/** TG showAlert, иначе нативный alert. */
export function alertDialog(message: string): Promise<void> {
  const w = tg();
  if (w?.showAlert) {
    return new Promise((resolve) => w.showAlert(message, () => resolve()));
  }
  window.alert(message);
  return Promise.resolve();
}

/** Тактильный отклик; no-op вне Telegram. */
export function haptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light'): void {
  const h = tg()?.HapticFeedback;
  if (!h) return;
  if (type === 'success' || type === 'error') h.notificationOccurred(type);
  else h.impactOccurred(type);
}

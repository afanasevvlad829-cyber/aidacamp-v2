type WebApp = any;
export const tg = (): WebApp | null => (globalThis as any)?.Telegram?.WebApp ?? null;

/** TG showConfirm, иначе нативный confirm. Всегда Promise<boolean>.
 *  Fallback на window.confirm если TG WebApp < v7 бросает WebAppMethodUnsupported. */
export function confirmDialog(message: string): Promise<boolean> {
  const w = tg();
  if (w?.showConfirm) {
    return new Promise((resolve) => {
      try {
        w.showConfirm(message, (ok: boolean) => resolve(!!ok));
      } catch {
        resolve(window.confirm(message));
      }
    });
  }
  return Promise.resolve(window.confirm(message));
}

/** TG showAlert, иначе нативный alert.
 *  Fallback на window.alert если TG WebApp < v7 бросает WebAppMethodUnsupported. */
export function alertDialog(message: string): Promise<void> {
  const w = tg();
  if (w?.showAlert) {
    return new Promise((resolve) => {
      try {
        w.showAlert(message, () => resolve());
      } catch {
        window.alert(message);
        resolve();
      }
    });
  }
  window.alert(message);
  return Promise.resolve();
}

/** Тактильный отклик; no-op вне Telegram. */
export function haptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light'): void {
  const h = tg()?.HapticFeedback;
  if (!h) return;
  try {
    if (type === 'success' || type === 'error') h.notificationOccurred(type);
    else h.impactOccurred(type);
  } catch { /* v6.0 unsupported */ }
}

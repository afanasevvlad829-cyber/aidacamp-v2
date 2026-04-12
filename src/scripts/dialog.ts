/** Initialize a dialog: backdrop click to close + optional close button */
export function initDialog(id: string, closeSelector?: string): HTMLDialogElement | null {
  const dialog = document.getElementById(id) as HTMLDialogElement | null;
  if (!dialog) return null;

  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });

  if (closeSelector) {
    dialog.querySelector(closeSelector)?.addEventListener('click', () => dialog.close());
  }

  return dialog;
}

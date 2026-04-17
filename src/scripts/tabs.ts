/**
 * Утилита переключения табов.
 * activeClasses / inactiveClasses — массивы Tailwind-классов.
 */
export function initTabs(
  container: Element | Document,
  btnSelector: string,
  activeClasses: string[],
  inactiveClasses: string[],
  onSwitch?: (btn: HTMLElement, idx: number) => void
) {
  const btns = Array.from(container.querySelectorAll<HTMLElement>(btnSelector));
  btns.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      btns.forEach(b => {
        b.classList.remove(...activeClasses);
        b.classList.add(...inactiveClasses);
      });
      btn.classList.remove(...inactiveClasses);
      btn.classList.add(...activeClasses);
      onSwitch?.(btn, idx);
    });
  });
}

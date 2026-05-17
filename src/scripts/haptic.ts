/**
 * Haptic feedback via Web Audio API.
 * Works on iOS Safari (Taptic Engine).
 * On other browsers — silently fails in try/catch.
 * IMPORTANT: call only inside user event handler (click/touchend).
 */
export function hapticTap(): void {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.001; // practically silent
    osc.start();
    osc.stop(ctx.currentTime + 0.001);
    setTimeout(() => ctx.close(), 100);
  } catch (_) {
    // Silently ignore — browser doesn't support or blocked
  }
}

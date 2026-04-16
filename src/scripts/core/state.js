(function () {
  "use strict";

  window.AC_CORE = window.AC_CORE || {};

  /**
   * @typedef {Object} AppState
   * @property {"compact"|"full"} mode
   * @property {string} activeTab
   * @property {number} step
   * @property {string} direction
   * @property {number} age
   * @property {"list"|"grid"} shiftView
   * @property {string} selectedShiftId
   * @property {{contact:boolean, shifts:boolean}} overlays
   */

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
  }

  function validateMode(value) {
    return value === "full" ? "full" : "compact";
  }

  function validateAge(value) {
    var age = clamp(Number(value) || 11, 7, 14);
    return Number.isFinite(age) ? age : 11;
  }

  function validateShiftView(value) {
    return value === "grid" ? "grid" : "list";
  }

  function validateOverlays(value) {
    var safe = value && typeof value === "object" ? value : {};
    return {
      contact: !!safe.contact,
      shifts: !!safe.shifts
    };
  }

  function normalizeState(candidate) {
    var c = candidate && typeof candidate === "object" ? candidate : {};
    return {
      mode: validateMode(c.mode),
      activeTab: String(c.activeTab || "info"),
      step: Math.max(0, Number(c.step || 0)),
      direction: String(c.direction || "base"),
      age: validateAge(c.age),
      shiftView: validateShiftView(c.shiftView),
      selectedShiftId: String(c.selectedShiftId || "shift-1"),
      overlays: validateOverlays(c.overlays)
    };
  }

  window.AC_CORE.state = {
    validateMode: validateMode,
    validateAge: validateAge,
    validateShiftView: validateShiftView,
    validateOverlays: validateOverlays,
    normalizeState: normalizeState
  };
})();

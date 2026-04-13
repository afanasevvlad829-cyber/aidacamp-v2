(function () {
  "use strict";

  window.AC_CORE = window.AC_CORE || {};

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value)));
  }

  window.AC_CORE.actions = {
    hasOwn: hasOwn,
    clamp: clamp
  };
})();

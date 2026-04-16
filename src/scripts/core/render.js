(function () {
  "use strict";

  window.AC_CORE = window.AC_CORE || {};

  function safeText(value) {
    return String(value == null ? "" : value);
  }

  window.AC_CORE.render = {
    safeText: safeText
  };
})();

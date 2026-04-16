(function () {
  "use strict";

  window.AC_FEATURES = window.AC_FEATURES || {};
  var config = window.AC_NOTIFY_CONFIG || {};
  var DEBUG = !!window.AC_DEBUG;

  function resolveNotifyUrl(eventName) {
    if (!config || typeof config !== "object") return "";
    if (hasOwn(config, eventName) && config[eventName]) {
      return String(config[eventName]);
    }
    if (config.all) {
      return String(config.all);
    }
    return "";
  }

  function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function postJson(url, payload) {
    if (!url || !window.fetch) {
      return Promise.resolve(false);
    }
    return window.fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload || {}),
      keepalive: true
    }).then(function (response) {
      return !!(response && response.ok);
    }).catch(function () {
      return false;
    });
  }

  function buildTelegramText(eventName, payload) {
    var lines = [];
    lines.push("AidaCamp lead event");
    lines.push("Тип: " + String(eventName || ""));

    if (payload && typeof payload === "object") {
      var preferredOrder = [
        "status",
        "lead_type",
        "phone",
        "name",
        "shift_name",
        "shift_date",
        "shift_days",
        "price_final",
        "price_text",
        "promo_code",
        "promo_expires_at_local",
        "city",
        "region",
        "country",
        "ip",
        "sent_at_local",
        "mode",
        "active_tab",
        "step"
      ];

      for (var i = 0; i < preferredOrder.length; i += 1) {
        var key = preferredOrder[i];
        if (!hasOwn(payload, key) || payload[key] === "" || payload[key] === null || payload[key] === undefined) continue;
        lines.push(key + ": " + String(payload[key]));
      }
    }

    return lines.join("\n");
  }

  function postTelegram(eventName, payload) {
    var token = String(config.telegramBotToken || "");
    var chatId = String(config.telegramChatId || "");
    if (!token || !chatId || !window.fetch) {
      return Promise.resolve(false);
    }

    return window.fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: buildTelegramText(eventName, payload),
        disable_web_page_preview: true
      }),
      keepalive: true
    }).then(function (response) {
      return !!(response && response.ok);
    }).catch(function () {
      return false;
    });
  }

  window.AC_FEATURES.track = function track(eventName, payload) {
    var safePayload = payload && typeof payload === "object" ? payload : {};

    try {
      if (window.analytics && typeof window.analytics.track === "function") {
        window.analytics.track(eventName, safePayload);
        return;
      }
    } catch (_err) {
      // fallback to console
    }

    if (DEBUG) {
      try {
        console.log("[analytics]", eventName, safePayload);
      } catch (_err2) {
        // noop
      }
    }
  };

  window.AC_FEATURES.notifyLead = function notifyLead(eventName, payload) {
    var safeName = String(eventName || "lead_event");
    var safePayload = payload && typeof payload === "object" ? payload : {};
    var url = resolveNotifyUrl(safeName);

    if (!url) {
      return postTelegram(safeName, safePayload).then(function (sent) {
        if (sent) return true;
        if (DEBUG) {
          try {
            console.log("[notify]", safeName, safePayload);
          } catch (_err) {
            // noop
          }
        }
        return false;
      });
    }

    return postJson(url, {
      event: safeName,
      payload: safePayload
    }).then(function (sentWebhook) {
      if (sentWebhook) return true;
      return postTelegram(safeName, safePayload).then(function (sentTelegram) {
        if (sentTelegram) return true;
        if (DEBUG) {
          try {
            console.log("[notify]", safeName, safePayload);
          } catch (_err2) {
            // noop
          }
        }
        return false;
      });
    });
  };
})();

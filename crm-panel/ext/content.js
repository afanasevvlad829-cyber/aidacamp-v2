// content.js — runs on codim.s20.online
// 1) Detects current customer ID from URL
// 2) Handles microphone recording for side panel (Speech API works here)

let lastCustomerId = null;

function extractCustomerId() {
  const m = window.location.href.match(/[?&]id=(\d+)/);
  return m ? m[1] : null;
}

function notifyPanelIfChanged() {
  const id = extractCustomerId();
  if (id && id !== lastCustomerId) {
    lastCustomerId = id;
    chrome.runtime.sendMessage({ type: "CRM_CUSTOMER_CHANGED", customerId: id });
  }
}

// Watch URL changes (SPA navigation)
notifyPanelIfChanged();
const observer = new MutationObserver(notifyPanelIfChanged);
observer.observe(document.body, { childList: true, subtree: true });
let lastHref = location.href;
setInterval(() => {
  if (location.href !== lastHref) {
    lastHref = location.href;
    notifyPanelIfChanged();
  }
}, 500);

// ── Microphone recording ──────────────────────────────────────────────────────
let micRec = null;

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'START_MIC') startMic();
  if (msg.type === 'STOP_MIC')  stopMic();
});

function stopMic() {
  if (micRec) { try { micRec.stop(); } catch(e) {} }
}

function startMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    chrome.runtime.sendMessage({ type: 'MIC_ERROR', error: 'not-supported' });
    return;
  }

  stopMic(); // stop any previous session

  micRec = new SR();
  micRec.lang = 'ru-RU';
  micRec.continuous = true;
  micRec.interimResults = true;

  let finalText = '';

  micRec.onstart = () => {
    chrome.runtime.sendMessage({ type: 'MIC_STARTED' });
  };

  micRec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) {
        finalText += t;
      } else {
        interim += t;
      }
    }
    // Stream interim text so panel shows real-time transcription
    chrome.runtime.sendMessage({ type: 'MIC_INTERIM', text: finalText + interim });
  };

  micRec.onerror = (e) => {
    chrome.runtime.sendMessage({ type: 'MIC_ERROR', error: e.error });
    micRec = null;
  };

  micRec.onend = () => {
    chrome.runtime.sendMessage({ type: 'MIC_RESULT', text: finalText.trim() });
    micRec = null;
  };

  micRec.start();
}

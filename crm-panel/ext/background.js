// background.js — message routing + side panel open on action click
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Forward messages from content script → side panel
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const forward = ['CRM_CUSTOMER_CHANGED', 'MIC_STARTED', 'MIC_INTERIM', 'MIC_RESULT', 'MIC_ERROR'];
  if (forward.includes(msg.type)) {
    chrome.runtime.sendMessage(msg).catch(() => {});
  }
});

let enabledTabs = {};

chrome.action.onClicked.addListener(async (tab) => {
  const tabId = tab.id;
  const isEnabled = enabledTabs[tabId];

  if (isEnabled) {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.dispatchEvent(new CustomEvent('copykit-toggle', { detail: false }))
    });
    chrome.action.setIcon({ tabId, path: "icon48.png" });
    delete enabledTabs[tabId];
  } else {
    // Inject content.js
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });

    // 🔁 Immediately trigger toggle ON event after injection
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        window.dispatchEvent(new CustomEvent('copykit-toggle', { detail: true }));
      }
    });

    chrome.action.setIcon({ tabId, path: "icon-on.png" });
    enabledTabs[tabId] = true;
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'deactivate') {
    const tabId = sender.tab.id;
    chrome.action.setIcon({ tabId, path: 'icon48.png' });
    delete enabledTabs[tabId];
  }
});
  
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "save_i18n_data") {
      const domain = new URL(sender.tab.url).hostname;
  
      // Get existing data for the tenant domain
      chrome.storage.local.get([domain], (result) => {
        const existingData = result[domain] || [];
  
        // Filter out duplicate keys and append new ones
        const newKeys = message.data.filter(item => 
          !existingData.some(existingItem => Object.keys(existingItem)[0] === Object.keys(item)[0])
        );
  
        // Merge existing and new data
        const updatedData = [...existingData, ...newKeys];
  
        // Persist the updated data
        chrome.storage.local.set({ [domain]: updatedData }, () => {
          // console.log(`Updated i18n data for ${domain}:`, updatedData);
        });
      });
    }
  });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getTabUrl') {
    // Get the active tab's URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        sendResponse({ url: tabs[0].url });
      }
    });
    return true;  // Needed to allow asynchronous sendResponse
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-interactive-mode") {
    // Get the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];

      // Send a message to toggle the Editable Mode in the content script
      chrome.tabs.sendMessage(activeTab.id, { action: 'toggleInteractiveMode' });
    });
  }
});
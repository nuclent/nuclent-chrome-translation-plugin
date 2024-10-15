document.addEventListener("DOMContentLoaded", () => {
    // Fetch data when the popup is loaded
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const domain = new URL(tabs[0].url).hostname; // Get the tenant domain
        const tabId = tabs[0].id; // Get the active tab ID

        // Fetch the latest i18n data from storage
        chrome.storage.local.get([domain], (result) => {
            const i18nList = document.getElementById("i18n-list");
            const i18nData = result[domain] || [];
            const counterElement = document.getElementById("counter");
            const copyButton = document.getElementById("copy-button");
            const resetButton = document.getElementById("reset-button");
            const interactiveToggle = document.getElementById("interactive-toggle");
            const editToggle = document.getElementById("edit-toggle");
            const copyMessage = document.getElementById("copy-message");

            // Set counter
            counterElement.textContent = `Total keys: ${i18nData.length}`;

            // Clear the list before displaying
            i18nList.innerHTML = '';

            // Display the latest i18n keys and values
            if (i18nData.length > 0) {
                i18nData.forEach(item => {
                    const key = Object.keys(item)[0];
                    const value = item[key];
                    const li = document.createElement('li');
                    li.textContent = `"${key}": "${value}"`;
                    i18nList.appendChild(li);
                });
            } else {
                i18nList.textContent = "No data-i18n attributes found.";
            }

            // Check if interactive mode is enabled
            chrome.tabs.sendMessage(tabId, { action: 'getInteractiveModeStatus' }, (response) => {
                interactiveToggle.checked = response.interactiveModeEnabled;
            });

            // Check if edit mode is enabled
            chrome.tabs.sendMessage(tabId, { action: 'getEditStatus' }, (response) => {
                editToggle.checked = response.editable;
            });

            // Copy to Clipboard functionality (as dictionary)
            copyButton.addEventListener("click", () => {
                // Convert array of key-value pairs into a single object (dictionary)
                const dictionary = {};
                i18nData.forEach(item => {
                    const key = Object.keys(item)[0];
                    const value = item[key];
                    dictionary[key] = value;
                });

                // Convert the dictionary into a JSON string
                const textToCopy = JSON.stringify(dictionary, null, 2);

                // Create a temporary textarea to hold the text for copying
                const textarea = document.createElement("textarea");
                textarea.value = textToCopy;
                document.body.appendChild(textarea);

                // Select and copy the text
                textarea.select();
                document.execCommand("copy");

                // Remove the temporary textarea
                document.body.removeChild(textarea);

                // Show confirmation message (Copied)
                copyMessage.style.display = "block";
                setTimeout(() => {
                    copyMessage.style.display = "none";
                }, 2000);
            });

            // Reset functionality
            resetButton.addEventListener("click", () => {
                chrome.storage.local.remove([domain], () => {
                    // Clear the popup content and reset counter
                    i18nList.innerHTML = '';
                    counterElement.textContent = "Total keys: 0";
                    console.log(`Cleared i18n data for ${domain}.`);
                });
            });

            // Toggle interactive mode
            interactiveToggle.addEventListener("change", (event) => {
                const isChecked = event.target.checked;
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    const activeTab = tabs[0];
                    if (isChecked) {
                        chrome.tabs.sendMessage(activeTab.id, { action: 'enableInteractiveMode' });
                    } else {
                        chrome.tabs.sendMessage(activeTab.id, { action: 'disableInteractiveMode' });
                    }
                });
            });

            editToggle.addEventListener("change", (event) => {
                const isChecked = event.target.checked;
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    const activeTab = tabs[0];
                    if (isChecked) {
                        chrome.tabs.sendMessage(activeTab.id, { action: 'enableEdit' });
                    } else {
                        chrome.tabs.sendMessage(activeTab.id, { action: 'disableEdit' });
                    }
                });
            });
        });
    });
});
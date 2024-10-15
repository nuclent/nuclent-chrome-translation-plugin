// Fetch the access token from localStorage
function getToken() {
    const tokenData = JSON.parse(localStorage.getItem('@nFlow/TOKEN_DATA'));
    if (tokenData && tokenData.accessToken) {
        return tokenData.accessToken;
    }
    return null;
}

// Utility to extract tenant and domain from the current tab URL
function getTenantAndDomain(url) {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    // Extract the tenant (the first part of the subdomain)
    const tenant = hostname.split('.')[0];

    // Extract the domain (everything after the first part of the subdomain)
    const domain = hostname

    return { tenant, domain };
}

// Fetch the available languages from the API
function fetchAvailableLanguages() {
    const {domain} = getTenantAndDomain(document.location.href);
    return fetch(`https://${domain}/v1/info`)
        .then(response => response.json())
        .then(data => data.languages || [])
        .catch(error => {
            console.error('Error fetching languages:', error);
            return [];
        });
}

// Get existing translations for a specific language
function getTranslation(languageCode) {
    const token = getToken();
    if (!token) return Promise.reject("Token not available");
    const {tenant, domain} = getTenantAndDomain(document.location.href);
    return fetch(`https://${domain}/v1/translations/${languageCode}`, {
        headers: {
            'authorization': `Bearer ${token}`,
            'accept': 'application/json',
            'x-nc-tenant': tenant
        }
    })
        .then(response => response.json())
        .then(data => data.translation || {})
        .catch(error => {
            console.error(`Error fetching translation for ${languageCode}:`, error);
            return {};
        });
}

// Submit updated translation
function updateTranslation(languageCode, updatedTranslation) {
    const token = getToken();
    if (!token) return Promise.reject("Token not available");
    const {tenant, domain} = getTenantAndDomain(document.location.href);
    return fetch(`https://${domain}/v1/organization/translations/${languageCode}`, {
        method: 'POST',
        headers: {
            'authorization': `Bearer ${token}`,
            'accept': 'application/json',
            'content-type': 'application/json',
            'x-nc-tenant': tenant
        },
        body: JSON.stringify({ translation: updatedTranslation })
    })
        .then(response => response.json())
        .catch(error => {
            console.error(`Error updating translation for ${languageCode}:`, error);
        });
}

// Inject the translation popup into the website
async function injectTranslationPopup() {
    const languages = await fetchAvailableLanguages(); // Fetch languages (or use cache)

    let languageOptions = languages.map(lang => `<option value="${lang}">${lang}</option>`).join('');

    const popupHTML = `
        <div id="translation-popup" style="display:none; position:absolute; z-index:1000; background:white; border:1px solid #ccc; padding:15px; box-shadow:0px 4px 8px rgba(0,0,0,0.1);">
            <h3>Enter Translation</h3>
            <p id="selected-key"></p>
            <label for="language-select">Select Language:</label>
            <select id="language-select">
                ${languageOptions}
            </select>
            <br/><br/>
            <label for="translation-input">Translation:</label>
            <textarea id="translation-input" rows="4" cols="40" placeholder="Enter translation..."></textarea>
            <br/><br/>
            <button id="save-translation">Save</button>
            <button id="cancel-translation">Cancel</button>
        </div>
    `;

    const popupContainer = document.createElement('div');
    popupContainer.innerHTML = popupHTML;
    document.body.appendChild(popupContainer);

    // Hide the popup when Cancel is clicked
    document.getElementById('cancel-translation').addEventListener('click', () => {
        document.getElementById('translation-popup').style.display = 'none';
    });

    // Load existing translations when a language is selected
    document.getElementById('language-select').addEventListener('change', async (event) => {
        const languageCode = event.target.value;
        const i18nKey = document.getElementById('selected-key').textContent;

        const translationData = await getTranslation(languageCode);
        const translationValue = findTranslationForKey(translationData, i18nKey);

        document.getElementById('translation-input').value = translationValue || '';  // Pre-fill existing translation
    });

    // Save updated translation when Save button is clicked
    document.getElementById('save-translation').addEventListener('click', async () => {
        const i18nKey = document.getElementById('selected-key').textContent;
        const language = document.getElementById('language-select').value;
        const newTranslation = document.getElementById('translation-input').value;

        // Fetch the current translation object
        const translationData = await getTranslation(language);

        // Add or update the new translation key-value
        updateTranslationData(translationData, i18nKey, newTranslation);

        // Send the updated translation object back to the API
        await updateTranslation(language, translationData);  // Submit updated translation

        document.getElementById('translation-popup').style.display = 'none';
        console.log(`Updated translation for ${i18nKey} in ${language}: ${newTranslation}`);
    });
}

// Helper function to find the existing translation for the i18nKey
function findTranslationForKey(translationData, i18nKey) {
    let keys = i18nKey.split('.');
    let result = translationData;
    for (let key of keys) {
        result = result[key];
        if (!result) return null;
    }
    return result;
}

// Helper function to update the translation data with the new value
function updateTranslationData(translationData, i18nKey, newTranslation) {
    let keys = i18nKey.split('.');
    let lastKey = keys.pop();
    let target = translationData;

    // Traverse the translation data and update the final key with the new translation
    for (let key of keys) {
        target[key] = target[key] || {};
        target = target[key];
    }
    target[lastKey] = newTranslation;
}

// Show the translation popup at the cursor position
function showTranslationPopup(i18nKey, x, y) {
    const popup = document.getElementById('translation-popup');
    document.getElementById('selected-key').textContent = i18nKey;
    document.getElementById('translation-input').value = ''; // Clear previous input
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    popup.style.display = 'block';
}

let interactiveModeEnabled = false;
let editable = false;

function toggleInteractiveMode() {
    if (interactiveModeEnabled) {
        disableInteractiveMode();
    } else {
        enableInteractiveMode();
    }
}



// Function to handle click events in interactive mode
function handleInteractiveClick(event) {
    if (!editable) return;
    event.preventDefault();  // Prevent default behavior like navigation
    event.stopPropagation(); // Stop the event from propagating up the DOM

    const i18nKey = event.target.getAttribute('data-i18n');
    const x = event.pageX;
    const y = event.pageY;
    showTranslationPopup(i18nKey, x, y);  // Show the popup at the cursor position
}
// Function to apply interactive mode to elements
function applyInteractiveMode(elements) {
    elements.forEach(element => {
        element.style.backgroundColor = 'pink'; // Highlight the element
        element.style.cursor = 'pointer';
        element.addEventListener('click', handleInteractiveClick);
    });
}

function enableEdit() {
    editable = true;
}
function disableEdit() {
    editable = false;
}

// Function to enable interactive mode
function enableInteractiveMode() {
    injectTranslationPopup();  // Ensure the popup is injected
    interactiveModeEnabled = true;
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        element.style.backgroundColor = 'pink'; // Highlight the element
        element.style.cursor = 'pointer';
        element.addEventListener('click', handleInteractiveClick);
    });
}

// Function to disable interactive mode
function disableInteractiveMode() {
    interactiveModeEnabled = false;
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        element.style.backgroundColor = '';  // Remove the highlight
        element.style.cursor = '';
        element.removeEventListener('click', handleInteractiveClick);  // Remove click event listeners
    });

    document.getElementById('translation-popup').style.display = 'none';  // Hide the popup
}

// Function to extract data-i18n attributes
function extractI18nAttributes() {
    const elements = document.querySelectorAll('[data-i18n]');
    let i18nData = [];

    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        const value = element.textContent.trim() || element.value || "No visible value";
        if (key) {
            i18nData.push({ [key]: value });
        }
    });

    return i18nData;
}

// Send the extracted data to the background for storage
function sendDataToBackground() {
    const data = extractI18nAttributes();
    chrome.runtime.sendMessage({ action: "save_i18n_data", data: data });
}

// Set up MutationObserver to watch for dynamic content changes
const observer = new MutationObserver((mutations) => {
    mutations.forEach(() => {
        sendDataToBackground();

        if (interactiveModeEnabled) {
            // Apply interactive mode to any new elements added dynamically
            const newElements = document.querySelectorAll('[data-i18n]');
            applyInteractiveMode(newElements);
        }
    });
});

// Start observing the document body for changes
observer.observe(document.body, { childList: true, subtree: true });

// Send the data once the script runs initially
sendDataToBackground();

// Listen for messages from the popup to enable/disable interactive mode
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'enableInteractiveMode') {
        enableInteractiveMode();
    } else if (message.action === 'disableInteractiveMode') {
        disableInteractiveMode();
    } else if (message.action === 'getInteractiveModeStatus') {
        sendResponse({interactiveModeEnabled});
    } else if (message.action === 'getEditStatus') {
        sendResponse({editable});
    } else if (message.action === 'toggleInteractiveMode') {
        toggleInteractiveMode();
    } else if (message.action === 'enableEdit') {
        enableEdit();
    } else if (message.action === 'disableEdit') {
        disableEdit();
    }
});
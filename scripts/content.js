
function getWebsite() {
    return globalThis.getWebsiteByUrl(document.URL);
}

function handleMessage(filter) {
    getWebsite().updateFilter(filter);
    getWebsite().filterAndSortTable();
}

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request) => {
    if (request.filter) {
        handleMessage(JSON.parse(request.filter))
    }
});

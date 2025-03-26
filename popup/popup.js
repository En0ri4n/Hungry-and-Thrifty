import '../common/shared.js';

globalThis.SORT_FILTER.on('change', (evt) => {});
globalThis.PRICE_FILTER_ACTIVE.on('change', (evt) => {
    PRICE_FILTER.getElement().disabled = !evt.target.checked;
});

globalThis.PRICE_FILTER.on('input', (evt) => {
    document.getElementById('price-filter-label').querySelector('.filter-display-value').innerText = evt.target.value;
});


globalThis.SEARCH_FILTER.on('input', (evt) => {})
globalThis.SEARCH_FILTER_ACTIVE.on('change', (evt) => {
    globalThis.SEARCH_FILTER.getElement().disabled = !evt.target.checked;
});

globalThis.RESET_FILTER.on('click', (evt) => {
    globalThis.SORT_FILTER.getElement().selectedIndex = 0; // Reset sort
    globalThis.PRICE_FILTER_ACTIVE.getElement().checked = false;
    globalThis.PRICE_FILTER.getElement().value = 10; // Reset max price
    globalThis.PRICE_FILTER.getElement().dispatchEvent(new Event('input')); // Dispatch event to update display
});

function getCurrentUrl() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
            const url = tabs[0].url;
            resolve(url);
        });
    })
}

function setDisplay(selector, value) {
    document.querySelectorAll(selector).forEach(element => element.style.display = value);
}

async function onLoad() {
    const currentUrl = await getCurrentUrl();

    setDisplay('#unsupported-site', 'none');
    setDisplay('.supported', 'none');

    if (!currentUrl.includes('hoplunch') && !currentUrl.includes('refectory')) {
        setDisplay('#unsupported-site', 'block');
        return;
    } else {
        setDisplay('.supported', 'block');
    }

    chrome.storage.local.get("popupState", data => {
        globalThis.SORT_FILTER.getElement().selectedIndex = data.popupState.sortOrderIndex;
        globalThis.PRICE_FILTER_ACTIVE.getElement().checked = data.popupState.priceFilterCheck;
        globalThis.PRICE_FILTER.getElement().value = data.popupState.maxPrice;

        // Updates
        globalThis.SORT_FILTER.getElement().dispatchEvent(new Event('change'))
        globalThis.PRICE_FILTER_ACTIVE.getElement().dispatchEvent(new Event('change'))
        globalThis.PRICE_FILTER.getElement().dispatchEvent(new Event('input'))
    });
}

function save() {
    // const currentWebsite =
    chrome.storage.local.set({ popupState: { sortOrderIndex: sortFilterSelect.selectedIndex, priceFilterCheck: priceFilterCheckbox.checked, maxPrice: maxPriceSlider.value } })
}

window.onload = onLoad;

const sortFilterSelect = document.getElementById("sort-filter");
const priceFilterCheckbox = document.getElementById('price-filter');
const maxPriceSlider = document.getElementById('max-price');
const resetButton = document.getElementById('reset');

sortFilterSelect.addEventListener("change", (evt) => {
    sendMessageToContent('sort;' + evt.target.value);
    save();
});

priceFilterCheckbox.addEventListener('change', (evt) => {
    maxPriceSlider.disabled = !evt.target.checked;
    sendMessageToContent('maxPriceToggle;' + evt.target.checked)
    save();
});

maxPriceSlider.addEventListener('input', (evt) => {
    document.getElementById('price-filter-label').querySelector('.filter-display-value').innerText = evt.target.value;
    sendMessageToContent('price;' + evt.target.value);
    save();
});

resetButton.addEventListener('click', (evt) => {
    sortFilterSelect.selectedIndex = 0; // Reset sort
    priceFilterCheckbox.checked = false;
    maxPriceSlider.value = 10; // Reset max price
    maxPriceSlider.dispatchEvent(new Event('input')); // Dispatch event to update display
    sendMessageToContent('reset');
    save();
});

function sendMessageToContent(msg) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { message: msg });
    });
}

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
        sortFilterSelect.selectedIndex = data.popupState.sortOrderIndex;
        priceFilterCheckbox.checked = data.popupState.priceFilterCheck;
        maxPriceSlider.value = data.popupState.maxPrice;

        // Updates
        sortFilterSelect.dispatchEvent(new Event('change'))
        priceFilterCheckbox.dispatchEvent(new Event('change'))
        maxPriceSlider.dispatchEvent(new Event('input'))
    });
}

function save() {
    chrome.storage.local.set({ popupState: { sortOrderIndex: sortFilterSelect.selectedIndex, priceFilterCheck: priceFilterCheckbox.checked, maxPrice: maxPriceSlider.value } })
}

window.onload = onLoad;

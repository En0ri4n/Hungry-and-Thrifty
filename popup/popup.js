import '../common/shared.js';

globalThis.SORT_FILTER.onUpdate('change', async (evt, filterInstance) => { await save(filterInstance); });
globalThis.PRICE_FILTER_ACTIVE.onUpdate('change', async (evt, filterInstance) => {
    PRICE_FILTER.getElement().disabled = !evt.target.checked;
    await save(filterInstance);
});

globalThis.PRICE_FILTER.onUpdate('input', async (evt, filterInstance) => {
    document.getElementById('price-filter-label').querySelector('.filter-display-value').innerText = evt.target.value;
    await save(filterInstance);
});


globalThis.SEARCH_FILTER.onUpdate('input', (evt, filterInstance) => { save(filterInstance); })
globalThis.SEARCH_FILTER_ACTIVE.onUpdate('change', async (evt, filterInstance) => {
    globalThis.SEARCH_FILTER.getElement().disabled = !evt.target.checked;
    await save(filterInstance);
});

globalThis.RESET_FILTER.onUpdate('click', async (evt, filterInstance) => {
    globalThis.SORT_FILTER.getElement().selectedIndex = 0; // Reset sort
    globalThis.PRICE_FILTER_ACTIVE.getElement().checked = false;
    globalThis.PRICE_FILTER.getElement().value = 10; // Reset max price
    globalThis.PRICE_FILTER.getElement().dispatchEvent(new Event('input')); // Dispatch event to update display
    globalThis.SEARCH_FILTER_ACTIVE.getElement().checked = false;
    globalThis.SEARCH_FILTER.getElement().value = '';
    globalThis.SEARCH_FILTER.getElement().dispatchEvent(new Event('input'))
    await save(filterInstance);
});

async function getWebsite() {
    return getWebsiteByUrl(await getCurrentUrl());
}

function getCurrentUrl() {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({active: true}, function (tabs) {
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

    console.log(globalThis.WEBSITES)

    if (!globalThis.WEBSITES.some(website => currentUrl.includes(website.url))) {
        setDisplay('#unsupported-site', 'block');
        return;
    }

    setDisplay('.supported', 'block');

    load();
}

function load() {
    chrome.storage.local.get("popupDataState", async data => {
        const website = getWebsiteByUrl(await getCurrentUrl());
        website.loadFilters(data.popupDataState);
        globalThis.FILTERS.forEach(ff => {
            ff.setElementValue(website.getFilter(ff.uniqueId).value);
            ff.getElement().dispatchEvent(new Event('change'))
            ff.getElement().dispatchEvent(new Event('input'))
        });
    });
}

async function save(filter) {
    const website = await getWebsite();
    website.updateFilter(filter.toFilter());

    const json = getWebsiteByUrl(await getCurrentUrl()).saveFilters();
    await chrome.storage.local.set({popupDataState: json});
}

window.onload = onLoad();

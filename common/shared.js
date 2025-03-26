/* ======== Filters Definition ======== */
class WebsiteFilter {
    constructor(id, value) {
        this.id = id;
        this.value = value;
    }
}

class FoodFilter {
    constructor(name, domId, uniqueId, getValue) {
        this.name = name;
        this.domId = domId;
        this.uniqueId = uniqueId;
        this.getValue = getValue;
    }

    getElement() {
        return document.getElementById(this.domId);
    }

    on(eventName, onEvent) {
        this.getElement().addEventListener(eventName, (evt) =>
        {
            onEvent(evt);
            this.sendUpdates();
        });
    }

    toFilter() {
        return new WebsiteFilter(this.uniqueId, this.getValue(this.getElement()));
    }

    sendUpdates() {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            await chrome.tabs.sendMessage(tabs[0].id, {filter: JSON.stringify(this.toFilter())});
        });
    }
}

globalThis.SORT_FILTER = new FoodFilter('Sorting Filter', 'sort-filter', 'sortingValue', (el) => el.value);
globalThis.PRICE_FILTER_ACTIVE = new FoodFilter('Active Price Filter', 'price-filter', 'activePriceFiltering', (el) => el.checked);
globalThis.PRICE_FILTER = new FoodFilter('Price Filter', 'max-price', 'priceFilteringValue', (el) => el.value);

globalThis.SEARCH_FILTER_ACTIVE = new FoodFilter('Active Search Filter', 'active-search-filter', 'activeSearchFiltering', (el) => el.checked);
globalThis.SEARCH_FILTER = new FoodFilter('Search Filter', 'search-filter', 'searchFilteringValue', (el) => el.value);

globalThis.RESET_FILTER = new FoodFilter('Reset Filter', 'reset', 'resetFiltering', (ignored) => 'true');

/* ======== Websites Definition ======== */
class FoodWebsite {
    sortFilter = new WebsiteFilter('sortingValue', 'none');
    activePriceFilter = new WebsiteFilter('activePriceFiltering', false);
    priceFilter = new WebsiteFilter('priceFilteringValue', 10);
    activeSearchFilter = new WebsiteFilter('activeSearchFiltering', false);
    searchFilter = new WebsiteFilter('searchFilteringValue', '');
    resetFilter = new WebsiteFilter('resetFiltering', false);
    filters = [
        this.sortFilter,
        this.activePriceFilter,
        this.priceFilter,
        this.activeSearchFilter,
        this.searchFilter,
        this.resetFilter
    ];
    immutableChildren;

    constructor(name, url, tableSelector) {
        this.name = name;
        this.url = url;
        this.tableSelector = tableSelector;
    }

    updateFilter(filter) {
        for (let filterItem of this.filters) {
            console.log(filter.id, filterItem.id);
            if (filter.id === filterItem.id) {
                filterItem.value = filter.value;
                break;
            }
        }
    }

    findPriceForElement(element) {
        throw new Error('findPriceForElement not implemented');
    }

    findNameForElement(element) {
        throw new Error('findNameForElement not implemented');
    }

    filterAndSortTable() {
        throw new Error('filterAndSortTable not implemented');
    }
}

class HopLunchWebsite extends FoodWebsite {
    constructor() {
        super(
            "Hoplunch",
            "https://www.hoplunch.com",
            ".catalog-page-items"
        );
    }

    findPriceForElement(element) {
        const priceElement = element.querySelector(".catalog-item-price");
        if (!priceElement) return NaN;

        let textPrice = priceElement.innerText.trim();
        textPrice = textPrice.slice(0, -1);
        return parseFloat(textPrice.replace(",", "."));
    }

    findNameForElement(element) {
        const nameElement = element.querySelector('.catalog-item-title');
        return nameElement.textContent;
    }

    filterAndSortTable() {
        const table = document.querySelector(this.tableSelector);
        if (!table) {
            console.warn(`[${this.name}] Table not found: ${this.tableSelector}`);
            return;
        }

        if (this.immutableChildren === undefined) { // Save before doing any sorting
            this.immutableChildren = Array.from(table.children)
        }

        if (this.resetFilter.value) {
            this.resetFilter.value = false;
            table.innerHTML = "";
            [...this.immutableChildren].forEach(item => {
                table.appendChild(item)
            });
            // console.log(`[${this.name}] Table reset`);
            return;
        }

        let items = [...this.immutableChildren].filter(item => {
            const price = this.findPriceForElement(item);
            return !isNaN(price) && (!this.activePriceFilter.value || price <= this.priceFilter.value);
        });

        if (this.sortFilter.value !== 'none') {
            items.sort((a, b) => {
                const priceA = this.findPriceForElement(a);
                const priceB = this.findPriceForElement(b);
                return this.sortFilter.value === "asc" ? priceA - priceB : priceB - priceA;
            });
        }

        if (this.activeSearchFilter.value && this.searchFilter.value) {
            items = items.filter(item => this.findNameForElement(item).toLowerCase().includes(this.searchFilter.value.toLowerCase()));
        }

        table.innerHTML = "";
        items.forEach(item => table.appendChild(item));

        // console.log(`[${this.name}] Table sorted with filters: ${this.filters.map(wf => `[${wf.id}=${wf.value}]`).join('-')}`);
    }
}

class RefectoryWebsite extends FoodWebsite {
    constructor() {
        super(
            "Refectory",
            "https://www.refectory.fr",
            ".c-products"
        );
        this.immutableChildren = [];
    }

    findPriceForElement(element) {
        const priceElement = element.querySelector(".c-price");
        if (!priceElement) return NaN;

        let textPrice = priceElement.innerText.trim();
        textPrice = textPrice.slice(0, -1);
        return parseFloat(textPrice.replace(",", "."));
    }

    findNameForElement(element) {
        const nameElement = element.querySelector('.c-product-card__content');
        return nameElement.textContent;
    }

    filterAndSortTable() {
        const tables = document.querySelectorAll(this.tableSelector);
        for (let i = 0; i < tables.length; i++) {
            const table = tables[i];

            if (this.immutableChildren.length === i) { // Save before doing any sorting
                this.immutableChildren.push(Array.from(table.children))
            }

            if (this.resetFilter.value) {
                this.resetFilter.value = false;
                table.innerHTML = "";
                [...this.immutableChildren[i]].forEach(item => {
                    table.appendChild(item)
                });
                // console.log(`[${this.name}] Table reset`);
                continue;
            }

            let items = [...this.immutableChildren[i]].filter(item => {
                const price = this.findPriceForElement(item);
                return !isNaN(price) && (!this.activePriceFilter.value || price <= this.priceFilter.value);
            });

            if (this.sortFilter.value !== 'none') {
                items.sort((a, b) => {
                    const priceA = this.findPriceForElement(a);
                    const priceB = this.findPriceForElement(b);
                    return this.sortFilter.value === "asc" ? priceA - priceB : priceB - priceA;
                });
            }

            if (this.activeSearchFilter.value && this.searchFilter.value) {
                items = items.filter(item => this.findNameForElement(item).toLowerCase().includes(this.searchFilter.value.toLowerCase()));
            }

            table.innerHTML = "";
            items.forEach(item => table.appendChild(item));

            // console.log(`[${this.name}] Table sorted in ${this.sortOrder} order`);
        }
    }
}

globalThis.HOP_LUNCH = new HopLunchWebsite();
globalThis.REFECTORY = new RefectoryWebsite();
globalThis.WEBSITES = [globalThis.HOP_LUNCH, globalThis.REFECTORY];

globalThis.getWebsiteByUrl = (url) => {
    for (let website of globalThis.WEBSITES) {
        if (url.startsWith(website.url))
            return website;
    }

    return null;
}

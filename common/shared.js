/* ======== Filters Definition ======== */
class Filter {
    constructor(id, value) {
        this.id = id;
        this.value = value;
    }
}

class WebsiteFilters {
    /**
     *
     * @param filters {Filter[]}
     */
    constructor(filters) {
        this.filters = filters;
    }

    addFilter(filter) {
        this.filters.push(filter);
    }

    removeFilter(filter) {
        this.filters.push(filter);
    }

    serialize() {
        return JSON.stringify(this);
    }

    /**
     * @returns {WebsiteFilters}
     */
    static fromJson(json) {
        const data = JSON.parse(json);
        return new WebsiteFilters(data.filters);
    }
}

class FoodFilter {
    constructor(name, domId, uniqueId, getValue, setValue) {
        this.name = name;
        this.domId = domId;
        this.uniqueId = uniqueId;
        this.getValue = getValue;
        this.setValue = setValue;
    }

    getElement() {
        return document.getElementById(this.domId);
    }

    onUpdate(eventName, onEvent) {
        this.getElement().addEventListener(eventName, (evt) =>
        {
            onEvent(evt, this);
            this.sendUpdates();
        });
    }

    setElementValue(value) {
        this.setValue(this.getElement(), value);
    }

    toFilter() {
        return new Filter(this.uniqueId, this.getValue(this.getElement()));
    }

    sendUpdates() {
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            await chrome.tabs.sendMessage(tabs[0].id, {filter: JSON.stringify(this.toFilter())});
        });
    }
}

globalThis.SORT_FILTER = new FoodFilter('Sorting Filter', 'sort-filter', 'sortingValue', (el) => el.value, (el, v) => el.value = v);
globalThis.PRICE_FILTER_ACTIVE = new FoodFilter('Active Price Filter', 'price-filter', 'activePriceFiltering', (el) => el.checked, (el, v) => el.checked = v);
globalThis.PRICE_FILTER = new FoodFilter('Price Filter', 'max-price', 'priceFilteringValue', (el) => el.value, (el, v) => el.value = v);

globalThis.SEARCH_FILTER_ACTIVE = new FoodFilter('Active Search Filter', 'active-search-filter', 'activeSearchFiltering', (el) => el.checked, (el, v) => el.checked = v);
globalThis.SEARCH_FILTER = new FoodFilter('Search Filter', 'search-filter', 'searchFilteringValue', (el) => el.value, (el, v) => el.value = v);

globalThis.RESET_FILTER = new FoodFilter('Reset Filter', 'reset', 'resetFiltering', (ignored) => 'true', (el, v) => el.value = v);

globalThis.FILTERS = [
    globalThis.SORT_FILTER,
    globalThis.PRICE_FILTER_ACTIVE,
    globalThis.PRICE_FILTER,
    globalThis.SEARCH_FILTER_ACTIVE,
    globalThis.SEARCH_FILTER,
    globalThis.RESET_FILTER
]

/* ======== Websites Definition ======== */
class FoodWebsite {
    sortFilter = new Filter('sortingValue', 'none')
    activePriceFilter = new Filter('activePriceFiltering', false);
    priceFilter = new Filter('priceFilteringValue', 10);
    activeSearchFilter = new Filter('activeSearchFiltering', false);
    searchFilter = new Filter('searchFilteringValue', '');
    resetFilter = new Filter('resetFiltering', false);
    websiteFilters = new WebsiteFilters([
        this.sortFilter,
        this.activePriceFilter,
        this.priceFilter,
        this.activeSearchFilter,
        this.searchFilter,
        this.resetFilter
    ]);
    immutableChildren;

    constructor(name, url, tableSelector) {
        this.name = name;
        this.url = url;
        this.tableSelector = tableSelector;
    }

    loadFilters(json) {
        this.websiteFilters = WebsiteFilters.fromJson(json);
    }

    saveFilters() {
        return this.websiteFilters.serialize();
    }

    getFilter(id) {
        for (let filterItem of this.websiteFilters.filters) {
            if (id === filterItem.id) {
                return filterItem;
            }
        }
    }

    updateFilter(filter) {
        for (let filterItem of this.websiteFilters.filters) {
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
            "www.hoplunch.com",
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
            "www.refectory.fr",
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
        if (url.includes(website.url))
            return website;
    }

    return null;
}

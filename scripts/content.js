class FoodWebsite {
    sortOrder = 'none';
    maxPriceFilterActive = false;
    maxPrice = 10;
    immutableChildren;

    constructor(name, url, tableSelector) {
        this.name = name;
        this.url = url;
        this.tableSelector = tableSelector;
    }

    findPriceForElement(element) {
        throw new Error('findPriceForElement not implemented')
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

    filterAndSortTable() {
        const table = document.querySelector(this.tableSelector);
        if (!table) {
            console.warn(`[${this.name}] Table not found: ${this.tableSelector}`);
            return;
        }

        if (this.immutableChildren === undefined) { // Save before doing any sorting
            this.immutableChildren = Array.from(table.children)
        }

        if (this.sortOrder === 'reset') {
            table.innerHTML = "";
            [...this.immutableChildren].forEach(item => {
                table.appendChild(item)
            });
            // console.log(`[${this.name}] Table reset`);
            return;
        }

        const items = [...this.immutableChildren].filter(item => {
            const price = this.findPriceForElement(item);
            return !isNaN(price) && (!this.maxPriceFilterActive || price <= this.maxPrice);
        });

        if (this.sortOrder !== 'none') {
            items.sort((a, b) => {
                const priceA = this.findPriceForElement(a);
                const priceB = this.findPriceForElement(b);
                return this.sortOrder === "asc" ? priceA - priceB : priceB - priceA;
            });
        }

        table.innerHTML = "";
        items.forEach(item => table.appendChild(item));

        // console.log(`[${this.name}] Table sorted in ${this.sortOrder} order`);
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

    filterAndSortTable() {
        const tables = document.querySelectorAll(this.tableSelector);
        for (let i = 0; i < tables.length; i++) {
            const table = tables[i];

            if (this.immutableChildren.length === i) { // Save before doing any sorting
                this.immutableChildren.push(Array.from(table.children))
            }

            if (this.sortOrder === 'reset') {
                table.innerHTML = "";
                [...this.immutableChildren[i]].forEach(item => {
                    table.appendChild(item)
                });
                // console.log(`[${this.name}] Table reset`);
                continue;
            }

            const items = [...this.immutableChildren[i]].filter(item => {
                const price = this.findPriceForElement(item);
                return !isNaN(price) && (!this.maxPriceFilterActive || price <= this.maxPrice);
            });

            if (this.sortOrder !== 'none') {
                items.sort((a, b) => {
                    const priceA = this.findPriceForElement(a);
                    const priceB = this.findPriceForElement(b);
                    return this.sortOrder === "asc" ? priceA - priceB : priceB - priceA;
                });
            }

            table.innerHTML = "";
            items.forEach(item => table.appendChild(item));

            // console.log(`[${this.name}] Table sorted in ${this.sortOrder} order`);
        }
    }
}

const HOP_LUNCH = new HopLunchWebsite();
const REFECTORY = new RefectoryWebsite();

const WEBSITES = [HOP_LUNCH, REFECTORY];

function getWebsiteByUrl() {
    for (let website of WEBSITES) {
        if (document.URL.startsWith(website.url))
            return website;
    }

    return null;
}

function handleMessage(message) {
    if (message === 'reset') {
        getWebsiteByUrl().sortOrder = message
    }
    else if (message.startsWith('maxPriceToggle')) {
        getWebsiteByUrl().maxPriceFilterActive = (message.split(';')[1] === 'true')
    }
    else if (message.startsWith('sort')) {
        getWebsiteByUrl().sortOrder = message.split(';')[1]
    }
    else if (message.startsWith('price')) {
        getWebsiteByUrl().maxPrice = message.split(';')[1];
    }

    getWebsiteByUrl().filterAndSortTable();
}

function sort(sortOrder) {
    HOP_LUNCH.filterAndSortTable(sortOrder);
}

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request) => {
    if (request.message) {
        handleMessage(request.message)
    }
});

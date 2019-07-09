const SLOT_SIZE = 100000;

class GenesisLimitedCache {
    constructor({ fetch }) {
        this._fetch = fetch;
        this._slots = [new Map(), new Map(), new Map(), new Map()];
    }

    add(id, info) {
        let firstSlot = this._slots[0];

        // Если первый слот переполнен, то сдвигаем все слоты на 1 ячейку и удаляем последнюю.
        if (firstSlot.size === SLOT_SIZE) {
            firstSlot = new Map();
            this._slots.unshift(firstSlot);
            this._slots.pop();
        }

        firstSlot.set(id, info);
    }

    async get(id) {
        for (const slot of this._slots) {
            const info = slot.get(id);

            if (info) {
                return info;
            }
        }

        const info = await this._fetch(id);

        this.add(id, info);

        return info;
    }
}

module.exports = GenesisLimitedCache;

import { IDBPDatabase, openDB } from "idb";

/**
 * Wrapper class for index db
*/
export class IndexDBWrapper {

    db: IDBPDatabase | null = null;
    name: string; // Name of database
    store: string; // Name of store


    constructor(name: string, store: string) {
        this.name = name;
        this.store = store;
    }

    /**
     * Initialize db and store
     */
    async init() {
        const store = this.store;
        const res = await openDB(this.name, 1, {
            upgrade(db) {
                // Create new store
                db.createObjectStore(store);
            },
        });
        this.db = res;
    }

    /**
     * Checks whether db has been initialized
     * 
     * @returns {boolean} - Whether db is null
     */
    initialized(): boolean {
        return !!this.db;
    }

    /**
     * Adds a piece of blob data at the specified key
     * 
     * @param {number | string} key - Key to access data 
     * @param {Blob} data - Blob of data 
     */
    async addEntry(key: number | string, data: Blob) {
        if (this.db) {
            const tx = this.db.transaction(this.store, 'readwrite');
            const store = tx.objectStore(this.store);
            await store.add(data, key);
        } else {
            throw Error('DB not initialized');
        }
    }

    /**
     * Returns the number of entries in a given store
     * 
     * @returns {Promise<number>} - Promise containing the number of entries stored
     */
    async countEntries(): Promise<number> {
        if (this.db) {
            const tx = this.db.transaction(this.store, 'readonly');
            const store = tx.objectStore(this.store);
            return await store.count();
        } else {
            throw Error('DB not initialized');
        }
    }

    /**
     * Returns the an array of all entries in a given store
     * 
     * @returns {Promise<Array<Blob>>} - Returns all entries 
     */
    async getEntries(): Promise<Array<Blob>> {
        if (this.db) {
            const tx = this.db.transaction(this.store, 'readonly');
            const store = tx.objectStore(this.store);
            const data = await store.getAll();
            return data;
        } else {
            throw Error('DB not initialized');
        }
    }

}
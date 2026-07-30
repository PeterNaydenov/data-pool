/**
 * Data Pool
 *
 * Data layer for node apps and single page application (SPA). Data-pool simplifies
 * data maintenance with:
 * - Multiple data stores
 * - Stores with immutable data
 * - Signal stores with computed properties and effects
 * - API based stores
 * - Caching data records from API requests
 * - Optional TTL for each data record
 * - Optional update schedule for each data record
 * - Mechanism to fake API request responses
 *
 * History notes:
 * - Development started on October 27th, 2022
 * - Published on GitHub for first time: November 7th, 2022
 *
 * @returns {DataPoolAPI} The data-pool API object with methods for data management.
 */
export type DataPoolAPI = {
    /**
     * (): string[]} list - Returns list of all existing stores.
     */
    : Function;
    /**
     * (string|Array): boolean} has - Checks if store or store-key exists.
     */
    : Function;
    /**
     * (Array): any} get - Returns requested data or fetches from API.
     */
    : Function;
    /**
     * (Array, any, function?): boolean} set - Creates or updates a data record.
     */
    : Function;
    /**
     * (Array, function): void} setComputed - Creates a computed property in signal stores.
     */
    : Function;
    /**
     * (function): void} setEffect - Creates a signal effect.
     */
    : Function;
    /**
     * (string|string[]): void} setSignalStore - Defines stores as signal stores.
     */
    : Function;
    /**
     * (string, Object): void} importStore - Adds data as a store.
     */
    : Function;
    /**
     * (string): Object|null} exportStore - Exports store as an object.
     */
    : Function;
    /**
     * (string, function): void} on - Listens for store changes.
     */
    : Function;
    /**
     * (Object): void} addApi - Associates APIs with data-pool.
     */
    : Function;
    /**
     * (string): void} removeApi - Removes API associations.
     */
    : Function;
    /**
     * (Array, number): void} setUpdate - Sets recurring updates for API records.
     */
    : Function;
    /**
     * (Array): void} removeUpdate - Removes recurring updates.
     */
    : Function;
    /**
     * (Array, number): void} setTTL - Sets TTL for a record.
     */
    : Function;
    /**
     * (Array): void} removeTTL - Removes TTL.
     */
    : Function;
    /**
     * (Array, function): void} setDummy - Sets dummy data source.
     */
    : Function;
    /**
     * (Array): void} removeDummy - Removes dummy data source.
     */
    : Function;
    /**
     * (Array): void} setNoCache - Sets no-cache for a record.
     */
    : Function;
    /**
     * (Array): void} removeNoCache - Removes no-cache setting.
     */
    : Function;
    /**
     * (string?|Array?): void} flush - Flushes data from stores.
     */
    : Function;
};
/**
 * Creates a new data-pool instance.
 * @returns {DataPoolAPI} The data-pool API object.
 */
declare function dataPool(): DataPoolAPI;
export default dataPool;

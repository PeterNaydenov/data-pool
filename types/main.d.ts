export default dataPool;
export type DataPoolAPI = {
    /**
     * - Returns list of all existing stores.
     */
    list: () => string[];
    /**
     * - Checks if store or store-key exists.
     */
    has: (arg0: string | any[]) => boolean;
    /**
     * - Returns requested data or fetches from API.
     */
    get: (arg0: any[]) => any;
    /**
     * - Creates or updates a data record.
     */
    set: (arg0: any[], arg1: any, arg2: Function | null) => boolean;
    /**
     * - Creates a computed property in signal stores.
     */
    setComputed: (arg0: any[], arg1: Function) => void;
    /**
     * - Creates a signal effect.
     */
    setEffect: (arg0: Function) => void;
    /**
     * - Defines stores as signal stores.
     */
    setSignalStore: (arg0: string | string[]) => void;
    /**
     * - Adds data as a store.
     */
    importStore: (arg0: string, arg1: Object) => void;
    /**
     * - Exports store as an object.
     */
    exportStore: (arg0: string) => Object | null;
    /**
     * - Listens for store changes.
     */
    on: (arg0: string, arg1: Function) => void;
    /**
     * - Associates APIs with data-pool.
     */
    addApi: (arg0: Object) => void;
    /**
     * - Removes API associations.
     */
    removeApi: (arg0: string) => void;
    /**
     * - Sets recurring updates for API records.
     */
    setUpdate: (arg0: any[], arg1: number) => void;
    /**
     * - Removes recurring updates.
     */
    removeUpdate: (arg0: any[]) => void;
    /**
     * - Sets TTL for a record.
     */
    setTTL: (arg0: any[], arg1: number) => void;
    /**
     * - Removes TTL.
     */
    removeTTL: (arg0: any[]) => void;
    /**
     * - Sets dummy data source.
     */
    setDummy: (arg0: any[], arg1: Function) => void;
    /**
     * - Removes dummy data source.
     */
    removeDummy: (arg0: any[]) => void;
    /**
     * - Sets no-cache for a record.
     */
    setNoCache: (arg0: any[]) => void;
    /**
     * - Removes no-cache setting.
     */
    removeNoCache: (arg0: any[]) => void;
    /**
     * - Flushes data from stores.
     */
    flush: (arg0: string, arg1: unknown | (any[] | null)) => void;
};
/**
 * Creates a new data-pool instance.
 * @returns {DataPoolAPI} The data-pool API object.
 */
declare function dataPool(): DataPoolAPI;

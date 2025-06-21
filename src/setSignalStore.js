function setSignalStore ( dependencies ) {
    // *** Adds store to signalStores

    return ( stores ) => {
        const { signalStores } = dependencies
        // Store or stores names comes as a string, string with list of names separated by comma or array of strings.
        // Before adding we should separate incoming data to array of names
        if ( !stores ) {
               throw new Error ( 'setSignalStore: Provide store names to be defined as signal stores.' )
           }
        if ( typeof stores === 'string' ) {
            stores = stores.split ( ',' ).map ( s => s.trim () )
           }
        stores.forEach ( s => {
                        if ( !signalStores.includes ( s ) )   signalStores.push ( s )
            })
        return stores
}} // setSignalStore func.



export default setSignalStore



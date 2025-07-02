function setComputed ( dependencies ) {
    const { signalStores, db, signalNest } = dependencies
    const sn = signalStores.reduce ( (res,name) => {
                    res[name] = db[name]
                    return res
                }, {})

    return ([k,store='default'], fn, ...args ) => {
                if ( !signalStores.includes ( store ) ) { 
                            console.error ( 'Computed can be saved only in signal stores' )
                            return false
                    }
                const stores = {}
                signalStores.map ( s => stores[s] = db[s] )
                if ( !db[store] )   db[store] = {}
                db[store][k] = signalNest.computed ( fn, stores, ...args )                 
                return true
            }
} // setComputed func.


export default setComputed



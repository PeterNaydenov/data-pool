function setComputed ( dependencies ) {
    const { signalStores, db, signalNest } = dependencies
    const sn = signalStores.reduce ( (res,name) => {
                    res[name] = db[name]
                    return res
                }, {})

    return ([k,store='default'], fn ) => {
                if ( !signalStores.includes ( store ) ) { 
                            console.error ( 'Computed can be saved only in signal stores' )
                            return false
                    }
                if ( !db[store] )   db[store] = {}
                db[store][k] = signalNest.computed ( fn(sn) ) 
                return true
            }
} // setComputed func.


export default setComputed



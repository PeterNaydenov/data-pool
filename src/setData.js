function setData ( dependencies ) {
    const { 
            db
            , walk
            , eBus
            , readKey
            , ttlRequest
            , timeouts
            , signalNest
            , signalStores 
            , validationStore
        } = dependencies;

    return function setData ( [k, store='default'], data, vFn=false ) {
        // TODO: Add argument validation
        const 
              { key, location } = readKey (k)
            , hasValidation = vFn instanceof Function
            , ID = `${store}/${key}`
            ;
        if ( !db[store]    )   db[store] = {}
        if ( hasValidation )   validationStore[ ID ] = vFn
        
        eBus.emit ( store, location, walk({data:db[store][location]}), walk({data})   )
        if      ( signalStores.includes ( store ) && !db[store].hasOwnProperty ( location ))    db[store][location] = signalNest.state ( walk({data}) )
        else if ( signalStores.includes ( store ) &&  db[store].hasOwnProperty ( location ))    db[store][location].set ( walk({data}) ) 
        else                                                                                    db[store][location] = walk ({data})
        
        const ttl = ttlRequest[ ID ];
        if ( ttl ) {  
                    const timeoutID = timeouts[`${store}/${location}`];
                    if ( timeoutID )   clearTimeout ( timeoutID )
                    timeouts[ ID ] = setTimeout ( () => delete db[store][location], ttl )
            }
}} // setData func.



export default setData



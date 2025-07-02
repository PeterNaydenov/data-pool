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
        const 
              { key, location } = readKey (k)
            , isFunction = vFn instanceof Function
            , ID = `${store}/${key}`
            , PID = `${store}/${location}`
            , existingValidation = validationStore[ ID ] ? true : false 
            ;

        let isValid = true;

        if ( !db[store]    )   db[store] = {}
        // Validation per item/store sets once during pool lifetime 
        if ( existingValidation                )   isValid = validationStore[ ID ] ( data )
        if ( !existingValidation && isFunction )   validationStore[ ID ] = vFn
        
        if ( !isValid )   return false
        else {
                    eBus.emit ( store, location, walk({data:db[store][location]}), walk({data})   )
                    if      ( signalStores.includes ( store ) && !db[store].hasOwnProperty ( location ))    db[store][location] = signalNest.state ( walk({data}) )
                    else if ( signalStores.includes ( store ) &&  db[store].hasOwnProperty ( location ))    db[store][location].set ( walk({data}) ) 
                    else                                                                                    db[store][location] = walk ({data})
                    
                    const ttl = ttlRequest[ ID ];
                    if ( ttl ) {  
                                const timeoutID = timeouts[ PID ];
                                if ( timeoutID )   clearTimeout ( timeoutID )
                                timeouts[ ID ] = setTimeout ( () => delete db[store][location], ttl )
                        }
                    return true
            } // else !isValid
}} // setData func.



export default setData



function setData ( dependencies ) {
    const { db, walk, eBus, readKey, ttlRequest, timeouts } = dependencies;
    return function setData ( store, k, data ) {
        const { key, location } = readKey (k);
        if ( !db[store] )   db[store] = {}
        
        eBus.emit ( store, location, walk({data:db[store][location]}), walk({data})   )
        db[store][location] = walk ({data})
        const ttl = ttlRequest[`${store}/${key}`];
        if ( ttl ) {  
                    const timeoutID = timeouts[`${store}/${location}`];
                    if ( timeoutID )   clearTimeout ( timeoutID )
                    timeouts[`${store}/${location}`] = setTimeout ( () => delete db[store][location], ttl )
            }
}} // setData func.



export default setData



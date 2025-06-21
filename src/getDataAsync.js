function getDataAsync ( dependencies ) {
    const {
              db
            , apiDB
            , dummyRequest
            , updateRequest
            , noCacheRequest
            , timeouts
            , intervals
            , ttlRequest
            , askForPromise
            , walk
            , eBus
            , readKey
            , signalNest
            , signalStores
        } = dependencies;

return function getDataAsync ( store, k, ...args) {
    const 
              { key, location } = readKey ( k )
            , task = askForPromise ()
            , ID = `${store}/${key}`
            , withCache = !noCacheRequest.has ( ID )
            , dummy = dummyRequest[ID]
            , interval = updateRequest[ID] || false
            , ttl = ttlRequest [ID]
            , isSignalValue = signalStores.includes ( store )
            ;
      
        let 
              existingStore = db.hasOwnProperty(store) ? true : false
            , cache =  false
            ;
        if ( existingStore && withCache )   cache = db[store].hasOwnProperty(location) ? true : false
        if ( dummy ) {
                    dummy ().then ( r =>  task.done ( walk({ data : r })   ))
                    return task.promise
            }

        if ( !existingStore )   db[store] = {}
        if ( !cache ) {
                    if ( apiDB[store] && apiDB[store][key] ) {   // When api method exists
                                    apiDB[store][key](args)   // store -> api name, data -> api method, args -> method arguments
                                        .then ( r => {
                                                    if ( withCache ) {
                                                            db[store][location] = r
                                                            if ( ttl ) {  
                                                                    const timeoutID = timeouts[`${store}/${location}`];
                                                                    if ( timeoutID )   clearTimeout ( timeoutID ) 
                                                                    timeouts[`${store}/${location}`] =  setTimeout ( () => delete db[store][location], ttl )
                                                                }
                                                        }
                                                    if ( interval ) {
                                                            const activeInterval = intervals [`${store}/${location}`];
                                                            if ( activeInterval )   clearTimeout ( activeInterval )
                                                            intervals[`${store}/${location}`] = setTimeout ( () => eBus.emit ( 'update', arguments ) , interval )  
                                                        }
                                                    eBus.emit ( store, location, undefined, walk({data:r}))
                                                    task.done ( walk({data:r})  )
                                            })
                                    return task.promise
                        }
                    task.done ( null )
                    return task.promise
            }
        else {
                    if ( isSignalValue )   task.done ( walk ({ data : db[store][location].get() })   )
                    else                   task.done ( walk ({ data : db[store][location] })   )
            }
        return task.promise
}} // getDataAsync func.



export default getDataAsync



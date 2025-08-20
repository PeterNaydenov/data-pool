function updateData ( dependencies ) {
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
  } = dependencies;

return function updateData ( [k, store], ...args) {
        const 
              { key, location } = readKey ( k )
            , task = askForPromise ()
            , ID = `${store}/${key}`
            , PID = `${store}/${location}`
            , withCache = !noCacheRequest.has ( ID )
            , dummy = dummyRequest[ID]
            , interval = updateRequest[ID] || false
            , ttl = ttlRequest [ID]
            ;

        if ( interval ) {
                    const activeInterval = intervals [ PID ];
                    if ( activeInterval )   clearTimeout ( activeInterval )
                    intervals[ PID ] = setTimeout ( () => eBus.emit ( 'update', arguments ) , interval )  
            }
            
        if ( dummy ) {
                    dummy ().then ( () =>  task.done ()   )
                    return task.promise
            }

        if ( apiDB[store] && apiDB[store][key] ) {   // When api method exists
                                Promise.resolve ( apiDB[store][key](args) )   // store -> api name, data -> api method, args -> method arguments
                                        .then ( r => {
                                                    db[store][location] = r
                                                    if ( ttl ) {  
                                                            const timeoutID = timeouts[ PID ];
                                                            if ( timeoutID )   clearTimeout ( timeoutID ) 
                                                            timeouts[ PID ] =  setTimeout ( () => delete db[store][location], ttl )
                                                        }
                                                    
                                                    eBus.emit ( store, location, undefined, walk({data:r}))
                                                    task.done ()
                                            })
            }
        else   task.done ()
        return task.promise
}} // updateData func.



export default updateData



function getData ( dependencies ) {
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
            , signalStores
            , validationStore
            , setupListOfRequestedParams
        } = dependencies;


return function getData ( ks,  ...args ) {    
    // ks could be [keyList, store]
    // or [ [keyList, store], [keyList, store], [ key, store]... ]
    
    const list = setupListOfRequestedParams ( ks )
    let result = list.map ( ([k, store]) => {
                const 
                          { key, location } = readKey ( k )
                        , task = askForPromise ()
                        , ID = `${store}/${key}`
                        , PID = `${store}/${location}`
                        , withCache = !noCacheRequest.has ( ID )
                        , dummy = dummyRequest[ID]
                        , interval = updateRequest[ID] || false
                        , ttl = ttlRequest [ID]
                        , isSignalValue = signalStores.includes ( store )
                        , validation = validationStore [ID]
                        ;
                
                    let 
                          existingStore = db.hasOwnProperty(store) ? true : false
                        , cache =  false
                        ;
                        
                    if ( existingStore && withCache )   cache = db[store].hasOwnProperty ( location )

                    if ( dummy instanceof Function )  return dummy ()
                    else if ( dummy )                 return dummy

                    if ( !existingStore )   db[store] = {}
                    if ( !cache ) {
                                if ( apiDB[store] && apiDB[store][key] ) {   // When api method exists
                                                Promise.resolve (apiDB[store][key](...args))   // store -> api name, data -> api method, args -> method arguments
                                                        .then ( r => {
                                                                    if ( withCache ) {
                                                                            db[store][location] = r
                                                                            if ( ttl ) {  
                                                                                    const timeoutID = timeouts[ PID ];
                                                                                    if ( timeoutID )   clearTimeout ( timeoutID ) 
                                                                                    timeouts[ PID ] =  setTimeout ( () => delete db[store][location], ttl )
                                                                                }
                                                                        }
                                                                    if ( interval ) {
                                                                            const activeInterval = intervals [ PID ];
                                                                            if ( activeInterval )   clearTimeout ( activeInterval )
                                                                            intervals[ PID ] = setTimeout ( () => eBus.emit ( 'update', arguments ) , interval )  
                                                                        }
                                                                    eBus.emit ( store, location, undefined, walk({data:r}))
                                                                    task.done ( walk({data:r})  )
                                                            })
                                                return task.promise
                                    }
                                return  null 
                        }
                    else {
                                if ( isSignalValue )   return walk({data:db[store][location].get(...args)})
                                else                   return walk ({ data : db[store][location] }) 
                        }
        }) // list.forEach
        
    if ( result.length === 1 )   return result[0]
    return result
}} // getData func.



export default getData



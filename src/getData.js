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
            , signalNest
            , signalStores
            , validationStore
        } = dependencies;

return function getData ( ks,  ...args ) {
    // TODO: Make it works for multiple key/store values
    // ks could be [keyList, store]
    // or [ [keyList, store], [keyList, store], ... ]
    // const list = keyList.split(',').map ( k => k.trim () )
    
    if ( typeof ks[0] === 'string' )   ks = [ ks ]
    const list = ks.reduce ( ( res, item ) => {
                                    const st = item[1] || 'default';
                                    let ls = item[0].split(',').map ( k => k.trim () )
                                    ls.forEach ( k => res.push ( [k, st] ) )
                                    return res
                    },[] )

    let result = list.map ( ([k, store]) => {
                const 
                          { key, location } = readKey ( k )
                        , task = askForPromise ()
                        , ID = `${store}/${key}`
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
                        
                    if ( existingStore && withCache )   cache = db[store].hasOwnProperty(location) ? true : false

                    if ( dummy instanceof Function )  return dummy ()
                    else if ( dummy )                 return dummy

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
                                return  null 
                        }
                    else {
                                if ( isSignalValue )   return walk({data:db[store][location].get()})
                                else                   return walk ({ data : db[store][location] }) 
                        }
        }) // list.forEach
        
    if ( result.length === 1 )   return result[0]
    return result
}} // getData func.



export default getData



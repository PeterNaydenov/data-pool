'use strict';

var askForPromise = require('ask-for-promise');
var walk = require('@peter.naydenov/walk');
var notice = require('@peter.naydenov/notice');
var signals = require('@peter.naydenov/signals');

function readKey ( k ) {
        let key, ext, location;   // key parameters
        let kList = k.split ( '/' );
        location = k;
        if ( kList.length > 1 ) {
                    key = k[0];
                    ext = kList.slice ( 1 ).join ( '/' );
            }
        else {
                    key = k;
                    ext = false;
            }
        return { key, ext, location }
} // readKey func.

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
    
    const list = setupListOfRequestedParams ( ks );
    let result = list.map ( ([k, store]) => {
                const { key, location } = readKey ( k )
                        , task = askForPromise ()
                        , ID = `${store}/${key}`
                        , PID = `${store}/${location}`
                        , withCache = !noCacheRequest.has ( ID )
                        , dummy = dummyRequest[ID]
                        , interval = updateRequest[ID] || false
                        , ttl = ttlRequest [ID]
                        , isSignalValue = signalStores.includes ( store )
                        ; validationStore [ID]
                        ;
                
                    let 
                          existingStore = db.hasOwnProperty(store) ? true : false
                        , cache =  false
                        ;
                        
                    if ( existingStore && withCache )   cache = db[store].hasOwnProperty ( location );

                    if ( dummy instanceof Function )  return dummy ()
                    else if ( dummy )                 return dummy

                    if ( !existingStore )   db[store] = {};
                    if ( !cache ) {
                                if ( apiDB[store] && apiDB[store][key] ) {   // When api method exists
                                                Promise.resolve (apiDB[store][key](...args))   // store -> api name, data -> api method, args -> method arguments
                                                        .then ( r => {
                                                                    if ( withCache ) {
                                                                            db[store][location] = r;
                                                                            if ( ttl ) {  
                                                                                    const timeoutID = timeouts[ PID ];
                                                                                    if ( timeoutID )   clearTimeout ( timeoutID ); 
                                                                                    timeouts[ PID ] =  setTimeout ( () => delete db[store][location], ttl );
                                                                                }
                                                                        }
                                                                    if ( interval ) {
                                                                            const activeInterval = intervals [ PID ];
                                                                            if ( activeInterval )   clearTimeout ( activeInterval );
                                                                            intervals[ PID ] = setTimeout ( () => eBus.emit ( 'update', arguments ) , interval );  
                                                                        }
                                                                    eBus.emit ( store, location, undefined, walk({data:r}));
                                                                    task.done ( walk({data:r})  );
                                                            });
                                                return task.promise
                                    }
                                return  null 
                        }
                    else {
                                if ( isSignalValue )   return walk({data:db[store][location].get(...args)})
                                else                   return walk ({ data : db[store][location] }) 
                        }
        }); // list.forEach
        
    if ( result.length === 1 )   return result[0]
    return result
}} // getData func.

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

        if ( !db[store]    )   db[store] = {};
        // Validation per item/store sets once during pool lifetime 
        if ( existingValidation                )   isValid = validationStore[ ID ] ( data );
        if ( !existingValidation && isFunction )   validationStore[ ID ] = vFn;
        
        if ( !isValid )   return false
        else {
                    eBus.emit ( store, location, walk({data:db[store][location]}), walk({data})   );
                    if      ( signalStores.includes ( store ) && !db[store].hasOwnProperty ( location ))    db[store][location] = signalNest.state ( walk({data}) );
                    else if ( signalStores.includes ( store ) &&  db[store].hasOwnProperty ( location ))    db[store][location].set ( walk({data}) ); 
                    else                                                                                    db[store][location] = walk ({data});
                    
                    const ttl = ttlRequest[ ID ];
                    if ( ttl ) {  
                                const timeoutID = timeouts[ PID ];
                                if ( timeoutID )   clearTimeout ( timeoutID );
                                timeouts[ ID ] = setTimeout ( () => delete db[store][location], ttl );
                        }
                    return true
            } // else !isValid
}} // setData func.

function setComputed ( dependencies ) {
    const { signalStores, db, signalNest } = dependencies;
    signalStores.reduce ( (res,name) => {
                    res[name] = db[name];
                    return res
                }, {});

    return ([k,store='default'], fn, ...args ) => {
                if ( !signalStores.includes ( store ) ) { 
                            console.error ( 'Computed can be saved only in signal stores' );
                            return false
                    }
                const stores = {};
                signalStores.map ( s => stores[s] = db[s] );
                if ( !db[store] )   db[store] = {};
                db[store][k] = signalNest.computed ( fn, stores, ...args );                 
                return true
            }
} // setComputed func.

function setEffect ( dependencies ) {
        const { signalNest, signalStores, db } = dependencies;
        return ( ks, fn, ...args ) => {
                    if ( typeof ks[0] === 'string' )   ks = [ ks ];   // Unify the input data structure 
                    // list contains signals that will trigger function on change
                    const list = ks.reduce ( ( res, item ) => {
                                                    const st = item[1];
                                                    if ( !signalStores.includes ( st ) ) { 
                                                                console.error ( `Store "${st}" is not a signal store. Use only stores: ${signalStores.join ( ', ' )}` );
                                                        }
                                                    else {
                                                                let ls = item[0].split(',').map ( k => k.trim () );
                                                                ls.forEach ( k => res.push ( db[st][k] ) );
                                                        }
                                                    return res
                                        }, [] );
                    signalNest.effect ( list, fn, ...args );
}} // setEffect func.

function setSignalStore ( dependencies ) {
    // *** Adds store to signalStores

    return ( stores ) => {
        const { signalStores, db } = dependencies;
        // Store or stores names comes as a string, string with list of names separated by comma or array of strings.
        // Before adding we should separate incoming data to array of names
        if ( !stores ) {
               throw new Error ( 'setSignalStore: Provide store names to be defined as signal stores.' )
           }
        if ( typeof stores === 'string' ) {
            stores = stores.split ( ',' ).map ( s => s.trim () );
           }
        stores.forEach ( s => {
                        if ( db[s] )  console.error ( `Store "${s}" already exists. ` );  
                        if ( !signalStores.includes ( s ) )   signalStores.push ( s );
            });
        return signalStores
}} // setSignalStore func.

function setDummy ( dummyRequests ) {
return function setDummy ([key,store='default'], fn ) {   // Argument 'fn' should return a promise
        dummyRequests[`${store}/${key}`] = fn;
}}

function listStoreNames ( db ) {
return function listStores () {
        return Object.keys ( db )
}}

function setUpdate ( dependencies ) {
    const { readKey, updateRequest } = dependencies;
return function setUpdate ( [ k, store], interval ) {
    const { key } = readKey ( k );
    updateRequest[`${store}/${key}`] = interval;
}} // setUpdate func.

function removeUpdates ( updateRequest, intervals, store ) {
        Object.keys ( updateRequest ).forEach ( k => {
                    if ( k.includes(store) )   delete updateRequest[k];
            });
        Object.keys ( intervals ).forEach  ( k => {
                    if ( k.includes(store) )   clearTimeout ( intervals[k] );
            });
} // removeUpdates func.

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
        const { key, location } = readKey ( k )
            , task = askForPromise ()
            , ID = `${store}/${key}`
            , PID = `${store}/${location}`
            ; !noCacheRequest.has ( ID )
            ; const dummy = dummyRequest[ID]
            , interval = updateRequest[ID] || false
            , ttl = ttlRequest [ID]
            ;

        if ( interval ) {
                    const activeInterval = intervals [ PID ];
                    if ( activeInterval )   clearTimeout ( activeInterval );
                    intervals[ PID ] = setTimeout ( () => eBus.emit ( 'update', arguments ) , interval );  
            }
            
        if ( dummy ) {
                    dummy ().then ( () =>  task.done ()   );
                    return task.promise
            }

        if ( apiDB[store] && apiDB[store][key] ) {   // When api method exists
                                Promise.resolve ( apiDB[store][key](args) )   // store -> api name, data -> api method, args -> method arguments
                                        .then ( r => {
                                                    db[store][location] = r;
                                                    if ( ttl ) {  
                                                            const timeoutID = timeouts[ PID ];
                                                            if ( timeoutID )   clearTimeout ( timeoutID ); 
                                                            timeouts[ PID ] =  setTimeout ( () => delete db[store][location], ttl );
                                                        }
                                                    
                                                    eBus.emit ( store, location, undefined, walk({data:r}));
                                                    task.done ();
                                            });
            }
        else   task.done ();
        return task.promise
}} // updateData func.

/**
 * @typedef {Object} DataPoolAPI
 * @property {function(): string[]} list - Returns list of all existing stores.
 * @property {function(string|Array): boolean} has - Checks if store or store-key exists.
 * @property {function(Array): any} get - Returns requested data or fetches from API.
 * @property {function(Array, any, function?): boolean} set - Creates or updates a data record.
 * @property {function(Array, function): void} setComputed - Creates a computed property in signal stores.
 * @property {function(function): void} setEffect - Creates a signal effect.
 * @property {function(string|string[]): void} setSignalStore - Defines stores as signal stores.
 * @property {function(string, Object): void} importStore - Adds data as a store.
 * @property {function(string): Object|null} exportStore - Exports store as an object.
 * @property {function(string, function): void} on - Listens for store changes.
 * @property {function(Object): void} addApi - Associates APIs with data-pool.
 * @property {function(string): void} removeApi - Removes API associations.
 * @property {function(Array, number): void} setUpdate - Sets recurring updates for API records.
 * @property {function(Array): void} removeUpdate - Removes recurring updates.
 * @property {function(Array, number): void} setTTL - Sets TTL for a record.
 * @property {function(Array): void} removeTTL - Removes TTL.
 * @property {function(Array, function): void} setDummy - Sets dummy data source.
 * @property {function(Array): void} removeDummy - Removes dummy data source.
 * @property {function(Array): void} setNoCache - Sets no-cache for a record.
 * @property {function(Array): void} removeNoCache - Removes no-cache setting.
 * @property {function(string?|Array?): void} flush - Flushes data from stores.
 */



function setupListOfRequestedParams ( ks) {
            if ( typeof ks[0] === 'string' )   ks = [ ks ];   // Unify the input data structure 
            const list = ks.reduce ( ( res, item ) => {
                                            const st = item[1] || 'default';
                                            let ls = item[0].split(',').map ( k => k.trim () );
                                            ls.forEach ( k => res.push ( [k, st] ) );
                                            return res
                            },[] );
            return list
    } // setupListOfRequestedParams func.



function createDataStore () {
    // *** Creates internal data-structures
    const 
          eBus = notice ()
        , signalNest = signals () 
        ;
    return { 
              db             : {}   // Stores are here
            , apiDB          : {}   // APIs
            , ttlRequest     : {}   // TTL settings place
            , updateRequest  : {}   // Update settings place
            , timeouts       : {}   // Active TTL timeouts object
            , intervals      : {}   // Active update intervals object
            , dummyRequest   : {}   // store/key that will provide always dummy data
            , signalStores   : []   // Stores that will be used for signals
            , validationStore : {}   // Validation functions
            , noCacheRequest : new Set()  // store/key that should not have cache
            , walk
            , askForPromise
            , eBus
            , signalNest
            , setupListOfRequestedParams
            , readKey
        }
} // CreateDataStore func.



/**
 * Creates a new data-pool instance.
 * @returns {DataPoolAPI} The data-pool API object.
 */
function dataPool () {
    const dependencies = createDataStore ();

/**
 *    dataStore -> API -> Auth
 *    - dataStore is not related to Auth;
 *    - data can be related to API method
 *    
 */



    

const API = {   // Data-pool API
              list         : listStoreNames ( dependencies.db ) // list Stores
            , has          : ( ks ) => {   // Checks if store or store-key exist 
                                    if ( typeof ks === 'string' ) {
                                                let list = ks.split(',').map ( k => k.trim () );
                                                return list.every ( k => dependencies.db[k] ? true : false )
                                        }
                                    const list = setupListOfRequestedParams ( ks );
                                    
                                    return list.every ( ([k, store]) => {
                                                const { location } = readKey ( k );
                                                if ( !dependencies.db[store]?.hasOwnProperty(location) )   return false
                                                return true
                                            })
                                } // has func. 
            , get            : getData ( dependencies )
            , set            : setData ( dependencies )
            , setComputed    : setComputed ( dependencies )
            , setEffect      : setEffect ( dependencies )
            , setSignalStore : setSignalStore ( dependencies )   // Set the store as a signal store
            , importStore  : (store,data) => {  // Add data as a store
                            if ( !dependencies.db[store] )   dependencies.db[store] = {};
                            if ( dependencies.signalStores.includes ( store ) ) {
                                        if ( !dependencies.db[store] )   dependencies.db[store] = {};
                                        Object.entries ( data ).forEach ( ([k,v]) =>  dependencies.db[store][k] = dependencies.signalNest.state ( v )   );
                                }
                            else {
                                        dependencies.db[store] = walk({data});   
                                }
                } // importStore func. 
            , exportStore  : ( store ) => {  // Export store as a data
                        if ( !dependencies.db[store] )   return null
                        if ( dependencies.signalStores.includes ( store ) ) {
                                    return   Object.entries ( dependencies.db[store] ).reduce ( (res,[k,v]) => {
                                                    res[k] = v.get ();
                                                    return res
                                                }, {})
                            }
                        else {
                                    return walk ({ data : dependencies.db[store] })
                           }                        
                } // exportStore func.
            , on           : dependencies.eBus.on
            , addApi       : ( income ) => {
                                    let ups = Object.assign ( {}, income, dependencies.apiDB );
                                    Object.keys(ups).forEach ( k => dependencies.apiDB[k] = ups[k]   );
                                }
            , removeApi    : ( names ) => {
                                    const list = names.split ( ',' ).map ( k => k.trim () );
                                    list.forEach ( name => {
                                                delete dependencies.apiDB[name];
                                                removeUpdates ( dependencies.updateRequest, dependencies.intervals, name );
                                        });
                                }
            , setUpdate    :  setUpdate ( dependencies )
            , removeUpdate : ([ loc, store ]) => {
                                    const 
                                          { key, location } = readKey ( loc )
                                        , activeUpdate = dependencies.intervals[`${store}/${location}`]
                                        ;
                                    if ( activeUpdate )   clearTimeout ( activeUpdate );
                                    delete dependencies.updateRequest[`${store}/${key}`];
                                }
            , update       : updateData ( dependencies )
            , setTTL       : ( [key, store], ttl ) =>        dependencies.ttlRequest[`${store}/${key}`] = ttl
            , removeTTL    : ( [key, store] )      => delete dependencies.ttlRequest[`${store}/${key}`]
            , setDummy     : setDummy ( dependencies.dummyRequest )
            , removeDummy  : ([key,store='default'] ) => {
                                    delete dependencies.dummyRequest[`${store}/${key}`];
                                }
            , setNoCache    : ( [key, store='default'] ) => dependencies.noCacheRequest.add ( `${store}/${key}` )
            , removeNoCache : ( [key, store='default'] ) => dependencies.noCacheRequest.delete ( `${store}/${key}` )
            , flush          : function flush () {
                                        if ( arguments.length === 0 ) {
                                                    Object.keys ( dependencies.db ).forEach ( k => dependencies.db[k] = {} );
                                                    return
                                            }
                                        if ( typeof arguments[0] === 'string' ) {
                                                    const storeList = arguments[0].split ( ',').map ( s => s.trim () );
                                                    storeList.forEach ( s => {
                                                                if ( dependencies.db[s] )   dependencies.db[s] = {};
                                                        });
                                                    return
                                            }
                                        const [ k=null, store='*' ] = arguments[0];
                                        const { key,location } = (k!=null) ? readKey ( k ) : { key: k, location: k };
                                        if ( store === '*' ) {
                                                    Object.keys ( dependencies.db ).forEach ( k => {
                                                                dependencies.db[k] = {};
                                                                // TODO: eBus event? 
                                                        });
                                                    return
                                            }
                                            
                                        if ( !key ) {
                                                    if ( dependencies.db[store] )   dependencies.db[store] = {};
                                                    return
                                            }

                                        if ( dependencies.db[store] && dependencies.db[store][location]) {
                                                    delete dependencies.db[store][location];
                                            }
                                    } // flush func.
            // TODO: persist storage - add new value without deleting the old ones.
            //  values are arrays ... last value is the actual value.
            // write   // TODO: Define method for store persistence 
            // read    // TODO: Define method for loading store from disk, db or else...
        };
  dependencies.eBus.on ( 'update', arg => API.update ( ...arg )   );
  return API
} // dataStore func.

module.exports = dataPool;

/**
 *   Data Pool
 *   
 *    Data layer for node apps and single page application ( SPA ). Data-pool will simplify
 *    data maintanance with :
 *      - Immutable data stores;
 *      - Caching for data requests;
 *      - Optional TTL for each cached data;
 *      - Optional update schedule for each cached data;
 *      - A mechanism to easily change the source of information (mock);
 * 
 *    History notes: 
 *     - Development was started on October 27th, 2022;
 *     - Published on GitHub for first time: November 7th, 2022;
 * 
 */

import askForPromise from 'ask-for-promise'
import walk          from '@peter.naydenov/walk'
import notice        from '@peter.naydenov/notice'
import signals       from '@peter.naydenov/signals'

import readKey        from './readKey.js'
import getData        from './getData.js'
import getDataAsync   from './getDataAsync.js'
import setData        from './setData.js'
import setSignalStore from './setSignalStore.js'
import setDummy       from './setDummy.js'
import listStores     from './listStores.js'
import setUpdate      from "./setUpdate.js"
import removeUpdates  from "./removeUpdates.js"
import updateData     from "./updateData.js"



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
            , readKey
        }
} // CreateDataStore func.



function dataPool () {
    const dependencies = createDataStore ();

/**
 *    dataStore -> API -> Auth
 *    - dataStore is not related to Auth;
 *    - data can be related to API method
 *    
 */
    

const API = {   // Data-pool API
              list         : listStores ( dependencies.db ) // list Stores
            , has          : ( store, k ) => {   // Checks if store or store-key exist 
                                    if ( !k )   return dependencies.db[store] ? true : false
                                    const { location } = readKey ( k )
                                    if ( !dependencies.db[store]           )   return false
                                    if ( !dependencies.db[store][location] )   return false
                                    return true
                                } 
                             
            , get          : getData ( dependencies )
            , set          : setData ( dependencies )
            , getAsync     : getDataAsync ( dependencies )
            , setSignalStore : setSignalStore ( dependencies )   // Set store for signal store
            , importStore  : (store,data) => {  // Add data as a store
                            if ( !dependencies.db[store] )   dependencies.db[store] = {}
                            if ( dependencies.signalStores.includes ( store ) ) {
                                        Object.entries ( data ).forEach ( ([k,v]) => dependencies.db[store][k] = dependencies.signalNest.state ( v ) )
                                }
                            else {
                                        dependencies.db[store] = walk({data})   
                                }
                } // importStore func. 
            , exportStore  : (store     ) => {  // Export store as a data
                        if ( !dependencies.db[store] )   return null
                        if ( dependencies.signalStores.includes ( store ) ) {
                                    return   Object.entries ( dependencies.db[store] ).reduce ( (res,[k,v]) => {
                                                    res[k] = v.get ()
                                                    return res
                                                }, {})
                            }
                        else {
                                    return walk ({ data : dependencies.db[store] })
                           }                        
                } // exportStore func.
            , on           : dependencies.eBus.on
            , addApi       : (income) => {
                                    let ups = Object.assign ( {}, income, dependencies.apiDB );
                                    Object.keys(ups).forEach ( k => dependencies.apiDB[k] = ups[k]   )
                                }
            , removeApi    : ( name ) => {
                                    delete dependencies.apiDB[name]
                                    removeUpdates ( dependencies.updateRequest, dependencies.intervals, name )
                                }
            , setUpdate    :  setUpdate ( dependencies )
            , removeUpdate : (store,loc ) => {
                                    const 
                                          { key,location } = readKey ( loc )
                                        , activeUpdate = dependencies.intervals[`${store}/${location}`]
                                        ;
                                    if ( activeUpdate )   clearTimeout ( activeUpdate )
                                    delete dependencies.updateRequest[`${store}/${key}`]
                                }
            , update       : updateData ( dependencies )
            , setTTL       : ( store, key, ttl ) =>   dependencies.ttlRequest[`${store}/${key}`] = ttl
            , removeTTL    : ( store, key ) => delete dependencies.ttlRequest[`${store}/${key}`]
            , setDummy     : setDummy ( dependencies.dummyRequest )
            , removeDummy  : (store, key ) => {
                                    delete dependencies.dummyRequest[`${store}/${key}`]
                                }
            , setNoCache    : ( store, key ) => dependencies.noCacheRequest.add ( `${store}/${key}` )
            , removeNoCache : ( store, key ) => dependencies.noCacheRequest.delete ( `${store}/${key}` )
            , flush          : ( store='*', k='' ) => {
                                        const { key,location } = readKey ( k )
                                        if ( store === '*' ) {
                                                    Object.keys ( dependencies.db ).forEach ( k => dependencies.db[k] = {} )
                                                    return
                                            }
                                        if ( !key ) {
                                                    if ( dependencies.db[store] )   dependencies.db[store] = {}
                                                    return
                                            }
                                        if ( dependencies.db[store] && dependencies.db[store][location]) {
                                                    delete dependencies.db[store][location]
                                            }
                                    } // flush func.
            // write   // TODO: Define method for store persistence
            // read    // TODO: Define method for loading store from disk, db or else...
        }
  dependencies.eBus.on ( 'update', arg => API.update ( ...arg )   )
  return API
} // dataStore func.



export default dataPool



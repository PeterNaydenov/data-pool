import { describe, it, expect } from 'vitest';
import dataPool      from '../src/main.js';
import askForPromise from 'ask-for-promise';



describe ( 'Data-pool', () => {

it ( 'Write/read a string', () => {
    const pool = dataPool ();
    pool.set ( ['name','first'], 'Peter' )
    pool.set ( [ 'sport', 'first'], 'fencing' )

    // Array where first string is keyList or key and second is the name of the store
    let [name,sport] = pool.get ( ['name,sport', 'first'] )
    expect ( name  ).toBe ( 'Peter' )
    expect ( sport ).toBe ( 'fencing' )
}) // it Write/read a string



it ( 'Write/read using default store', () => {
    const pool = dataPool ();
    pool.set ( ['name'], 'Peter' )
    pool.set ( [ 'sport'], 'fencing' )

    // If second element is not provided, then store name will be set as 'default'
    let [name,sport] = pool.get ( ['name,sport'] )
    expect ( name  ).toBe ( 'Peter' )
    expect ( sport ).toBe ( 'fencing' )
}) // it Write/read using default store



it ( 'Write/read key with extension', () => {
    const pool = dataPool ();
    pool.set ( [ 'name/player', 'first'], 'Peter' )
    pool.set ( ['sport', 'first' ], 'fencing' )

    let s = pool.get ( ['name', 'first'] )
    expect ( s ).toBe ( null )

    let name = pool.get ( ['name/player', 'first'] )
    expect ( name ).toBe ( 'Peter' )
}) // it Write/read key with extension



it ( 'Write/read immutable objects', () => {
    const pool = dataPool ();
    let data = {
                name  : 'Peter'
              , sport : 'fencing'
            };
    pool.set ( ['user', 'first'], data )
    // Manipulate the data outside of the pool
    data.name = 'Stefan'

    // Check if the data was changed
    const user = pool.get ([ 'user', 'first'])
    expect ( user.name ).toBe ( 'Peter' )
    expect ( user.sport ).toBe ( 'fencing' )

    // Manipulate the recived data outside of the pool
    user.name = 'Ivan'
    user.sport = 'skating'

    // Check if the data inside the pool was not changed
    const user2 = pool.get ([ 'user', 'first'])
    expect ( user2.name ).toBe ( 'Peter' )
    expect ( user2.sport ).toBe ( 'fencing' )
}) // it Write/read immutable objects



it ( 'Watch store for changes', () => new Promise ( done => {
    const pool = dataPool ();
    let data = {
                name  : 'Peter'
              , sport : 'fencing'
            };

    pool.on ( 'first', ( key, oldData, newData ) => {
                // First call oldData will be undefined
                if ( !oldData ) {
                        expect ( key     ).toBe ( 'user' )
                        expect ( oldData ).toBe ( undefined )
                        expect ( newData.name  ).toBe ( 'Peter' )
                        expect ( newData.sport ).toBe ( 'fencing' )
                    }
                else {
                        expect ( key     ).toBe ( 'user' )
                        expect ( oldData.name  ).toBe ( 'Peter' )
                        expect ( newData ).toBe ( 'Peter' )
                        done ()
                    }
        })
    pool.set ( ['user', 'first'], data )
    pool.set ( ['user', 'first'], 'Peter' )
})) // it watch store for changes



it ( 'Multiple storages are indipendent', () => {
    const 
        pool1 = dataPool ()
      , pool2 = dataPool ()
      ;

    pool1.set ( ['name', 'first'], 'Peter' )
    pool2.set ( ['name', 'first'], 'Ivan' )

    expect ( pool2.get (['name', 'first']) ).toBe ( 'Ivan' )
    expect ( pool1.get (['name', 'first']) ).toBe ( 'Peter' )
}) // it multiple storages are indipendent



it ( 'List stores', () => {
    const pool = dataPool ();
    pool.set ( [  'name', 'first'], 'Peter' )
    pool.set ( [ 'connections', 'second' ], 123 )

    const ls = pool.list();
    expect ( ls.includes('first')  ).toBe ( true )
    expect ( ls.includes('second')).toBe ( true )
}) // it list stores



it ('Import store', () => {
        const pool = dataPool ();
        let data = {
                    name  : 'Peter'
                  , sport : 'fencing'
                };
        pool.importStore ( 'test', data )
        let r = pool.get (['name', 'test'])
        expect ( r ).toBe ( 'Peter' )
}) // it import store



it ('Export store', () => {
    const pool = dataPool ();
    let data = {
                name  : 'Peter'
              , sport : 'fencing'
            };

    pool.importStore ( 'test', data )
    data.sport = 'skating'
    let r = pool.exportStore ( 'test' )
    expect ( r.name ).toBe ( 'Peter' )
    expect ( r.sport ).toBe ( 'fencing' )
}) // it export store



it ( 'Export non existing store', () => {
    const pool = dataPool ();
    let data = {
                name  : 'Peter'
              , sport : 'fencing'
            };
    pool.importStore ( 'test', data )
    let r = pool.exportStore ( 'something' )
    expect ( r ).toBe ( null )
}) // it export non existing store



it ( 'Store listing', () => {
    const pool = dataPool ();
    pool.set ( ['name', 'alpha'], 'Peter' )
    pool.set ( ['name', 'beta'], 'Stefan' )
    pool.set ( ['name', 'gama'], 'Ivan'   )
    const list = pool.list ();
    expect ( list.length ).toBe ( 3 )
    expect ( list.includes('alpha')).toBe ( true )
    expect ( list.includes('beta')).toBe ( true )
    expect ( list.includes('gama')).toBe ( true )
}) // it store listing



it ( 'Response with dummies', () => {
        const pool = dataPool ();
        const dummy = () => 'skating'
        // Set a dummy. Dummy should overwrite the original data
        pool.setDummy ( [ 'sport', 'fake'], dummy )
        let r = pool.get ( ['sport', 'fake'] )
        expect ( r ).toBe ( 'skating' ) // the fake response
}) // it Response with dummies



it ( 'Dummies overwrite real data', () => {
    // *** Dummies are functions that should return a promise
    const pool = dataPool ();
    let data = {
                name  : 'Peter'
              , sport : 'fencing'
            };

    pool.importStore ( 'fake', data )
    const dummy = () => 'skating';
    pool.setDummy ( ['sport', 'fake'], dummy )

    // Dummies overwrite the real data
    let r = pool.get ( ['sport', 'fake'] )
    expect ( r ).toBe ( 'skating' )   // Pool will return the dummy

    // Real data is not changed
    let x = pool.exportStore ( 'fake' )
    expect ( x.sport ).toBe ( 'fencing' )   // Dummy not overwrite the real data.

    // Access to real data is recovered after removing the dummy
    pool.removeDummy ( ['sport', 'fake'] )
    let r1 = pool.get ( ['sport', 'fake'] )
    expect ( r1 ).toBe ( 'fencing' )
}) // dummies overwrite real data



it ( 'Record with ttl', () => new Promise ( done => {
    const pool = dataPool ();
    pool.setTTL ( [ 'name', 'demo'], 10 ) // 10 seconds after insertion of new data, the record should be removed
    pool.set ( [ 'name', 'demo'], 'Peter' )
    setTimeout ( () => {
                    let r = pool.get ( ['name', 'demo'] )
                    // data is no longer available
                    expect ( r ).toBe ( null )
                    done ()
            }, 30 )
})) // it record with ttl



it ( 'Use API with ttl', () => new Promise ( done => {
    const 
          pool = dataPool ()
        , firstRead = askForPromise ()
        ;
    const API = {
                    // getName - API method that will be called as a store property
                    getName ()  {
                            return new Promise ( (resolve, reject ) => {
                                        resolve ( 'Peter' )
                                })
                        }
                }
    pool.addApi ({ API })   // Add API to the pool
    pool.setTTL ( ['getName', 'API'], 30 ) // Keep response for 30 seconds only
    pool.get (['getName', 'API' ])
        .then ( r => {  // Will call API method
                        expect ( r ).toBe ( 'Peter' )
                        // API methods are not immutable. We can modify them if needed
                        API.getName = () => new Promise ( (resolve) => resolve('Stefan')   ) // Modify API method
                        return pool.get ([ 'getName', 'API' ])
            })
        .then ( r => {  // Receive result from cache
                        expect ( r ).toBe ( 'Peter' )
                        setTimeout ( () => firstRead.done (), 50)   // Wait for the record expire
            })

    firstRead.onComplete ( () => {
                        pool.get ([ 'getName', 'API' ])
                            .then ( r => {
                                        expect ( r ).toBe ( 'Stefan' )
                                        done ()
                                })
        })
})) // it use API with ttl



it ( 'Check with "has"', () => {
    const pool = dataPool ();
    pool.set ( ['greeting', 'special'], ['Hello', 'hi', 'Hey'] )
    // Test for store with name 'test'. No properties defined
    expect ( pool.has ( 'test' )).toBe ( false )
    // Test for property 'k' in store 'test'.
    expect ( pool.has ( ['k', 'test']) ).toBe ( false )
    // Import an empty store as a 'test'
    pool.importStore ( 'test', {} )
    // Test for store with name 'test'
    expect ( pool.has ('test')).toBe ( true )
    expect ( pool.has ( ['k', 'test'])).toBe ( false )
    pool.set (['k', 'test'], 'Peter' )
    // expect ( pool.has (['k', 'test'])).toBe ( true )

    pool.importStore ( 'test2', {} )
    // Check for list of stores
    expect ( pool.has ( 'test, test2' )).toBe ( true )

    expect ( pool.has ( ['greeting', 'special'] ) ).toBe ( true )

}) // it check with "has"



it ( 'Update record on interval', () => new Promise ( done => {
    const pool = dataPool ();

    let counter = 0;
    const API = {
                    getCounter () {
                            return new Promise ( resolve => resolve (counter++)   )
                        }
            };
    pool.addApi ( { API })
    pool.setUpdate (['getCounter', 'API'], 10 )
    pool.get ( [ 'getCounter', 'API' ])
    setTimeout ( () => pool.removeUpdate (['getCounter', 'API']), 25 )
    setTimeout ( () => {
                    expect ( counter ).toBe ( 3 )
                    done ()
            } , 46 )
})) // it Update record on interval



it ( 'Remove API. Async API', () => new Promise ( done => {
    const pool = dataPool ();
    let counter = 0;
    const API = {
                    getCounter () {
                            return new Promise ( resolve => resolve (counter++)   )
                        }
            };
    pool.addApi ( { API })
    pool.setUpdate ( [ 'getCounter', 'API' ], 10 )
    setTimeout ( () => pool.removeApi ( 'API' ), 26 )  // Method removeApi should stop updates related to the API

    pool.get ( [ 'getCounter', 'API'] )
    setTimeout ( () => {
                    expect ( counter ).toBe ( 3 )
                    done ()
            } , 60 )
})) // remove API



it ( 'API with sync methods', () => new Promise ( done => {
    const pool = dataPool ();
    let counter = 0;
    const API = {
                    getCounter : () => counter++
            };
    pool.addApi ( { API })
    pool.setUpdate ( [ 'getCounter', 'API' ], 10 )
    setTimeout ( () => pool.removeApi ( 'API' ), 26 )  // Method removeApi should stop updates related to the API

    pool.get ( [ 'getCounter', 'API'] )
    setTimeout ( () => {
                    expect ( counter ).toBe ( 3 )
                    done ()
            } , 60 )
})) // API with sync methods



it ( 'No cache', () => new Promise ( done => {
    const pool = dataPool ();
    let counter = 0;
    const API = {
                    getCounter () {
                            return new Promise ( resolve => resolve (counter++)   )
                        }
            };
    pool.addApi ( { API })
    pool.get ( [ 'getCounter', 'API'] )                     // first request hit the api. Counter == 1
        .then ( r => pool.get ([ 'getCounter', 'API'])    ) // request => result from cache. Counter == 1
        .then ( r => pool.get ( [ 'getCounter', 'API'])   ) // request => result from cache. Counter == 1
        .then ( r => {
                    pool.setNoCache ( [ 'getCounter', 'API'] )
                    return pool.get ( [ 'getCounter', 'API']  )   // request => result from API. Counter == 2
            })
        .then ( r => pool.get ( [ 'getCounter', 'API'])       )   // request => result from cache. Counter == 3
        .then ( r => {
                    pool.removeNoCache ([ 'getCounter', 'API'])
                    return pool.get ( [ 'getCounter', 'API']  )   // request => result from cache. Counter == 3
            })
        .then ( r => {
                    expect ( counter ).toBe ( 3 )
                    done ()
            })
})) // it no cache



it ( 'Flush', () => new Promise ( done => {
    const pool = dataPool ();

    pool.set ( ['name', 'first'], 'Peter' )
    pool.set ( ['name', 'second'], 'Stefan' )

    Promise.resolve ( pool.get ( ['name', 'first'] ) )
        .then ( r => {
                expect ( r ).toBe ( 'Peter' )
                pool.flush ( 'first' ) // Flush only store 'first'. String arguments are comma separated list of stores for flush.
                // to delete both stores use pool.flush ( 'first,second' )
                return Promise.resolve ( pool.get ( ['name', 'first'] ))
            })
        .then ( r => {
                expect ( r ).toBe ( null ) // Data is no longer available because it was flushed
                return Promise.resolve ( pool.get ( ['name', 'second'] ))
            })
        .then ( r => {
                expect ( r ).toBe ( 'Stefan' )
                pool.flush ( [ 'name', 'second'] ) // Flush specific property and store
                return Promise.resolve ( pool.get ( ['name', 'second'] ))
            })
        .then ( r => {
                expect ( r ).toBe ( null ) // Data is no longer available because it was flushed
                pool.flush () // No arguments => Flush everything
                return Promise.all ([
                                  pool.get ( ['name', 'first'] )
                                , pool.get ( ['name', 'second'] )
                            ])
            })
        .then ( ([first, second]) => {
                expect ( first  ).toBe ( null )
                expect ( second ).toBe ( null )
                done ()
            })
})) // it flush

}) // describe
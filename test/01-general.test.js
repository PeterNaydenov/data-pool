import { expect }    from 'chai'
import dataPool      from '../src/main.js'
import askForPromise from 'ask-for-promise'



describe ( 'Data-pool', () => {

it ( 'Write/read a string', () => {
    const pool = dataPool ();
    pool.set ( ['name','first'], 'Peter' )
    pool.set ( [ 'sport', 'first'], 'fencing' )

    // Array where first string is keyList or key and second is the name of the store
    let [name,sport] = pool.get ( ['name,sport', 'first'] )
    expect ( name  ).to.be.equal ( 'Peter' )
    expect ( sport ).to.be.equal ( 'fencing' )
}) // it Write/read a string



it ( 'Write/read using default store', () => {
    const pool = dataPool ();
    pool.set ( ['name'], 'Peter' )
    pool.set ( [ 'sport'], 'fencing' )

    // If second element is not provided, then store name will be set as 'default'
    let [name,sport] = pool.get ( ['name,sport'] )
    expect ( name  ).to.be.equal ( 'Peter' )
    expect ( sport ).to.be.equal ( 'fencing' )
}) // it Write/read using default store



it ( 'Write/read key with extension', () => {
    const pool = dataPool ();
    pool.set ( [ 'name/player', 'first'], 'Peter' )
    pool.set ( ['sport', 'first' ], 'fencing' )

    let s = pool.get ( ['name', 'first'] )
    expect ( s ).to.be.equal ( null )

    let name = pool.get ( ['name/player', 'first'] )
    expect ( name ).to.be.equal ( 'Peter' )
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
    expect ( user.name ).to.be.equal ( 'Peter' ) 
    expect ( user.sport ).to.be.equal ( 'fencing' )

    // Manipulate the recived data outside of the pool
    user.name = 'Ivan'
    user.sport = 'skating'

    // Check if the data inside the pool was not changed
    const user2 = pool.get ([ 'user', 'first']) 
    expect ( user2.name ).to.be.equal ( 'Peter' ) 
    expect ( user2.sport ).to.be.equal ( 'fencing' )        
}) // it Write/read immutable objects



it ( 'Watch store for changes', done => {
    const pool = dataPool ();
    let data = {
                name  : 'Peter'
              , sport : 'fencing'
            };

    pool.on ( 'first', ( key, oldData, newData ) => {
                // First call oldData will be undefined
                if ( !oldData ) {
                        expect ( key     ).to.be.equal ( 'user' )
                        expect ( oldData ).to.be.equal ( undefined )
                        expect ( newData.name  ).to.be.equal ( 'Peter' )
                        expect ( newData.sport ).to.be.equal ( 'fencing' )
                    }
                else {
                        expect ( key     ).to.be.equal ( 'user' )
                        expect ( oldData.name  ).to.be.equal ( 'Peter' )
                        expect ( newData ).to.be.equal ( 'Peter' )
                        done ()
                    }
        })
    pool.set ( ['user', 'first'], data )
    pool.set ( ['user', 'first'], 'Peter' )
}) // it watch store for changes



it ( 'Multiple storages are indipendent', () => {
    const 
        pool1 = dataPool ()
      , pool2 = dataPool ()
      ;

    pool1.set ( ['name', 'first'], 'Peter' )
    pool2.set ( ['name', 'first'], 'Ivan' )

    expect ( pool2.get (['name', 'first']) ).to.be.equal ( 'Ivan' )
    expect ( pool1.get (['name', 'first']) ).to.be.equal ( 'Peter' )
}) // it multiple storages are indipendent



it ( 'List stores', () => {
    const pool = dataPool ();
    pool.set ( [  'name', 'first'], 'Peter' )
    pool.set ( [ 'connections', 'second' ], 123 )

    const ls = pool.list();
    expect ( ls.includes('first')  ).to.be.equal ( true )
    expect ( ls.includes('second')).to.be.equal ( true )
}) // it list stores



it ('Import store', () => {
        const pool = dataPool ();
        let data = {
                    name  : 'Peter'
                  , sport : 'fencing'
                };
        pool.importStore ( 'test', data )
        let r = pool.get (['name', 'test'])
        expect ( r ).to.be.equal ( 'Peter' )
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
    expect ( r.name ).to.be.equal ( 'Peter' )
    expect ( r.sport ).to.be.equal ( 'fencing' )
}) // it export store



it ( 'Export non existing store', () => {
    const pool = dataPool ();
    let data = {
                name  : 'Peter'
              , sport : 'fencing'
            };
    pool.importStore ( 'test', data )
    let r = pool.exportStore ( 'something' )
    expect ( r ).to.be.equal ( null )
}) // it export non existing store



it ( 'Store listing', () => {
    const pool = dataPool ();
    pool.set ( ['name', 'alpha'], 'Peter' )
    pool.set ( ['name', 'beta'], 'Stefan' )
    pool.set ( ['name', 'gama'], 'Ivan'   )
    const list = pool.list ();
    expect ( list.length ).to.be.equal ( 3 )
    expect ( list.includes('alpha')).to.be.true
    expect ( list.includes('beta')).to.be.true
    expect ( list.includes('gama')).to.be.true
}) // it store listing



it ( 'Response with dummies', () => {
        const pool = dataPool ();
        const dummy = () => 'skating'
        // Set a dummy. Dummy should overwrite the original data
        pool.setDummy ( [ 'sport', 'fake'], dummy )
        let r = pool.get ( ['sport', 'fake'] )
        expect ( r ).to.be.equal ( 'skating' ) // the fake response
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
    expect ( r ).to.be.equal ( 'skating' )   // Pool will return the dummy
                    
    // Real data is not changed
    let x = pool.exportStore ( 'fake' )   
    expect ( x.sport ).to.be.equal ( 'fencing' )   // Dummy not overwrite the real data.

    // Access to real data is recovered after removing the dummy
    pool.removeDummy ( ['sport', 'fake'] )
    let r1 = pool.get ( ['sport', 'fake'] )
    expect ( r1 ).to.be.equal ( 'fencing' )        
}) // dummies overwrite real data



it ( 'Record with ttl', done => {
    const pool = dataPool ();
    pool.setTTL ( [ 'name', 'demo'], 10 ) // 10 seconds after insertion of new data, the record should be removed
    pool.set ( [ 'name', 'demo'], 'Peter' )
    setTimeout ( () => {
                    let r = pool.get ( ['name', 'demo'] )
                    // data is no longer available
                    expect ( r ).to.be.equal ( null )
                    done ()
            }, 30 )
}) // it record with ttl



it ( 'Use API with ttl', done => {
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
                        expect ( r ).to.be.equal ( 'Peter' )
                        // API methods are not immutable. We can modify them if needed
                        API.getName = () => new Promise ( (resolve) => resolve('Stefan')   ) // Modify API method
                        return pool.get ([ 'getName', 'API' ])
            })
        .then ( r => {  // Receive result from cache
                        expect ( r ).to.be.equal ( 'Peter' )
                        setTimeout ( () => firstRead.done (), 50)   // Wait for the record expire
            })

    firstRead.onComplete ( () => {
                        pool.get ([ 'getName', 'API' ])
                            .then ( r => {
                                        expect ( r ).to.be.equal ( 'Stefan' )
                                        done ()
                                })
        })
}) // it use API with ttl



it ( 'Check with "has"', () => {
    const pool = dataPool ();
    // Test for store with name 'test'. No properties defined
    expect ( pool.has ( 'test' )).to.be.equal ( false )
    // Test for property 'k' in store 'test'.
    expect ( pool.has ( ['k', 'test']) ).to.be.equal ( false )
    // Import an empty store as a 'test'
    pool.importStore ( 'test', {} )
    // Test for store with name 'test'
    expect ( pool.has ('test')).to.be.equal ( true )
    expect ( pool.has ( ['k', 'test'])).to.be.equal ( false )
    pool.set (['k', 'test'], 'Peter' )
    // expect ( pool.has (['k', 'test'])).to.be.true

    pool.importStore ( 'test2', {} )
    // Check for list of stores
    expect ( pool.has ( 'test, test2' )).to.be.equal ( true )
}) // it check with "has"



it ( 'Update record on interval', done => {
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
                    expect ( counter ).to.be.equal ( 3 )
                    done ()
            } , 46 )
}) // it Update record on interval



it ( 'Remove API. Async API', done => {
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
                    expect ( counter ).to.be.equal ( 3 )
                    done ()
            } , 60 )
}) // remove API



it ( 'API with sync methods', done => {
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
                    expect ( counter ).to.be.equal ( 3 )
                    done ()
            } , 60 )
}) // API with sync methods



it ( 'No cache', done => {
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
                    expect ( counter ).to.be.equal ( 3 )
                    done ()
            })
}) // it no cache



it ( 'Flush', done => {
    const pool = dataPool ();

    pool.set ( ['name', 'first'], 'Peter' )
    pool.set ( ['name', 'second'], 'Stefan' )

    Promise.resolve ( pool.get ( ['name', 'first'] ) )
        .then ( r => {
                expect ( r ).to.be.equal ( 'Peter' )
                pool.flush ( 'first' ) // Flush only store 'first'. String arguments are comma separated list of stores for flush.
                // to delete both stores use pool.flush ( 'first,second' )
                return Promise.resolve ( pool.get ( ['name', 'first'] ))
            })
        .then ( r => {
                expect ( r ).to.be.equal ( null ) // Data is no longer available because it was flushed
                return Promise.resolve ( pool.get ( ['name', 'second'] ))
            })
        .then ( r => {
                expect ( r ).to.be.equal ( 'Stefan' )
                pool.flush ( [ 'name', 'second'] ) // Flush specific property and store
                return Promise.resolve ( pool.get ( ['name', 'second'] ))
            })
        .then ( r => {
                expect ( r ).to.be.equal ( null ) // Data is no longer available because it was flushed
                pool.flush () // No arguments => Flush everything
                return Promise.all ([
                                  pool.get ( ['name', 'first'] )
                                , pool.get ( ['name', 'second'] )
                            ])
            })
        .then ( ([first, second]) => {
                expect ( first  ).to.be.equal ( null )
                expect ( second ).to.be.equal ( null )
                done ()
            })
}) // it flush

}) // describe
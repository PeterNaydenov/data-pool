import chai from 'chai'
import dataPool from '../src/main.js'
import askForPromise from 'ask-for-promise'

const expect = chai.expect;

describe ( 'Data-pool', done => {

it ( 'Write/read a string', () => {

    const pool = dataPool ();
    pool.set ( 'first', 'name', 'Peter' )
    pool.set ( 'first', 'sport', 'fencing' )

    Promise.all ([
                  pool.get ( 'first', 'name' )
                , pool.get ( 'first', 'sport' )
            ])
        .then ( ([name,sport]) => {
                    expect ( name  ).to.be.equal ( 'Peter' )
                    expect ( sport ).to.be.equal ( 'fencing' )
                    done ()
                });
}) // it Write/read a string


it ( 'Write/read key with extension', done => {

    const pool = dataPool ();
    pool.set ( 'first', ['name','player'], 'Peter' )
    pool.set ( 'first', 'sport', 'fencing' )

    pool.get ( 'first', 'name/player' ) // Extract from key with with extension - short version
        .then ( r => {
                    expect ( r ).to.be.equal ( 'Peter' )
                    return pool.get ( 'first', ['name','player'])  // Extract from key with with extension - extended version
            })
        .then ( r => {
                    expect ( r ).to.be.equal ( 'Peter' )
                    done ()
            })

}) // it Write/read key with extension



it ( 'Write/read immutable objects', done => {
    const pool = dataPool ();
    let data = {
                name  : 'Peter'
              , sport : 'fencing'
            };

    pool.set ( 'first', 'user', data )
    data.name = 'Stefan'
    pool.get ( 'first', 'user')
        .then ( r => {
                        expect ( r.name ).to.be.equal ( 'Peter' ) 
                        expect ( r.sport ).to.be.equal ( 'fencing' )
                        r.name = 'Ivan'
                        r.sport = 'skating'
                        return pool.get ( 'first', 'user' )
            })
        .then ( r => {
                        expect ( r.name ).to.be.equal ( 'Peter' ) 
                        expect ( r.sport ).to.be.equal ( 'fencing' )
                        done ()
            })
}) // it Write/read immutable objects



it ( 'Watch store for changes', done => {
    const pool = dataPool ();
    let data = {
                name  : 'Peter'
              , sport : 'fencing'
            };

    pool.on ( 'first', ( key, oldData, newData ) => {
                expect ( key     ).to.be.equal ( 'user' )
                expect ( oldData ).to.be.equal ( undefined )
                expect ( newData.name  ).to.be.equal ( 'Peter' )
                expect ( newData.sport ).to.be.equal ( 'fencing' )
                done ()
        })
    pool.set ( 'first', 'user', data )
}) // it watch store for changes



it ( 'List stores', () => {
    const pool = dataPool ();
    pool.set ( 'first', 'name', 'Peter' )
    pool.set ( 'second', 'connections', 123 )

    const ls = pool.list();
    expect ( ls.includes('first')  ).to.be.equal ( true )
    expect ( ls.includes('second')).to.be.equal ( true )
}) // it list stores



it ('Import store', done => {
    const pool = dataPool ();
    let data = {
                name  : 'Peter'
              , sport : 'fencing'
            };

    pool.importStore ( 'test', data )
    pool.get ( 'test', 'name' )
        .then ( r => {
                    expect ( r ).to.be.equal ( 'Peter' )
                    done ()
            })
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
})



it ( 'Store listing', () => {
    const pool = dataPool ();
    pool.set ( 'alpha', 'name', 'Peter' )
    pool.set ( 'beta', 'name', 'Stefan' )
    pool.set ( 'gama', 'name', 'Ivan'   )
    const list = pool.list ();
    expect ( list.length ).to.be.equal ( 3 )
    expect ( list.includes('alpha')).to.be.true
    expect ( list.includes('beta')).to.be.true
    expect ( list.includes('gama')).to.be.true
}) // it store listing


it ( 'Response with dummies', done => {
        const pool = dataPool ();
        const dummy = function ( ) {
                        const task = askForPromise ();
                        task.done ( 'skating' )
                        return task.promise
                    };

        pool.setDummy ( 'fake', 'sport', dummy )
        pool.get ( 'fake', 'sport' )
            .then ( r => {
                        expect ( r ).to.be.equal ( 'skating' ) // fake response
                        done ()
                    })
}) // it Response with dummies



it ( 'Dummies overwrite real data', done => {
    // *** Dummies are functions that should return a promise
    const pool = dataPool ();
    let data = {
                name  : 'Peter'
              , sport : 'fencing'
            };

    pool.importStore ( 'fake', data )
    const dummy = function ( ) {
                        const task = askForPromise ();
                        task.done ( 'skating' )
                        return task.promise
                    }
    pool.setDummy ( 'fake','sport', dummy )
    pool.get ( 'fake', 'sport' )
        .then ( r => {
                    expect ( r ).to.be.equal ( 'skating' )   // Pool will return the dummy
                    let x = pool.exportStore ( 'fake' )   
                    expect ( x.sport ).to.be.equal ( 'fencing' )   // Check for real store data
                    pool.removeDummy ( 'fake', 'sport' )
                    return pool.get ( 'fake', 'sport' )
            })
        .then ( r => {
                    expect ( r ).to.be.equal ( 'fencing' )
                    done ()
            })
}) // dummies overwrite real data


it ( 'Record with ttl', done => {
    const pool = dataPool ();
    pool.setTTL ( 'demo', 'name', 30 )
    pool.set ( 'demo', 'name', 'Peter' )
    setTimeout ( () => {
                    pool.get ( 'demo', 'name')
                        .then ( r => {
                                    expect ( r ).to.be.equal ( null )
                                    done ()
                            })
            }, 50 )
}) // it record with ttl



it ( 'Use API with ttl', done => {
    const 
          pool = dataPool ()
        , firstRead = askForPromise ()
        ;
    const API = {
                    getName ()  {
                            return new Promise ( (resolve,reject) => {
                                        resolve ( 'Peter' )
                                })
                        }
                }
    pool.addApi ({ API })
    pool.setTTL ( 'API', 'getName', 30 )
    pool.get ( 'API', 'getName')
        .then ( r => {  // Will call API method
                        expect ( r ).to.be.equal ( 'Peter' )
                        API.getName = () => new Promise ( (resolve) => resolve('Stefan')   ) // Modify API method
                        return pool.get ( 'API', 'getName' )
            })
        .then ( r => {  // Receive result from cache
                        expect ( r ).to.be.equal ( 'Peter' )
                        setTimeout ( () => firstRead.done (), 50)   // Wait for the record expire
            })

    firstRead.onComplete ( () => {
                        pool.get ( 'API', 'getName' )
                            .then ( r => {
                                        expect ( r ).to.be.equal ( 'Stefan' )
                                        done ()
                                })
        })
}) // it use API with ttl



it ( 'Check with "has"', () => {
    const pool = dataPool ();
    expect ( pool.has ('test') ).to.be.equal ( false )
    expect ( pool.has ( 'test', 'k') ).to.be.equal ( false )
    pool.importStore ( 'test', {} )
    expect ( pool.has ( 'test')).to.be.equal ( true )
    expect ( pool.has ( 'test', 'k')).to.be.equal ( false )
    pool.set ( 'test', 'k', 'Peter' )
    expect ( pool.has ( 'test', 'k')).to.be.true
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
    pool.setUpdate ( 'API', 'getCounter', 10 )
    pool.get ( 'API', 'getCounter' )
    setTimeout ( () => pool.removeUpdate ('API', 'getCounter'), 25 )
    setTimeout ( () => {
                    expect ( counter ).to.be.equal ( 3 )
                    done ()
            } , 46 )
}) // it Update record on interval


it ( 'Remove API', done => {
    const pool = dataPool ();
    let counter = 0;
    const API = {
                    getCounter () {
                            return new Promise ( resolve => resolve (counter++)   )
                        }
            };
    pool.addApi ( { API })
    pool.setUpdate ( 'API', 'getCounter', 10 )
    setTimeout ( () => pool.removeApi ( 'API' ), 26 )  // Method removeApi should stop updates related to the API

    pool.get ( 'API', 'getCounter' )
    setTimeout ( () => {
                    expect ( counter ).to.be.equal ( 3 )
                    done ()
            } , 60 )
}) // remove API


it ( 'No cache', done => {
    const pool = dataPool ();
    let counter = 0;
    const API = {
                    getCounter () {
                            return new Promise ( resolve => resolve (counter++)   )
                        }
            };
    pool.addApi ( { API })
    pool.get ( 'API', 'getCounter' )                    // first request hit the api. Counter == 1
        .then ( r => pool.get ( 'API','getCounter')   ) // request => result from cache. Counter == 1
        .then ( r => pool.get ( 'API','getCounter')   ) // request => result from cache. Counter == 1
        .then ( r => {
                    pool.setNoCache ( 'API', 'getCounter' )
                    return pool.get ( 'API','getCounter'  )   // request => result from API. Counter == 2
            })
        .then ( r => pool.get ( 'API','getCounter')       )   // request => result from cache. Counter == 3
        .then ( r => {
                    pool.removeNoCache ( 'API', 'getCounter' )
                    return pool.get ( 'API','getCounter'  )   // request => result from cache. Counter == 3
            })
        .then ( r => {
                    expect ( counter ).to.be.equal ( 3 )
                    done ()
            })
}) // it no cache



it ( 'Flush', done => {
    const pool = dataPool ();
    pool.set ( 'first', 'name', 'Peter' )
    pool.set ( 'second','name', 'Stefan' )
    pool.get ( 'first', 'name' )
        .then ( r => {
                expect ( r ).to.be.equal ( 'Peter' )
                pool.flush ( 'first' )
                return pool.get ( 'first', 'name' )
            })
        .then ( r => {
                expect ( r ).to.be.equal ( null )
                return pool.get ( 'second', 'name' )
            })
        .then ( r => {
                expect ( r ).to.be.equal ( 'Stefan' )
                pool.flush ( 'second', 'name' )
                return pool.get ( 'second', 'name' )
            })
        .then ( r => {
                expect ( r ).to.be.equal ( null )
                pool.flush ()
                return Promise.all ([
                                  pool.get ( 'first', 'name' )
                                , pool.get ( 'second', 'name' )
                            ])
            })
        .then ( ([first, second]) => {
                expect ( first   ).to.be.equal ( null )
                expect ( second ).to.be.equal ( null )
                done ()
            })
}) // it flush

}) // describe
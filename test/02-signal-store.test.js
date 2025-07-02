import { expect }    from 'chai'
import dataPool      from '../src/main.js'
import askForPromise from 'ask-for-promise'



describe ( 'Data-pool: Signal store', () => {



it ( 'Set stores as signal stores', () => {
        const pool = dataPool ();
        pool.setSignalStore ( 'before' )
        const result = pool.setSignalStore ( ' first, second ' )
        expect ( result ).to.be.deep.equal ( [ 'before','first', 'second' ] )
}) // it set stores as signal stores



it ( 'Set and get a signal property', () => {
        const pool = dataPool ();
        pool.setSignalStore ( 'signal, other' )
        pool.set ([ 'name', 'signal'], 'Peter' )
        pool.set ([ 'family', 'signal'], 'Naydenov' )
        pool.set ( ['age', 'other'], 23 )
        let res = pool.get ( [['name,family', 'signal'],['age,ha', 'other']])
        expect ( res ).to.be.deep.equal ( ['Peter', 'Naydenov', 23, null] )
}) // it set and get a signal property



it ( 'Set a computed property', () => {
        const pool = dataPool ();
        const data = { 
                          name: 'Peter'
                        , family: 'Naydenov' 
                        , personal : {
                                          age: 23
                                        , height: 180
                                        , weight: 80
                                        , gender: 'male'
                                        , address: { city: 'Sofia', country: 'Bulgaria' }
                                }
                }

        pool.setSignalStore ( 'signal' )
        pool.importStore ( 'signal', data )
        pool.setComputed (['info', 'signal'], ({signal}) => {
                                        // All signal stores are available to the computed function as a signals!
                                        const age = signal.personal.get().age;
                                        return  `${signal.name.get()} ${signal.family.get()} is ${age} years old`  
                                }) 

        let r = pool.get ( ['info', 'signal'] )
        expect ( r ).to.be.equal ( 'Peter Naydenov is 23 years old' )
})



it ( 'Import object as a signal store', () => {
        const pool = dataPool ();
        const data = { 
                          name: 'Peter'
                        , family: 'Naydenov' 
                        , personal : {
                                          age: 23
                                        , height: 180
                                        , weight: 80
                                        , gender: 'male'
                                        , address: { city: 'Sofia', country: 'Bulgaria' }
                                }
                }

        pool.setSignalStore ( 'signal' )
        pool.importStore ( 'signal', data )

        data.family = 'Changed'
        let poolFamily = pool.get ( ['family', 'signal'] );
        expect ( poolFamily ).to.be.equal ( 'Naydenov' )

        pool.setComputed (['info', 'signal'], ({signal},x) => {
                                        const age = signal.personal.get().age;
                                        expect  ( x ).to.be.equal ( 12 )
                                        return  `${signal.name.get()} ${signal.family.get()} is ${age} years old`  
                                }, 12 ) 
                        // (position, computedFunction, ...extraDefaultArguments )        
        let r = pool.get ( ['info', 'signal'] )
        expect ( r ).to.be.equal ( 'Peter Naydenov is 23 years old' )

        pool.set (['family', 'signal'], 'Changed2' )
        r = pool.get ( ['info', 'signal'] )
        expect ( r ).to.be.equal ( 'Peter Changed2 is 23 years old' )
}) // it import object as a signal store



it ( 'Export signal store as a data', () => {
        const pool = dataPool ();
        const data = { 
                          name: 'Peter'
                        , family: 'Naydenov' 
                        , personal : {
                                          age: 23
                                        , height: 180
                                        , weight: 80
                                        , gender: 'male'
                                        , address: { city: 'Sofia', country: 'Bulgaria' }
                                }
                }
        pool.setSignalStore ( 'signal' )
        pool.importStore ( 'signal', data )
        pool.setComputed (['info', 'signal'], ({signal}) => {
                                        const age = signal.personal.get().age;
                                        return  `${signal.name.get()} ${signal.family.get()} is ${age} years old`  
                                }) 

        let r = pool.exportStore ( 'signal' )
        // data should include the computed properties
        expect ( r.info ).to.be.equal ( 'Peter Naydenov is 23 years old' )
        delete ( r.info )
        // other properties should be the same
        expect ( r ).to.be.deep.equal ( data )
}) // it export signal store



it ( 'Set and execute a effect', () => {
        const pool = dataPool ();
        const data = { 
                          name: 'Peter'
                        , family: 'Naydenov' 
                        , personal : {
                                          age: 23
                                        , height: 180
                                        , weight: 80
                                        , gender: 'male'
                                        , address: { city: 'Sofia', country: 'Bulgaria' }
                                }
                }
        let counter = 0;

        pool.setSignalStore ( 'signal' )
        pool.importStore ( 'signal', data )
        // Execute the effect on changes in 'name' and 'family' props of the 'signal' store
        pool.setEffect ([ 'name,family', 'signal'], ( x ) => { 
                                // 'x' is the extra argument of setEffect and comes as
                                // argument in every call of the effect
                                // Create a dependency injection by providing object 
                                // that should be controlled by the effect
                                expect ( x ).to.be.equal ( 'extra' )
                                counter++ 
                        }, 'extra' )

        pool.set ([ 'name', 'signal'], 'Someone' )
        expect ( counter ).to.be.equal ( 1 )

        pool.set ([ 'family', 'signal'], 'Changed' )
        expect ( counter ).to.be.equal ( 2 )

        pool.set ([ 'personal', 'signal'], { 
                          age: 51
                        , height: 175
                        , weight: 67
                        , gender: 'male'
                        , address: { city: 'Sofia', country: 'Bulgaria' } 
                })
        // 'personal' changes will not trigger the effect
        expect ( counter ).to.be.equal ( 2 )
}) // it set and execute a effect


}) // describe
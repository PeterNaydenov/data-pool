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



it ( 'Import object as a signal store') // it import object as a signal store
it ( 'Export signal store as a data') // it export signal store
it ( 'Set a computed property' )
it ( 'Set and execute a effect' )


}) // describe
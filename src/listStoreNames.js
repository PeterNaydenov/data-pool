function listStoreNames ( db ) {
return function listStores () {
        return Object.keys ( db )
}}



export default listStoreNames



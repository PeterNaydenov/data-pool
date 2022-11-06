function setDummy ( dummyRequests ) {
return function setDummy (store,key,fn) {   // Argument 'fn' should return a promise
        dummyRequests[`${store}/${key}`] = fn
}}



export default setDummy



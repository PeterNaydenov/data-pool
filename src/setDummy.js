function setDummy ( dummyRequests ) {
return function setDummy ([key,store='default'], fn ) {   // Argument 'fn' should return a promise
        dummyRequests[`${store}/${key}`] = fn
}}



export default setDummy



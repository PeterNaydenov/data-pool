
function readKey ( k ) {
        let key, ext, location;   // key parameters
        let kList = k.split ( '/' );
        location = k
        if ( kList.length > 1 ) {
                    key = k[0]
                    ext = kList.slice ( 1 ).join ( '/' )
            }
        else {
                    key = k
                    ext = false
            }
        return { key, ext, location }
} // readKey func.



export default readKey



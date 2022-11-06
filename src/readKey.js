
function readKey ( k ) {
        let key,ext, location;
        if ( typeof k !== 'string' ) {
                    key = k[0]
                    ext = k[1]
                    location = `${key}/${ext}`
            }
        else {
                    key = k
                    ext = false
                    location = key
            }
        return { key, ext, location }
} // readKey func.



export default readKey



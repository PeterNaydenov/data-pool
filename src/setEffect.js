function setEffect ( dependencies ) {
        const { signalNest, signalStores, db } = dependencies;
        return ( ks, fn ) => {
                    if ( typeof ks[0] === 'string' )   ks = [ ks ]   // Unify the input data structure 
                    // list contains signals that will trigger function on change
                    const list = ks.reduce ( ( res, item ) => {
                                                    const st = item[1];
                                                    if ( !signalStores.includes ( st ) ) { 
                                                                console.error ( `Store "${st}" is not a signal store. Use only stores: ${signalStores.join ( ', ' )}` )
                                                        }
                                                    else {
                                                                let ls = item[0].split(',').map ( k => k.trim () )
                                                                ls.forEach ( k => res.push ( db[st][k] ) )
                                                        }
                                                    return res
                                        }, [] )
                    signalNest.effect ( list, fn )
}} // setEffect func.



export default setEffect



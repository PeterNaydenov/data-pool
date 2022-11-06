function removeUpdates ( updateRequest, intervals, store ) {
        Object.keys ( updateRequest ).forEach ( k => {
                    if ( k.includes(store) )   delete updateRequest[k]
            })
        Object.keys ( intervals ).forEach  ( k => {
                    if ( k.includes(store) )   clearTimeout ( intervals[k] )
            })
} // removeUpdates func.



export default removeUpdates



function setUpdate ( dependencies ) {
    const { readKey, updateRequest } = dependencies;
return function setUpdate ( [ k, store], interval ) {
    const { key } = readKey ( k );
    updateRequest[`${store}/${key}`] = interval
}} // setUpdate func.



export default setUpdate



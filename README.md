# Data-pool (@peter.naydenov/data-pool)

![version](https://img.shields.io/github/package-json/v/peterNaydenov/data-pool)
![license](https://img.shields.io/github/license/peterNaydenov/data-pool)
![GitHub issues](https://img.shields.io/github/issues/peterNaydenov/data-pool)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/%40peter.naydenov%2Fdata-pool)

`Data-pool` is a data-layer for node apps and single page application (**SPA**). Data-pool will simplify data maintanance with :

- Immutable data stores;
- Caching data records from Api requests;
- Optional TTL for each data record;
- Optional update schedule for each data record;
- A mechanism to fake Api request response;

## Instalation
Install for node.js projects by writing in your terminal:

```
npm i @peter.naydenov/data-pool
```
Once it has been installed, it can be used by writing this line of JavaScript:

```js
import dataPool from '@peter.naydenov/data-pool'
```

or 

```js
const dataPool = require ( '@peter.naydenov/data-pool' );
```


## How to use it
Create a `data-pool` instance:

```js
const pool = dataPool ();
```
Now you are free to add and manipulate stores and data. For more details read the '**Methods**' section

## Methods


```js
  set           : 'Create new record'
, get           : 'Returns existing data, or requesting it from related API'
, addApi        : 'Associate one or more APIs with data-pool'
, removeApi     : 'Remove associated API. Single API only'
, list          : 'List stores with data'
, has           : 'Checks if store or store-key exist. Returns a boolean: true/false'
, importStore   : 'Add data as a store' 
, exportStore   : 'Export store as a data'
, on            : 'Watch for store changes' 
, setDummy      : 'Define dummy source-data for store-key. Should be a function that returns a promise.'
, removeDummy   : 'Remove dummy source-data.'
, setTTL        : 'Set a TTL for a store-key record.'
, removeTTL     : 'Remove a ttl record'
, setUpdate     : 'Set recurring updates for specific API related record'
, removeUpdate  : 'Remove recurring updates requests'
, setNoCache    : 'Specify store-key records that should not have cache'
, removeNoCache : 'Remove no cache setting per store-key'
```


### pool.set
Creates a new data record in data pool.
```js
pool.set ( storeName, key, data )
/**
 *  Arguments:
 *    - storeName: string(required). Name of the store;
 *    - key: string or tuple(required). 
 *             if it's a string -> data identifier
 *             if it's a tuple -> first element is the data identifier, 
 *                                second is the extension.
 *      Extension should be available because some Api calls can return different
 *      results and we want to keep instead of overwrite them. Example: "getProduct"
 *      method can return product specification but we have a lot of products. We want
 *      to keep them in data-pool as a separate objects.
 *    - data: Any(required). Provide any data that should be saved;
 * 
 *   Returns: void
 * /

```

Example:

```js
 pool.set ( 'demo', 'name', 'Peter' )
 /**
  * 1: No store 'demo': 
  *  Will create store 'demo' and will set property 'name' to 'Peter'
  * 2: There is store 'demo':
  * Will create a property 'name' for store 'demo'
  * 3: There is store 'demo' with a property 'name'
  * Will overwrite the property 'name' with 'Peter'
  * /
 // 
    
```


### pool.get
Returns a requested store/key. If there is no value and there is associated Api, will send request to the Api. Dummy values per store/key will overwrite the Api if they exists.

```js
pool.get ( storeName, key, ...other )
/**
 *  Arguments:
 *     - storeName: string(required). Name of the store;
 *     - key: string or tuple(required). 
 *             if it's a string -> data identifier
 *             if it's a tuple -> first element is the data identifier, 
 *                                second is the extension.
 *   Returns: Any<Promise>
 * /

```

Example:

```js
  pool.get ( 'demo', 'name' )
      .then ( r => {
                // r = 'Peter'
            })
```

### pool.addApi
Register api in data-pool as source of information. Api name will become a store name and api methods will become keys. Key as a tuple represents methods that can return more that one result and records will need specification. 
For example - key:[ getProduct, 2443 ]. getProduct can return all items in the system, but extension specifies the exact product ID.

```js
 pool.addApi ( apiList )
 /**
  *  Arguments:
  *  - apiList: object(required). List of Api that should work into data-pool
  *  Returns: void
  * /
 
```

Example:

```js
// we have api for users(userAPI) and api for products(productAPI)
pool.addApi ({ 
            user:userAPI, 
            product:productAPI 
        })

// userApi has method 'getDetails'. Here is an example how we can call that method
pool.get ( 'user', 'getDetails' )
    .then ( r => {
                // r will contain result of userAPI.getDetails()
        })

```


### pool.removeApi
Removes conection of data-pool to api. Removes all 'updates' related to these api methods.

```js

pool.removeApi ( apiName )
/**
 *  Arguments:
 *  - apiName - string(required). Api name that should be removed;
 *  Returns: void
 *
 * /

````

Example:

```js
  pool.removeApi ( 'user' )
 // Will remove association with userAPI from prev. example
 pool.get ( 'user', 'getDetails' )
     .then ( r => {
                    // Relation to the api is removed but store still exists!
                    // 1. If store has record for 'user','getDetails' -> will return the result
                    // 2. If there is no record -> will return null. 
                })
```


### pool.list
Returns list of all existing stores.
```js
pool.list ()
/**
 *  no arguments
 *  Returns: string[]. 
 * /
```
Example:
```js
// If we have association to userAPI and productAPI, and we have called once a
// pool.get ( 'user','getDetails' )
const list = pool.list ()
// list => [ 'user' ]
```
Accociation of the productAPI with data-pool will not create the store automatically. Store will be created when we have data for it.

### pool.has
Check if store or store/key exists.

```js
  pool.has ( storeName, key )
  /**
   *  Arguments
   *  - storeName - string(required). Name of the store.
   *  - key: string or tuple(optional). 
   *             if it's a string -> data identifier
   *             if it's a tuple -> first element is the data identifier, 
   *                                second is the extension.
   *  Returns: boolean.
   * /
```

Example:

```js
  const hasStore = pool.has ( 'user' )
  // hasStore => true
```


### pool.importStore
Converts a javascript object to data-pool store.

```js
 pool.importStore ( storeName, data )
 /**
  *   Arguments:
  *     - storeName - string(required). Data will become a store
  *     - data - object(required). Any data 
  * 
  *   Returns : void
  * /
```

Example:

```js
const data = {
                name : 'Peter'
              , age : 48
            }
pool.importStore ( 'yo', data )
pool.get ( 'yo', 'name' )
    .then ( r => {
                // r === 'Peter'
        })

```


### pool.exportStore
Returns a store as a javascript object

```js
pool.exportStore ( storeName )
/**
 *  Arguments:
 *  - storeName - string(required). Name of the store for export
 *  Returns : object
 * /
```


### pool.on
Data-pool events are triggered on store's data changes.

```js
pool.on ( nameOfStore, callback )
function callback ( key, oldData, newData ) {
                // ....
        }
/**
 *   Method 'on' Arguments
 *   - nameOfStore - string(required). Listen for changes in the specified store.
 *   - callback - function(required). Fn will be executed on every data field change;
 *   Returns : void
 * 
 *  Callback Arguments:
 *   - key     -  Name of the changed field
 *   - oldData - field value at until now
 *   - newData - field upcoming value
 *  Returns : void
 * /
```



### pool.setDummy
Set a dummy source of information for specific store/key. Used for testing and development purposes. If Api is not ready we can provide expected data as using a dummy function. To get back to real api call remove the dummy. Dummy will always overwrite default source of information.

```js
pool.setDummy ( storeName, key, dummyFn )
/**
 *  Arguments:
 *     - storeName: string(required). Name of the store;
 *     - key: string or tuple(required). 
 *             if it's a string -> data identifier
 *             if it's a tuple -> first element is the data identifier, 
 *                                second is the extension. 
 *     - dummyFn: function. Function will be executed always when we have
 *                specified storeName/key. Function should return a promise.
 * 
 *  Returns: void
 * /
```


### pool.removeDummy
Cancel dummy source of information.

```js
pool.removeDummy ( storeName, key )
/**
 *  Arguments:
 *     - storeName: string(required). Name of the store;
 *     - key: string or tuple(required). 
 *             if it's a string -> data identifier
 *             if it's a tuple -> first element is the data identifier, 
 *                                second is the extension. 
 */
```

### pool.setTTL
Set a 'time to live'(TTL) to specific store/key.

```js
 pool.setTTL ( storeName, key, ttl )
 /**
  *  Arguments: 
  *  - storeName : string(required). Name of the store;
  *  - key: string(required). Data identifier
  *  - ttl: number(required). Time to live in ms. 
  *  Returns: void
  */ 
```

### pool.removeTTL
Cancel TTL for specific store/key.

```js
pool.removeTTL ( storeName, key )
/**
 *  Arguments:
 *  - storeName: string(required). Name of the store;
 *  - key: string(required). Data identifier;
 *  Returns: void
 */
```

### pool.setUpdate
Set interval to update record for api related stores.

```js
pool.setUpdate ( storeName, key, interval )
/**
 *  Arguments:
 *  - storeName: string(required). Name of the store;
 *  - key: string(required). Data identifier;
 *  - interval: number(required). Interval for next update in ms.
 *  Returns: void;
 */
```

### pool.removeUpdate
Cancel automatic update for api related stores.

```js
pool.removeUpdate ( storeName, key )
/**
 *  Arguments:
 *  - storeName: string(required). Name of the store;
 *  - key: string(required). Data identifier;
 *  Returns: void
 */
```



### pool.setNoCache
Use '*setNoCache*' method with api related stores. Set `store-key` as no-cache and every data request will hit the api.

```js
 pool.setNoCache ( storeName, key )
 /**
  *  Arguments:
  *  - storeName : string(required). Name of the store;
  *  - key: string(required). Data identifier;
  *  Returns: void
  */
```

### pool.removeNoCache
Cancel no-cache request.

```js
pool.removeNoCache ( storeName, key )
/**
 * Arguments:
 *  - storeName: string(required). Name of the store;
 *  - key: string(required). Data identifier;
 *  Returns : void
 */
```



## Credits
'@peter.naydenov/data-pool' was created and supported by Peter Naydenov.



## License
'@peter.naydenov/data-pool' is released under the MIT License.



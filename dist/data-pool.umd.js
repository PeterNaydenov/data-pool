(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.dataPool = factory());
})(this, (function () { 'use strict';

  /*
     askForPromise Description
     ========================
     Returns object with the promise and related helper functions.
     - Created March 12th, 2016;
     - Promise with timeout added July 16th, 2017 (v.1.3.0);
     - askForPromise.all & AskForPromise.sequence added October 15th, 2023(v.1.4.0);
     - jsDocs type definitions added October 27th, 2023(v.1.5.0);
     - Converted to ES6 module January 6th, 2024(v.2.0.0);
     - Massive refactoring of the library. Method 'each' added December 18th, 2024(v.3.0.0);
  */



  /**
   * @interface AskObject
   * @description Object with promise and related helper functions
   * @property {Promise} [promise] - Promise object if a single promise is created
   * @property {Array<AskObject>|null} [promises] - Array of promises if multiple promises are created
   * @property {Function} done - Resolve function
   * @property {Function} cancel - Reject function
   * @property {Function} each - Callback function to be called for each list item
   * @property {Function} onComplete - Function to be called after promise is resolved
   * @property {Function} timeout - Function to set timeout on promise
   */



  /**
   * Creates object with promise and related helper functions
   * @function askForPromise
   * @param {Array<any>} [list] - List of items that need to have a corresponding promise.(optional)
   * @returns {AskObject} Object with promise and related helper functions
   */
  function askForPromise ( list ) {
          if ( list ) return _manyPromises ( list )
          else        return _singlePromise ();
   } // askForPromise func.



  /**
   * @function sequence
   * @description Executes list of functions that return a promise in sequence.
   * @param {Array<Function>} list - List of functions that return a promise
   * @param {...any} args - Arguments to be passed to each function in the list
   * @returns {AskObject} - Object with promise and related helper functions
   */
   askForPromise.sequence = function promiseInSequence ( list, ...args ) {
    const 
          task = askForPromise ()
        , result = []
        ;

    function* listGen ( n ) {   for ( const el of n ) { yield el; }} 
    const g = listGen ( list );

    function wait ( n, ...args ) {   // Recursive function for calling function list in sequence
        if ( n.done ) {
                 task.done ( result );
                 return
            }
        n.value (...args).then ( r => {
                result.push ( r );
                wait( g.next(), ...args, r );
            }); 
        } // wait func.

    wait ( g.next(), ...args ); // Starting with iteration of list
    return task
  }; // promiseInSequence func.



  /**
   * @function all
   * @description Executes list of functions that return a promise in parallel.
   * @param {Array<Function>} list - List of functions that return a promise
   * @param {...any} args - Arguments to be passed to each function in the list
   * @returns {AskObject} - Object with promise and related helper functions
   */
  askForPromise.all = function promiseAll ( list, ...args ) {
    const 
          task = askForPromise ()
        , result = []
        , r = list.map ( (n,i) => { 
                              return (typeof n === 'function') ? n(...args).then ( r => result[i] = r   ) 
                                                               : n.then ( r => result[i] = r   )
                          })
        ;
    Promise.all ( r ).then ( () => task.done(result)   );
    return task
  }; // promiseAll func.





  /**
   * Creates a single promise with helper functions.
   * @function _singlePromise Creates a single promise
   * @returns {AskObject} Object containing the promise and related helper functions such as:
   * - promise: The promise itself
   * - done: Function to resolve the promise
   * - cancel: Function to reject the promise
   * - each: Function to iterate over a single promise (no-op for a single promise)
   * - onComplete: Function to be called after the promise is resolved
   * - timeout: Function to set a timeout on the promise
   */
  function _singlePromise () {
    let  done, cancel;
    const x = new Promise ( (resolve, reject ) => { 
                                                    done   = resolve;
                                                    cancel = reject;
                                   });
     /** @type {AskObject} */ 
     const askObject = { 
                 promise    : x
               , promises   : null
               , done       
               , cancel     
               , each       : () => {}
               , onComplete : _after(x)
               , timeout    : () => {}
             };

      askObject.timeout = _timeout ( false, askObject );
      askObject.each = (cbFn, ...args) => { cbFn({value: null, done: done, cancel: cancel, timeout: askObject.timeout}, ...args); };
      
      return askObject
     } // _singlePromise func.



  /**
   * Creates an object with multiple promises and related helper functions.
   * @param {Array<any>} list - List of items that need to have a corresponding promise.
   * @returns {AskObject} Object containing the promises and related helper functions such as:
   * - promise: It's equal to Promise.all (list of promises)
   * - promises: An array of single promise objects
   * - done: Function to resolve all promises
   * - cancel: Function to reject all promises
   * - each: Function to iterate over the promises and call a callback function for each promise
   * - onComplete: Function to be called after all promises are resolved
   * - timeout: Function to set a timeout on all promises
   */
   function _manyPromises ( list ) {
                                      let listOfPromiseObjects = list.map ( el => _singlePromise() );
                                      let listOfPromises   = listOfPromiseObjects.map ( o => o.promise );
                                      
                                      listOfPromiseObjects [ 'promises' ] = listOfPromiseObjects;
                                      let onComplete = _after ( Promise.all (listOfPromises) );



                                    /**
                                     * Reads the state of a promise
                                     * @function readPromiseState
                                     * @description Returns the state of the promise as string: 'pending', 'fulfilled', or 'rejected'
                                     * @param {Promise} promise - The promise to read the state of
                                     * @returns {string} The state of the promise as string
                                     */
                                      function readPromiseState ( promise ) {
                                              let state = 'pending';
                                              promise.then ( () => state = 'fulfilled' )
                                                      .catch ( () => state = 'rejected' );
                                              return state
                                        } // readPromiseState func.
                                     


                                    /**
                                     * Iterates over the promises and calls the callback function for each.
                                     * Callback function will receive an object with the following properties:
                                     * - value: the value associated with the promise
                                     * - done: the promise resolve function
                                     * - cancel: the promise reject function
                                     * - timeout: a function that sets the timeout on the promise
                                     * @param {function} cbFn - callback function to be called for each promise
                                     * @param {...any} args - additional arguments to be passed to the callback function
                                     */
                                      function each ( cbFn, ...args ) {
                                              listOfPromiseObjects.forEach ( (prom,i) => cbFn ({
                                                                                              value:list[i], 
                                                                                              done: prom.done, 
                                                                                              cancel: prom.cancel, 
                                                                                              timeout: prom.timeout, 
                                                                                              state: readPromiseState(prom.promise) 
                                                                                          }, 
                                                                                          ...args
                                                                                        ));
                                        } // each func.



                                      /** @type {AskObject} */
                                      const askObject = {
                                                    promise    : Promise.all ( listOfPromises )
                                                  , promises   : listOfPromiseObjects
                                                  , done       : ( response )  => { listOfPromiseObjects.forEach ( o => o.done( response  ) );}
                                                  , cancel     : ( response )  => { listOfPromiseObjects.forEach ( o => o.cancel( response ) );}
                                                  , each
                                                  , onComplete : onComplete
                                                  , timeout    : () => {}
                                              };
                                      askObject.timeout = _timeout ( true, askObject );
                                      return askObject
     } // _manyPromises func.



  /**
   * Creates a function that will be called after promise is resolved
   * @param {Promise} x - The promise
   * @returns {Function} Function to be called after promise is resolved
   */
  function _after ( x ) {
  /**
   * @function onComplete
   * @description Function to be called after promise is resolved
   * @param {Function} fx - Function to be called after promise is resolved
   * @param {Function|null} [rejectFx] - Optional. Function to be called if promise is rejected
   * @returns {void} - Nothing
   */
  return function onComplete ( fx, rejectFx=null ) {
                  if ( rejectFx === null ) x.then ( res => fx(res) );
                  else                     x.then ( res => fx(res) , res => rejectFx(res)  );
  }} // _after func.



  /**
   * Creates a timeout function for the given promise(s) in the AskObject.
   * If `isList` is true, the timeout is applied to the collection of promises,
   * otherwise it is applied to a single promise.
   * 
   * When the timeout duration (`ttl`) is reached before the promise(s) resolve,
   * the provided expiration message (`expMsg`) is returned.
   * 
   * @param {boolean} isList - Flag indicating if the AskObject contains multiple promises.
   * @param {AskObject} askObject - The AskObject containing the promise(s) to apply the timeout to.
   * @returns {Function} - A function that sets a timeout on the promise(s) and updates the AskObject.
   */

  function _timeout ( isList, askObject ) {
        let main;
        
        if ( isList ) main = Promise.all( askObject.promises.map ( o => o.promise ) );
        else          main = askObject.promise;

        /**
         * @function timeout
         * @description Sets timeout on promise
         * @param {number} ttl - Timeout in milliseconds
         * @param {string|number} expMsg - Message to be returned if timeout occurs
         * @returns {AskObject} - Object with promise and related helper functions
         */
        return function timeout( ttl, expMsg ) {
                  let timer;
                  let timeout = new Promise ( (resolve, reject) => {
                                          timer = setTimeout ( () => {
                                                          resolve ( expMsg );
                                                          Promise.resolve ( main );
                                                      }, ttl);
                                      }); // timeout
                  main.then ( () => clearTimeout(timer)   );                
                  askObject [ 'onComplete'] = _after ( Promise.race ([main, timeout])   );
                  return askObject
              }
      } // _timeout func.

  function findType ( x ) {
      if ( x == null              )   return 'simple' // null and undefined
      if ( x.nodeType             )   return 'simple' // DOM node
      if ( x instanceof Array     )   return 'array'
      if ( typeof x === 'object'  )   return 'object'
      return 'simple'   // number, bigint, string, boolean, symbol, function 
   } // findType func.

  function validateForInsertion ( k, result ) {
      const inArray = result instanceof Array;
      if ( !inArray )   return false
      const isNumber = !isNaN ( k );
      if ( isNumber )   return true
      else              return false
  } // validateForInsertion func.

  function copyObject ( resource, result, extend, cb, breadcrumbs, ...args ) {
      let 
            [ keyCallback, objectCallback ] = cb
          , keys = Object.keys ( resource )
          ;
          
      keys.forEach ( k => {
                      let 
                            type = findType(resource[k])
                          , item  = resource[k]
                          , resultIsArray = (findType (result) === 'array') 
                          , keyNumber = !isNaN ( k )
                          , IGNORE = Symbol ( 'ignore___' )
                          , isRoot = (breadcrumbs === 'root' && k === 'root' )
                          , br = isRoot ? 'root' : `${breadcrumbs}/${k}`
                          ;
          
                      if ( type !== 'simple' && objectCallback ) {
                                          item = objectCallback ({ value:item, key:k, breadcrumbs: br, IGNORE }, ...args );
                                          if ( item === IGNORE )   return
                                          type = findType ( item );
                          }

                      if ( isRoot ) {  
                                  extend.push ( generateList ( item, result,  extend, cb, br, args )   );
                                  return
                          }
                      
                      if ( type === 'simple' ) {
                                      if ( !keyCallback ) {
                                              if ( !isRoot )   result[k] = item;
                                              return
                                          }
                                      let keyRes = keyCallback ({ value:item, key:k, breadcrumbs: br, IGNORE }, ...args );
                                      if ( keyRes === IGNORE )   return
                                      const canInsert = validateForInsertion ( k, result );  // Find if it's array or object?
                                      if ( canInsert )    result.push ( keyRes ); // It's an array
                                      else                result [k] = keyRes;    // It's an object
                          }
                          
                      if ( type === 'object' ) {
                              const newObject = {};
                              if ( resultIsArray && keyNumber )   result.push ( newObject );
                              else                                result[k] = newObject;
                              extend.push ( generateList ( item, newObject,  extend, cb, br, args ) );
                         }
                         
                      if ( type === 'array' ) {
                              const newArray = [];
                              if ( resultIsArray && keyNumber )   result.push ( newArray );
                              else                                result[k] = newArray;
                              extend.push ( generateList( item, newArray, extend, cb, br, args ) );
                          }
              });
  } // copyObject func.



  function* generateList ( data, location, ex, callback, breadcrumbs, args ) {
      yield copyObject ( data , location, ex, callback, breadcrumbs, ...args );  
  } // generateList func.

  /**
   *  @typedef {object} Options
   *  @property {any} data - Required. Any JS data structure that will be copied.
   *  @property {function} [keyCallback] - Optional. Function executed on each primitive property.
   *  @property {function} [objectCallback] - Optional. Function executed on each object property.
   */


  /**
   *  Walk
   * 
   *  Creates an immutable copies of deep javascript data structures. 
   *  Executes callback functions on every object/array property(objectCallback) and every primitive property(keyCallback). 
   *  Callbacks can modify result-object by masking, filter or substitute values during the copy process.
   *  
   *  @function walk
   *  @param {Options} options   - Required. Object with required 'data' property and two optional callback functions: keyCallback and objectCallback. 
   *  @param {...any} args - Optional. Additional arguments that could be used in the callback functions.
   *  @returns {any} - Created immutable copy of the 'options.data' property.
   *  @example
   *  // keyCallbackFn - function executed on each primitive property
   *  // objectCallbackFn - function executed on each object property
   *  let result = walk ({ data:x, keyCallback:keyCallbackFn, objectCallback : objectCallbackFn })
   * 
   * 
   *  // NOTE: objectCallback is executed before keyCallback! 
   *  // If you modify object with objectCallback, then keyCallback 
   *  // will be executed on the result of objectCallback
   */
  function walk (options,...args) {
      let 
            { data:origin, keyCallback, objectCallback } = options
          , type = findType ( origin )
          , result
          , extend = []
          , breadcrumbs = 'root'
          , cb = [ keyCallback, objectCallback ]
          ;

      switch ( type ) {
              case 'array'  :
                                  result = [];
                                  copyObject ( {root:origin}, result, extend, cb, breadcrumbs, ...args );
                                  break
              case 'object' :
                                  result = {};
                                  copyObject ( {root:origin}, result, extend, cb, breadcrumbs, ...args );
                                  break
              case 'simple' :
                                  return origin
          } // switch type
          
      for ( const plus of extend ) {   plus.next(); }
      return result
  } // walk func.

  function notice () {
      
                      let 
                            scroll     = {'*':[]}  // General events with their subscribers
                          , scrollOnce = {}  // Single events with their subscribers
                          , ignore     = new Set ()  // Ignore event names ( general and single )
                          , debugFlag  = false 
                          , debugHeader = ''
                          ;
                      /**
                       *  Register a regular event.
                       *  @param {string|Symbol} e - Name of the event;
                       *  @param {function} fn - Behaviour that will be assigned to this eventName;
                       *  @returns void
                       */
                      function on ( e, fn ) {
                              if ( !scroll[e] ) scroll[e] = [];
                              scroll[e].push ( fn );
                          } // on func.

                      /**
                       * Register a single event that will be triggered only once.
                       * @param {string|Symbol} e - Name of the event; the wildcard '*' is not supported.
                       * @param {function} fn - Behaviour that will be executed when the event is triggered.
                       */
                      function once ( e, fn ) {
                              if ( e === '*' )   return  // The wildcard '*' doesn't work for 'once' events
                              if ( !scrollOnce[e] )   scrollOnce[e] = [];
                              scrollOnce[e].push ( fn );
                          } // once func.
                      /**
                       * Remove a behavior (function) related to the specified event.
                       * If 'fx' is provided, only that specific function will be removed from the event.
                       * If 'fx' is not provided, all functions related to the event will be removed.
                       * Works with both regular and single events.
                       * 
                       * @param {string|Symbol} e - Name of the event.
                       * @param {function} [fx] - Optional. The specific function to be removed.
                       */
                      function off ( e, fx ) {
                              if ( fx ) {   // fx is optional
                                      if ( scroll[e]     )  scroll[e]     = scroll[e].filter     ( fn => fn !== fx );
                                      if ( scrollOnce[e] )  scrollOnce[e] = scrollOnce[e].filter ( fn => fn !== fx );
                                      if ( scroll[e] && scroll[e].length         === 0 )   delete scroll[e];
                                      if ( scrollOnce[e] && scrollOnce[e].length === 0 )   delete scroll[e];
                                      return
                                  }
                              if ( scrollOnce[e] )   delete scrollOnce[e];
                              if ( scroll[e]     )   delete scroll[e];
                          } // off func.
                      /**
                       * Resets all event-related data structures.
                       * Clears all general and single event subscriptions, as well as the ignore list.
                       */
                      function reset () {
                              scroll     = {'*':[]};
                              scrollOnce = {};
                              ignore     = new Set ();
                          } // reset func.
                      /**
                       *  Enables or disables debug mode.
                       *  In debug mode, every triggered event prints a message to the console, including the event name and arguments.
                       *  The header argument is optional and can be used to provide a prefix string for the debug message.
                       *  @param {boolean} val - Enable or disable debug mode.
                       *  @param {string} [header] - Optional. The header string for the debug message.
                       *  @returns void
                       */
                      function debug ( val, header ) {
                              debugFlag =  val ? true : false;
                              if ( header && (typeof header === 'string') )   debugHeader = header;
                          } // debug func.
                      /**
                       * Triggers an event and executes all associated functions.
                       * 
                       * @param {string|Symbol} e - Name of the event to be triggered.
                       * @param {...*} [args] - Optional. Arguments to be passed to the callback functions.
                       * @returns void
                       */
                      function emit () {
                              const [ e, ...args ] = arguments;
                              if ( debugFlag ) {  
                                          console.log ( `${debugHeader} Event "${e}" was triggered.`);
                                          if ( args.length > 0 ) {
                                              console.log ( 'Arguments:');
                                              console.log ( ...args );
                                              console.log ( '^----' );
                                          }
                                          
                                  }

                              function exeCallback ( name ) {
                                          let stopped = false;
                                          if ( name === '*' )   return    
                                          if ( ignore.has(name) )   return
                                          scroll[name].every ( fn => {
                                                              const r = fn ( ...args );
                                                              if ( typeof(r) !== 'string'     )   return true
                                                              if ( r.toUpperCase() === 'STOP' ) {  
                                                                                                  stopped = true;
                                                                                                  return false
                                                                                      }
                                                              return true
                                                          });
                                          if ( !stopped )   scroll['*'].forEach ( fn => fn(e,...args)  );
                                  } // exeCallback func.

                              if ( e === '*' ) {   // The wildcard '*' doesn't work for 'once' events
                                          let evNames = Object.keys ( scroll );
                                          evNames.forEach ( name => exeCallback(name)   );
                                          return
                                  }
                              if ( scrollOnce[e] ) {
                                          if ( ignore.has(e) )   return
                                          scrollOnce[e].forEach ( fn => fn(...args)   );
                                          delete scrollOnce[e];
                                  }
                              if ( scroll[e]     ) { 
                                          exeCallback ( e );
                                  }
                          } // emit func.
                      /**
                       * Enables again specified event.
                       * 
                       * @param {string|Symbol} e - Name of the event to be enabled again; the wildcard '*' is supported.
                       * @returns void
                       */
                      function start ( e ) {
                              if ( e === '*' ) {  
                                          ignore.clear ();
                                          return
                                  }
                              ignore.delete ( e );
                          } // start func.
                      /**
                       * Temporarily disables specified event.
                       * 
                       * @param {string|Symbol} e - Name of the event to be disabled; the wildcard '*' is supported.
                       * @returns void
                       */
                      function stop ( e ) {
                              if ( e === '*' ) {
                                          const 
                                                evNames     = Object.keys ( scroll )
                                              , evOnceNames = Object.keys ( scrollOnce )
                                              ;
                                          ignore = new Set ([ ...evOnceNames, ...evNames ]);
                                          return
                                  }
                              ignore.add ( e );
                          } // stop func.

                      return {
                                    on    // Register a event
                                  , once  // Register a single event 
                                  , off   // Unregister regular and single events
                                  , reset // Unregister all events
                                  , emit  // Trigger a event
                                  , stop  // Ignore event for a while
                                  , start // Remove event from ignore list
                                  , debug
                          }
  } // notice func.

  function effectLib ( l ) {
  /**
   * Registers a side effect function that is executed when any of the specified 
   * signal states are updated.
   *
   * @param {Array} relations - An array of signals that this effect depends on.
   * @param {Function} fn - The side effect function to be executed when any of the signals change.
   */
  return function effect ( relations, fn, ...args ) {
      const id = Symbol ( 'effect' );
      l.callID = id;
      l.storage[id] = { id, fn, defaultArgs: args };
      relations.forEach ( signal => signal.get() );   // Register effect in signal state
      l.callID = null;
  } // effect func.
  } // effectLib func.

  function stateLib ( l ) {


  /**
   * Creates a reactive item with an initial value and optional validation function.
   * 
   * @param {any} initialValue - The initial value of the item.
   * @param {Function|boolean} [validation=false] - An optional validation function that takes a new value
   * and returns a boolean indicating if the new value is valid. Defaults to false, which means no validation.
   * 
   * @returns {Object} An object with `get`, `set` and `modify` methods:
   *  - `get`: Retrieves the current value of the item.
   *  - `set`: Attempts to update the item's value. If validation is provided and fails, returns false. Otherwise, returns true.
   *  - `modify`: Accepts a function that takes the current value of the item and returns a new value. 
   *    If validation is provided and fails, returns false. Otherwise, returns true.
   */
  function state ( initialValue, validation=false ) {
      const id = Symbol ( 'item' );
      l.storage[id] = { id, value: structuredClone ( initialValue ) , validate: validation, deps: new Set(), effects: new Set() };
  // TODO: Did promises have a place here?
  // TODO: What about dependency injection here or in computed and effect functions?
  // TODO: Can 'notes' get benefit from signals?

      function set ( newValue ) {
                  const rec = l.storage[id];
                  if ( rec.validate) {
                              if ( rec.validate && rec.validate ( newValue ) )  l.storage[id].value = structuredClone ( newValue );
                              else                                              return false
                          }
                  else l.storage[id].value = structuredClone ( newValue );
                  for ( const val of l.storage[id].deps ) {
                              l.storage[val].dirty = true;
                      }
                  for ( const val of l.storage[id].effects ) {
                              let { fn, defaultArgs } = l.storage[val];
                              fn ( ...defaultArgs  );
                      }
                  return true                                            
              } // set func.

  function get () {   
                  if ( l.callID && l.callID.toString() === 'Symbol(effect)'   )   l.storage[id].effects.add ( l.callID );                          
                  if ( l.callID && l.callID.toString() === 'Symbol(computed)' )   l.storage[id].deps.add ( l.callID );
                  return l.storage[id].value
              } // get func.

  function modify ( fn ) {
                  const oldValue = l.storage[id].value;
                  return set ( fn ( oldValue ) )
              } // modify func.

      return {
                get
              , set
              , modify
              // TODO: Destroy method for all elements : state, computed, effect
          }
  } // state func.
  return state
  } // stateLib func.

  function computedLib ( l ) {
  /**
  * Creates a computed reactive item that derives its value from a given function.
  * 
  * @param {Function} fn - A function that returns a value of the computed item. 
  * @returns {Object} An object with a `get` method:
  *  - `get`: Retrieves the current value of the computed item. If the computed item is marked as dirty,
  *    it recalculates the value using the provided function.
  */
  return function computed ( fn, ...args ) {
             const id = Symbol ( 'computed' );
             l.callID = id;
             l.storage[id] = { id, value:fn(...args), fn, effects: new Set(), dirty: false, defaultArgs: args };
             l.callID = null;
             
             return { 
                     get: ( ...args ) => {
                                 if ( l.callID && l.callID.toString() === 'Symbol(effect)'   )   l.storage[id].effects.add ( l.callID );
                                 if ( !l.callID ) {
                                             for ( const val of l.storage[id].effects ) {
                                                         let { fn, defaultArgs } = l.storage[val];
                                                         fn ( ...defaultArgs );
                                                 }
                                     }
                                 let rec = l.storage[id];
                                 if ( args.length === 0 )   args = rec.defaultArgs;
                                 if ( rec.dirty ) rec.value = rec.fn (...args);
                                 return rec.value 
                             }
                 }
  }} // computed func.

  /**
   *    Signals - A simple reactivity system.
   *   - Started on January 9th, 2025
   *  
   */




  function main () {
      /**
       * A local storage for reactive items.
       * 
       * @type {Object} 
       * @property {Object} storage - A map of reactive items.
       * @property {null|Symbol} callID - A unique identifier for the current call.
       */
      const local = {
                  storage : {},
                  callID : null
              };

      /**
       * Creates the main API object.
       * 
       * @returns {Object} An object with `state`, `computed` and `effect` methods.
       * 
       * @property {function} state - Creates a reactive item with an initial value and optional validation.
       * @property {function} computed - Creates a computed reactive item with a function that returns its value.
       * @property {function} effect - Creates an effect reactive item with a function that is called immediately after any of its dependencies change.
       */
      const API =  {
                state    : stateLib ( local )      // signal state used in computed and as trigger of effects
              , computed : computedLib ( local )   // defferred computation
              , effect   : effectLib ( local )     // immediate execution
          };
      return API
  } // main func.

  function readKey ( k ) {
          let key, ext, location;   // key parameters
          let kList = k.split ( '/' );
          location = k;
          if ( kList.length > 1 ) {
                      key = k[0];
                      ext = kList.slice ( 1 ).join ( '/' );
              }
          else {
                      key = k;
                      ext = false;
              }
          return { key, ext, location }
  } // readKey func.

  function getData ( dependencies ) {
      const {
                db
              , apiDB
              , dummyRequest
              , updateRequest
              , noCacheRequest
              , timeouts
              , intervals
              , ttlRequest
              , askForPromise
              , walk
              , eBus
              , readKey
              , signalStores
              , validationStore
              , setupListOfRequestedParams
          } = dependencies;


  return function getData ( ks,  ...args ) {    
      // ks could be [keyList, store]
      // or [ [keyList, store], [keyList, store], [ key, store]... ]
      
      const list = setupListOfRequestedParams ( ks );
      let result = list.map ( ([k, store]) => {
                  const { key, location } = readKey ( k )
                          , task = askForPromise ()
                          , ID = `${store}/${key}`
                          , PID = `${store}/${location}`
                          , withCache = !noCacheRequest.has ( ID )
                          , dummy = dummyRequest[ID]
                          , interval = updateRequest[ID] || false
                          , ttl = ttlRequest [ID]
                          , isSignalValue = signalStores.includes ( store )
                          ; validationStore [ID]
                          ;
                  
                      let 
                            existingStore = db.hasOwnProperty(store) ? true : false
                          , cache =  false
                          ;
                          
                      if ( existingStore && withCache )   cache = db[store].hasOwnProperty ( location );

                      if ( dummy instanceof Function )  return dummy ()
                      else if ( dummy )                 return dummy

                      if ( !existingStore )   db[store] = {};
                      if ( !cache ) {
                                  if ( apiDB[store] && apiDB[store][key] ) {   // When api method exists
                                                  Promise.resolve (apiDB[store][key](...args))   // store -> api name, data -> api method, args -> method arguments
                                                          .then ( r => {
                                                                      if ( withCache ) {
                                                                              db[store][location] = r;
                                                                              if ( ttl ) {  
                                                                                      const timeoutID = timeouts[ PID ];
                                                                                      if ( timeoutID )   clearTimeout ( timeoutID ); 
                                                                                      timeouts[ PID ] =  setTimeout ( () => delete db[store][location], ttl );
                                                                                  }
                                                                          }
                                                                      if ( interval ) {
                                                                              const activeInterval = intervals [ PID ];
                                                                              if ( activeInterval )   clearTimeout ( activeInterval );
                                                                              intervals[ PID ] = setTimeout ( () => eBus.emit ( 'update', arguments ) , interval );  
                                                                          }
                                                                      eBus.emit ( store, location, undefined, walk({data:r}));
                                                                      task.done ( walk({data:r})  );
                                                              });
                                                  return task.promise
                                      }
                                  return  null 
                          }
                      else {
                                  if ( isSignalValue )   return walk({data:db[store][location].get(...args)})
                                  else                   return walk ({ data : db[store][location] }) 
                          }
          }); // list.forEach
          
      if ( result.length === 1 )   return result[0]
      return result
  }} // getData func.

  function setData ( dependencies ) {
      const { 
                db
              , walk
              , eBus
              , readKey
              , ttlRequest
              , timeouts
              , signalNest
              , signalStores 
              , validationStore
          } = dependencies;

      return function setData ( [k, store='default'], data, vFn=false ) {
          const 
                { key, location } = readKey (k)
              , isFunction = vFn instanceof Function
              , ID = `${store}/${key}`
              , PID = `${store}/${location}`
              , existingValidation = validationStore[ ID ] ? true : false 
              ;

          let isValid = true;

          if ( !db[store]    )   db[store] = {};
          // Validation per item/store sets once during pool lifetime 
          if ( existingValidation                )   isValid = validationStore[ ID ] ( data );
          if ( !existingValidation && isFunction )   validationStore[ ID ] = vFn;
          
          if ( !isValid )   return false
          else {
                      eBus.emit ( store, location, walk({data:db[store][location]}), walk({data})   );
                      if      ( signalStores.includes ( store ) && !db[store].hasOwnProperty ( location ))    db[store][location] = signalNest.state ( walk({data}) );
                      else if ( signalStores.includes ( store ) &&  db[store].hasOwnProperty ( location ))    db[store][location].set ( walk({data}) ); 
                      else                                                                                    db[store][location] = walk ({data});
                      
                      const ttl = ttlRequest[ ID ];
                      if ( ttl ) {  
                                  const timeoutID = timeouts[ PID ];
                                  if ( timeoutID )   clearTimeout ( timeoutID );
                                  timeouts[ ID ] = setTimeout ( () => delete db[store][location], ttl );
                          }
                      return true
              } // else !isValid
  }} // setData func.

  function setComputed ( dependencies ) {
      const { signalStores, db, signalNest } = dependencies;
      signalStores.reduce ( (res,name) => {
                      res[name] = db[name];
                      return res
                  }, {});

      return ([k,store='default'], fn, ...args ) => {
                  if ( !signalStores.includes ( store ) ) { 
                              console.error ( 'Computed can be saved only in signal stores' );
                              return false
                      }
                  const stores = {};
                  signalStores.map ( s => stores[s] = db[s] );
                  if ( !db[store] )   db[store] = {};
                  db[store][k] = signalNest.computed ( fn, stores, ...args );                 
                  return true
              }
  } // setComputed func.

  function setEffect ( dependencies ) {
          const { signalNest, signalStores, db } = dependencies;
          return ( ks, fn, ...args ) => {
                      if ( typeof ks[0] === 'string' )   ks = [ ks ];   // Unify the input data structure 
                      // list contains signals that will trigger function on change
                      const list = ks.reduce ( ( res, item ) => {
                                                      const st = item[1];
                                                      if ( !signalStores.includes ( st ) ) { 
                                                                  console.error ( `Store "${st}" is not a signal store. Use only stores: ${signalStores.join ( ', ' )}` );
                                                          }
                                                      else {
                                                                  let ls = item[0].split(',').map ( k => k.trim () );
                                                                  ls.forEach ( k => res.push ( db[st][k] ) );
                                                          }
                                                      return res
                                          }, [] );
                      signalNest.effect ( list, fn, ...args );
  }} // setEffect func.

  function setSignalStore ( dependencies ) {
      // *** Adds store to signalStores

      return ( stores ) => {
          const { signalStores, db } = dependencies;
          // Store or stores names comes as a string, string with list of names separated by comma or array of strings.
          // Before adding we should separate incoming data to array of names
          if ( !stores ) {
                 throw new Error ( 'setSignalStore: Provide store names to be defined as signal stores.' )
             }
          if ( typeof stores === 'string' ) {
              stores = stores.split ( ',' ).map ( s => s.trim () );
             }
          stores.forEach ( s => {
                          if ( db[s] )  console.error ( `Store "${s}" already exists. ` );  
                          if ( !signalStores.includes ( s ) )   signalStores.push ( s );
              });
          return signalStores
  }} // setSignalStore func.

  function setDummy ( dummyRequests ) {
  return function setDummy ([key,store='default'], fn ) {   // Argument 'fn' should return a promise
          dummyRequests[`${store}/${key}`] = fn;
  }}

  function listStoreNames ( db ) {
  return function listStores () {
          return Object.keys ( db )
  }}

  function setUpdate ( dependencies ) {
      const { readKey, updateRequest } = dependencies;
  return function setUpdate ( [ k, store], interval ) {
      const { key } = readKey ( k );
      updateRequest[`${store}/${key}`] = interval;
  }} // setUpdate func.

  function removeUpdates ( updateRequest, intervals, store ) {
          Object.keys ( updateRequest ).forEach ( k => {
                      if ( k.includes(store) )   delete updateRequest[k];
              });
          Object.keys ( intervals ).forEach  ( k => {
                      if ( k.includes(store) )   clearTimeout ( intervals[k] );
              });
  } // removeUpdates func.

  function updateData ( dependencies ) {
      const {
          db
        , apiDB
        , dummyRequest
        , updateRequest
        , noCacheRequest
        , timeouts
        , intervals
        , ttlRequest
        , askForPromise
        , walk
        , eBus
        , readKey
    } = dependencies;

  return function updateData ( [k, store], ...args) {
          const { key, location } = readKey ( k )
              , task = askForPromise ()
              , ID = `${store}/${key}`
              , PID = `${store}/${location}`
              ; !noCacheRequest.has ( ID )
              ; const dummy = dummyRequest[ID]
              , interval = updateRequest[ID] || false
              , ttl = ttlRequest [ID]
              ;

          if ( interval ) {
                      const activeInterval = intervals [ PID ];
                      if ( activeInterval )   clearTimeout ( activeInterval );
                      intervals[ PID ] = setTimeout ( () => eBus.emit ( 'update', arguments ) , interval );  
              }
              
          if ( dummy ) {
                      dummy ().then ( () =>  task.done ()   );
                      return task.promise
              }

          if ( apiDB[store] && apiDB[store][key] ) {   // When api method exists
                                  Promise.resolve ( apiDB[store][key](args) )   // store -> api name, data -> api method, args -> method arguments
                                          .then ( r => {
                                                      db[store][location] = r;
                                                      if ( ttl ) {  
                                                              const timeoutID = timeouts[ PID ];
                                                              if ( timeoutID )   clearTimeout ( timeoutID ); 
                                                              timeouts[ PID ] =  setTimeout ( () => delete db[store][location], ttl );
                                                          }
                                                      
                                                      eBus.emit ( store, location, undefined, walk({data:r}));
                                                      task.done ();
                                              });
              }
          else   task.done ();
          return task.promise
  }} // updateData func.

  /**
   * @typedef {Object} DataPoolAPI
   * @property {function(): string[]} list - Returns list of all existing stores.
   * @property {function(string|Array): boolean} has - Checks if store or store-key exists.
   * @property {function(Array): any} get - Returns requested data or fetches from API.
   * @property {function(Array, any, function?): boolean} set - Creates or updates a data record.
   * @property {function(Array, function): void} setComputed - Creates a computed property in signal stores.
   * @property {function(function): void} setEffect - Creates a signal effect.
   * @property {function(string|string[]): void} setSignalStore - Defines stores as signal stores.
   * @property {function(string, Object): void} importStore - Adds data as a store.
   * @property {function(string): Object|null} exportStore - Exports store as an object.
   * @property {function(string, function): void} on - Listens for store changes.
   * @property {function(Object): void} addApi - Associates APIs with data-pool.
   * @property {function(string): void} removeApi - Removes API associations.
   * @property {function(Array, number): void} setUpdate - Sets recurring updates for API records.
   * @property {function(Array): void} removeUpdate - Removes recurring updates.
   * @property {function(Array, number): void} setTTL - Sets TTL for a record.
   * @property {function(Array): void} removeTTL - Removes TTL.
   * @property {function(Array, function): void} setDummy - Sets dummy data source.
   * @property {function(Array): void} removeDummy - Removes dummy data source.
   * @property {function(Array): void} setNoCache - Sets no-cache for a record.
   * @property {function(Array): void} removeNoCache - Removes no-cache setting.
   * @property {function(string?|Array?): void} flush - Flushes data from stores.
   */



  function setupListOfRequestedParams ( ks) {
              if ( typeof ks[0] === 'string' )   ks = [ ks ];   // Unify the input data structure 
              const list = ks.reduce ( ( res, item ) => {
                                              const st = item[1] || 'default';
                                              let ls = item[0].split(',').map ( k => k.trim () );
                                              ls.forEach ( k => res.push ( [k, st] ) );
                                              return res
                              },[] );
              return list
      } // setupListOfRequestedParams func.



  function createDataStore () {
      // *** Creates internal data-structures
      const 
            eBus = notice ()
          , signalNest = main () 
          ;
      return { 
                db             : {}   // Stores are here
              , apiDB          : {}   // APIs
              , ttlRequest     : {}   // TTL settings place
              , updateRequest  : {}   // Update settings place
              , timeouts       : {}   // Active TTL timeouts object
              , intervals      : {}   // Active update intervals object
              , dummyRequest   : {}   // store/key that will provide always dummy data
              , signalStores   : []   // Stores that will be used for signals
              , validationStore : {}   // Validation functions
              , noCacheRequest : new Set()  // store/key that should not have cache
              , walk
              , askForPromise
              , eBus
              , signalNest
              , setupListOfRequestedParams
              , readKey
          }
  } // CreateDataStore func.



  /**
   * Creates a new data-pool instance.
   * @returns {DataPoolAPI} The data-pool API object.
   */
  function dataPool () {
      const dependencies = createDataStore ();

  /**
   *    dataStore -> API -> Auth
   *    - dataStore is not related to Auth;
   *    - data can be related to API method
   *    
   */



      

  const API = {   // Data-pool API
                list         : listStoreNames ( dependencies.db ) // list Stores
              , has          : ( ks ) => {   // Checks if store or store-key exist 
                                      if ( typeof ks === 'string' ) {
                                                  let list = ks.split(',').map ( k => k.trim () );
                                                  return list.every ( k => dependencies.db[k] ? true : false )
                                          }
                                      const list = setupListOfRequestedParams ( ks );
                                      
                                      return list.every ( ([k, store]) => {
                                                  const { location } = readKey ( k );
                                                  if ( !dependencies.db[store]?.hasOwnProperty(location) )   return false
                                                  return true
                                              })
                                  } // has func. 
              , get            : getData ( dependencies )
              , set            : setData ( dependencies )
              , setComputed    : setComputed ( dependencies )
              , setEffect      : setEffect ( dependencies )
              , setSignalStore : setSignalStore ( dependencies )   // Set the store as a signal store
              , importStore  : (store,data) => {  // Add data as a store
                              if ( !dependencies.db[store] )   dependencies.db[store] = {};
                              if ( dependencies.signalStores.includes ( store ) ) {
                                          if ( !dependencies.db[store] )   dependencies.db[store] = {};
                                          Object.entries ( data ).forEach ( ([k,v]) =>  dependencies.db[store][k] = dependencies.signalNest.state ( v )   );
                                  }
                              else {
                                          dependencies.db[store] = walk({data});   
                                  }
                  } // importStore func. 
              , exportStore  : ( store ) => {  // Export store as a data
                          if ( !dependencies.db[store] )   return null
                          if ( dependencies.signalStores.includes ( store ) ) {
                                      return   Object.entries ( dependencies.db[store] ).reduce ( (res,[k,v]) => {
                                                      res[k] = v.get ();
                                                      return res
                                                  }, {})
                              }
                          else {
                                      return walk ({ data : dependencies.db[store] })
                             }                        
                  } // exportStore func.
              , on           : dependencies.eBus.on
              , addApi       : ( income ) => {
                                      let ups = Object.assign ( {}, income, dependencies.apiDB );
                                      Object.keys(ups).forEach ( k => dependencies.apiDB[k] = ups[k]   );
                                  }
              , removeApi    : ( names ) => {
                                      const list = names.split ( ',' ).map ( k => k.trim () );
                                      list.forEach ( name => {
                                                  delete dependencies.apiDB[name];
                                                  removeUpdates ( dependencies.updateRequest, dependencies.intervals, name );
                                          });
                                  }
              , setUpdate    :  setUpdate ( dependencies )
              , removeUpdate : ([ loc, store ]) => {
                                      const 
                                            { key, location } = readKey ( loc )
                                          , activeUpdate = dependencies.intervals[`${store}/${location}`]
                                          ;
                                      if ( activeUpdate )   clearTimeout ( activeUpdate );
                                      delete dependencies.updateRequest[`${store}/${key}`];
                                  }
              , update       : updateData ( dependencies )
              , setTTL       : ( [key, store], ttl ) =>        dependencies.ttlRequest[`${store}/${key}`] = ttl
              , removeTTL    : ( [key, store] )      => delete dependencies.ttlRequest[`${store}/${key}`]
              , setDummy     : setDummy ( dependencies.dummyRequest )
              , removeDummy  : ([key,store='default'] ) => {
                                      delete dependencies.dummyRequest[`${store}/${key}`];
                                  }
              , setNoCache    : ( [key, store='default'] ) => dependencies.noCacheRequest.add ( `${store}/${key}` )
              , removeNoCache : ( [key, store='default'] ) => dependencies.noCacheRequest.delete ( `${store}/${key}` )
              , flush          : function flush () {
                                          if ( arguments.length === 0 ) {
                                                      Object.keys ( dependencies.db ).forEach ( k => dependencies.db[k] = {} );
                                                      return
                                              }
                                          if ( typeof arguments[0] === 'string' ) {
                                                      const storeList = arguments[0].split ( ',').map ( s => s.trim () );
                                                      storeList.forEach ( s => {
                                                                  if ( dependencies.db[s] )   dependencies.db[s] = {};
                                                          });
                                                      return
                                              }
                                          const [ k=null, store='*' ] = arguments[0];
                                          const { key,location } = (k!=null) ? readKey ( k ) : { key: k, location: k };
                                          if ( store === '*' ) {
                                                      Object.keys ( dependencies.db ).forEach ( k => {
                                                                  dependencies.db[k] = {};
                                                                  // TODO: eBus event? 
                                                          });
                                                      return
                                              }
                                              
                                          if ( !key ) {
                                                      if ( dependencies.db[store] )   dependencies.db[store] = {};
                                                      return
                                              }

                                          if ( dependencies.db[store] && dependencies.db[store][location]) {
                                                      delete dependencies.db[store][location];
                                              }
                                      } // flush func.
              // TODO: persist storage - add new value without deleting the old ones.
              //  values are arrays ... last value is the actual value.
              // write   // TODO: Define method for store persistence 
              // read    // TODO: Define method for loading store from disk, db or else...
          };
    dependencies.eBus.on ( 'update', arg => API.update ( ...arg )   );
    return API
  } // dataStore func.

  return dataPool;

}));

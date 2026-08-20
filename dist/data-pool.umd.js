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
   * @typedef {Object} EachContext
   * @description Per-item context passed to the `each` callback. Carries the
   *   underlying value plus per-item controls (`done` / `cancel` / `timeout`).
   * @property {any} value - The list item passed to `askForPromise(list)`. In
   *   single-promise mode this is `null`.
   * @property {(value?: any) => void} done - Resolves this single item. In list
   *   mode this settles one sub-promise; in single mode it settles the main
   *   promise. If a per-item or list-level `.timeout()` is active, also
   *   clears the pending timer for this item.
   * @property {(reason?: any) => void} cancel - Rejects this single item. If
   *   a per-item or list-level `.timeout()` is active, also clears the
   *   pending timer for this item.
   * @property {(ttl: number, expMsg: any) => AskObject} timeout - Per-item
   *   timeout helper. In single mode the returned `AskObject` is the same one.
   */



  /**
   * @callback EachCallback
   * @description Callback invoked once per list item by `askObject.each()`.
   * @param {EachContext} ctx - Per-item context (value + done / cancel / timeout).
   * @param {number | undefined} index - Position of the item in the input list.
   *   `undefined` when `each` is called on a single-mode `AskObject`
   *   (no list).
   * @param {...any} args - Extra arguments forwarded from `task.each(cbFn, ...args)`.
   */



  /**
   * @typedef {Object} AskObject
   * @description Object with a promise and related helper functions. Returned
   *   by `askForPromise()`, `askForPromise(list)`, `askForPromise.sequence(...)`
   *   and `askForPromise.all(...)`.
   * @property {Promise<any>} promise - The underlying promise. In list mode this
   *   is `Promise.all(promises)` and resolves to an array of values in input
   *   order once every sub-promise resolves.
   * @property {AskObject[]|null} promises - `AskObject[]` in list mode, `null`
   *   in single mode. Use `task.promises[i].done(value)` to resolve a single item.
   * @property {(value?: any) => void} done - Resolves the promise (or all
   *   sub-promises with the same value, in list mode). If a `.timeout()` is
   *   active on this `AskObject`, also clears the pending timer so the
   *   underlying resources can be released immediately.
   * @property {(reason?: any) => void} cancel - Rejects the promise (or all
   *   sub-promises with the same reason, in list mode). If a `.timeout()` is
   *   active on this `AskObject`, also clears the pending timer.
   * @property {(cbFn: EachCallback, ...args: any[]) => void} each - Iterates
   *   the items and calls `cbFn({ value, done, cancel, timeout }, index, ...args)`
   *   for each. In single mode the callback is invoked once with `value: null`
   *   and `index: undefined` (the second positional argument is still
   *   present, just `undefined`).
   * @property {(fx: (result: any) => void, rejectFx?: ((error: any) => void) | null) => void} onComplete
   *   Sugar for `promise.then`. Pass a second function as the reject handler.
   * @property {(ttl: number, expMsg: any) => AskObject} timeout - Arms a
   *   `ttl`-millisecond timer. On expiry, the task settles with `expMsg`:
   *   `onComplete` is rewired to return the fallback, AND the underlying
   *   `task.promise` is also settled with `expMsg` (so `await task.promise`
   *   and `task.onComplete(...)` agree). In list mode each still-pending
   *   sub-promise is replaced with `expMsg`, while sub-promises that already
   *   settled keep their real value. Returns the same `AskObject` so the
   *   call can be chained.
   */



  /**
   * Creates an `AskObject` with a single promise, or one promise per item in
   * `list` (in which case all sub-promises are bundled into a single
   * `AskObject` whose `promise` is `Promise.all(...)`).
   * @function askForPromise
   * @param {Array<any>} [list] - Optional. List of items; each gets its own
   *   sub-promise. Omit for a single promise.
   * @returns {AskObject} Object with the promise and related helper functions.
   */
  function askForPromise ( list ) {
          if ( list ) return _manyPromises ( list )
          else        return _singlePromise ();
   } // askForPromise func.



  /**
   * Executes a list of step functions one after the other. Each step is
   * called with the original `...args` plus the result of the previous step
   * appended at the end, so a step's resolved value threads through to the
   * next. The returned `task.promise` resolves to an array of every step's
   * resolved value once the chain completes; if any step rejects (or throws
   * synchronously) the task rejects with that error and the chain stops.
   * @function sequence
   * @memberof askForPromise
   * @param {Array<(...args: any[]) => any>} list - Steps; each is expected to
   *   return a promise (a non-thenable return is accepted via `Promise.resolve`
   *   and treated as a resolved value).
   * @param {...any} args - Arguments passed to the first step. Each step
   *   additionally receives the previous step's resolved value as its last
   *   argument.
   * @returns {AskObject} `AskObject` whose `promise` resolves to the array of
   *   step results (in order), or rejects on the first step failure.
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
        // Defer evaluation so a synchronous throw inside the step becomes a
        // promise rejection (caught below) instead of escaping `sequence()`.
        Promise.resolve ().then ( () => n.value (...args) ).then ( r => {
                result.push ( r );
                wait( g.next(), ...args, r );
            }, err => {
                task.cancel ( err );
            });
        } // wait func.

    try {
        wait ( g.next(), ...args ); // Starting with iteration of list
    } catch ( err ) {
        task.cancel ( err );
    }
    return task
  }; // promiseInSequence func.



  /**
   * Executes a list of step functions in parallel. Each entry in `list` may
   * be either a function (called with `...args`) or an already-running
   * promise / thenable. The returned `task.promise` resolves to an array of
   * results in declaration order once every entry resolves, matching
   * `Promise.all` semantics; if any entry rejects (or a step function
   * throws synchronously) the task rejects with that error.
   * @function all
   * @memberof askForPromise
   * @param {Array<((...args: any[]) => any) | Promise<any>>} list - Steps to
   *   run in parallel; each is either a function or a thenable.
   * @param {...any} args - Arguments passed to each step function. Ignored
   *   for thenable entries.
   * @returns {AskObject} `AskObject` whose `promise` resolves to the array of
   *   step results (in order), or rejects on the first step failure.
   */
  askForPromise.all = function promiseAll ( list, ...args ) {
    const
          task = askForPromise ()
        , result = []
        ;
    let r;
    try {
        r = list.map ( (n,i) => {
                              // Defer evaluation so a synchronous throw inside a step function
                              // becomes a promise rejection instead of escaping `all()`.
                              return Promise.resolve ().then ( () =>
                                  (typeof n === 'function') ? n(...args) : n
                              ).then (
                                  r => result[i] = r,
                                  err => { throw err }   // Re-throw so Promise.all surfaces the rejection
                              )
                          });
    } catch ( err ) {
        task.cancel ( err );
        return task
    }
    Promise.all ( r ).then (
        () => task.done(result),
        err => task.cancel(err)
    );
    return task
  }; // promiseAll func.





  /**
   * Creates a single-promise `AskObject`. Internal — use `askForPromise()`.
   * @private
   * @returns {AskObject} `AskObject` with a single underlying promise and the
   *   standard helper functions. The `each` helper, when called, invokes its
   *   callback once with `{ value: null, done, cancel, timeout }` and
   *   `index: undefined` (the second positional argument is present but
   *   `undefined`, matching the list-mode `each` signature).
   */
  function _singlePromise () {
    let  done, cancel;
    const x = new Promise ( (resolve, reject ) => {
                                                    done   = resolve;
                                                    cancel = reject;
                                   });
      // Internal slot for the active timer (if any). Stored on the askObject
      // (not in a closure variable) so that the timer-clearing wrappers in
      // done/cancel, the timer-setting setter in _timeout, and the
      // askObject's own self-references all live on the same object — which
      // means dropping the askObject reference releases the whole cycle.
      const askObject = {
                 promise       : x
               , promises      : null
               , _activeTimer  : null
               , each          : () => {}
               , onComplete    : _after(x)
               , timeout       : () => {}
             };

      // Use a WeakRef so the wrapped done/cancel (and the setTimeout callback
      // in _timeout) can settle the task and access _activeTimer without
      // strongly capturing the askObject. Strong capture (e.g. via `const
      // self = this` in a regular function, or via an arrow function) would
      // create a cycle `askObject → askObject.done → askObject` that V8's
      // tracing collector does NOT reclaim, leaving the askObject live until
      // its timer fires. The WeakRef keeps the cycle breakable.
      const askObjectRef = new WeakRef(askObject);

      // Wrap done/cancel so they clear the active timer (if any) before
      // settling the promise. Settling the promise is a no-op if it's already
      // settled, so the wrapped functions are safe to call from any path
      // (askObject.done/cancel, the each callback, or the timer's own callback).
      // These are regular functions — they use the WeakRef to reach the
      // askObject instead of capturing it via closure — so the askObject can
      // be garbage-collected even if these methods are still referenced.
      askObject.done   = function ( value )  { const o = askObjectRef.deref(); if (o !== undefined && o._activeTimer !== null) { clearTimeout(o._activeTimer); o._activeTimer = null; } done(value);   };
      askObject.cancel = function ( reason ) { const o = askObjectRef.deref(); if (o !== undefined && o._activeTimer !== null) { clearTimeout(o._activeTimer); o._activeTimer = null; } cancel(reason); };

      askObject.timeout = _timeout ( false );
      askObject.each = function (cbFn, ...args) { cbFn({value: null, done: askObject.done, cancel: askObject.cancel, timeout: this.timeout}, ...args); };

      return askObject
     } // _singlePromise func.



  /**
   * Creates a list-mode `AskObject` where each item in `list` gets its own
   * sub-promise, all controlled by a single returned `AskObject`. Internal —
   * use `askForPromise(list)`.
   * @private
   * @param {Array<any>} list - List of items; each becomes a separate
   *   sub-promise.
   * @returns {AskObject} `AskObject` whose `promise` is `Promise.all` over
   *   every sub-promise, `promises` is the array of sub-`AskObject`s, and
   *   `done` / `cancel` settle every sub-promise with the same value.
   */
   function _manyPromises ( list ) {
                                      let listOfPromiseObjects = list.map ( el => _singlePromise() );
                                      let listOfPromises   = listOfPromiseObjects.map ( o => o.promise );

                                      listOfPromiseObjects [ 'promises' ] = listOfPromiseObjects;
                                      let onComplete = _after ( Promise.all (listOfPromises) );

                                      // The original input list is kept on the askObject so that
                                      // `each` can read the per-item value via `this._list[i]`
                                      // instead of capturing the list via closure. (Capturing
                                      // the list in a closure that's stored on the askObject
                                      // would create an unreachable cycle that V8 doesn't
                                      // collect.)
                                      /** @type {AskObject} */
                                      const askObject = {
                                                    promise       : Promise.all ( listOfPromises )
                                                  , promises      : listOfPromiseObjects
                                                  , _list         : list
                                                  , _activeTimer  : null
                                                  , each          : () => {}
                                                  , onComplete    : onComplete
                                                  , timeout       : () => {}
                                              };
                                      // Wrap list-level done/cancel so they clear the list-level
                                      // timer (if any) before settling every sub-promise. Per-item
                                      // timers are cleared by the per-item wrappers in _singlePromise.
                                      // These are regular functions using `this` (not arrow functions
                                      // capturing askObject), so the askObject can be garbage-
                                      // collected when the user drops the reference.
                                      askObject.done   = function ( response ) {
                                          if (this._activeTimer !== null) { clearTimeout(this._activeTimer); this._activeTimer = null; }
                                          this.promises.forEach ( o => o.done( response ) );
                                      };
                                      askObject.cancel = function ( response ) {
                                          if (this._activeTimer !== null) { clearTimeout(this._activeTimer); this._activeTimer = null; }
                                          this.promises.forEach ( o => o.cancel( response ) );
                                      };
                                      // `each` uses `this` (no closure capture of the list or
                                      // the array) so dropping the askObject releases everything.
                                      askObject.each = function ( cbFn, ...args ) {
                                          this.promises.forEach ( ( prom, i ) => cbFn ({
                                                                                          value: this._list[i],
                                                                                          done:  prom.done,
                                                                                          cancel: prom.cancel,
                                                                                          timeout: prom.timeout
                                                                                      },
                                                                                      i,
                                                                                      ...args
                                                                                    ));
                                      };

                                      askObject.timeout = _timeout ( true );
                                      return askObject
     } // _manyPromises func.



  /**
   * Builds an `onComplete` sugar function for the given promise. Internal.
   * @private
   * @param {Promise<any>} x - The promise to attach handlers to.
   * @returns {(fx: (result: any) => void, rejectFx?: ((error: any) => void) | null) => void}
   *   Function `(fx, rejectFx?) => void`. When `rejectFx` is omitted / `null`,
   *   only the resolve branch is attached (`x.then(fx)`); otherwise both
   *   branches are attached (`x.then(fx, rejectFx)`).
   */
  function _after ( x ) {
  return function onComplete ( fx, rejectFx=null ) {
                  if ( rejectFx === null ) x.then ( res => fx(res) );
                  else                     x.then ( res => fx(res) , res => rejectFx(res)  );
  }} // _after func.



  /**
   * Builds a `timeout(ttl, expMsg)` factory for an `AskObject`. The returned
   * function must be called as a method on the `AskObject`
   * (`askObject.timeout(ttl, expMsg)`); it uses `this` to wire the timer
   * into the receiving askObject. On expiry, the task settles with `expMsg`:
   * `onComplete` is rewired to return the fallback, and the underlying
   * `askObject.promise` is also settled with `expMsg` (so `await promise`
   * and `onComplete(...)` agree).
   * @private
   * @param {boolean} isList - `true` to race the `Promise.all` of every
   *   sub-promise, `false` to race the single promise.
   * @returns {(ttl: number, expMsg: any) => AskObject} A function to be
   *   invoked as a method on the `AskObject`; returns the same `AskObject`
   *   so calls can be chained.
   */
  function _timeout ( isList ) {
    /**
     * Arms a TTL timer on the underlying promise(s) and rewires the
     * `AskObject`'s `onComplete` to the race result.
     *
     * Note: this function uses `this` (set by the caller to the askObject)
     * and never captures it in a closure. The setTimeout callback reaches
     * the askObject only via a WeakRef, so dropping the askObject reference
     * allows V8 to collect it even if the timer hasn't fired yet. (V8's
     * tracing GC does NOT reclaim cycles where a closure on the object
     * captures the object — that's why every method on the askObject uses
     * `this` or a WeakRef, never a direct closure capture.)
     *
     * @param {number} ttl - Timeout duration in milliseconds.
     * @param {any} expMsg - Value that resolves the race when the timer
     *   fires before the underlying promise(s).
     * @returns {AskObject} The same `AskObject` (for chaining).
     */
    return function timeout( ttl, expMsg ) {
              const askObjectRef = new WeakRef(this);

              // `main` is the underlying promise(s) the timer races against.
              // In single mode it's the same promise as `this.promise`;
              // in list mode it's a fresh `Promise.all` over every sub-promise.
              let main;
              if ( isList ) main = Promise.all( this.promises.map ( o => o.promise ) );
              else          main = this.promise;

              let timer;
              const timeout = new Promise ( (resolve, reject) => {
                                      timer = setTimeout ( () => {
                                                      // Settle the underlying task with the fallback so
                                                      // `task.promise` returns a regular result and any
                                                      // in-flight resources (hung fetches, pending timers)
                                                      // are released instead of leaking. No-op if the
                                                      // askObject has already been garbage-collected.
                                                      const obj = askObjectRef.deref();
                                                      if (obj !== undefined) obj.done(expMsg);
                                                      resolve(expMsg);
                                                  }, ttl);
                                  }); // timeout
              // Hand the timer handle to the askObject so the wrapped
              // done/cancel can release the askObject immediately on
              // settlement, instead of waiting for the timer to fire.
              this._activeTimer = timer;
              main.then ( () => clearTimeout(timer)   );
              this [ 'onComplete'] = _after ( Promise.race ([main, timeout])   );
              return this
          }
  } // _timeout func.

  function findType ( x ) {
      if ( x == null              )   return 'simple' // null and undefined
      if ( x.nodeType             )   return 'simple' // DOM node
      if ( x instanceof Array     )   return 'array'
      if ( typeof x === 'object'  ) {
          // Built-in object types whose data lives outside the own-enumerable-string-key
          // model that walk uses. Treated as 'simple' so the value is preserved by
          // reference (same contract as functions and DOM nodes).
          if ( x instanceof Date        )   return 'simple'
          if ( x instanceof RegExp      )   return 'simple'
          if ( x instanceof Map         )   return 'simple'
          if ( x instanceof Set         )   return 'simple'
          if ( x instanceof WeakMap     )   return 'simple'
          if ( x instanceof WeakSet     )   return 'simple'
          if ( x instanceof ArrayBuffer )   return 'simple'
          if ( x instanceof DataView    )   return 'simple'
          if ( ArrayBuffer.isView ( x ) )   return 'simple' // Typed arrays (Uint8Array, Float32Array, ...)
          return 'object'
      }
      return 'simple'   // number, bigint, string, boolean, symbol, function
   } // findType func.

  function validateForInsertion ( k, result ) {
      const inArray = result instanceof Array;
      if ( !inArray )   return false
      const isNumber = !isNaN ( k );
      if ( isNumber )   return true
      else              return false
  } // validateForInsertion func.

  // Plain assignment of a '__proto__' key triggers the inherited setter and
  // replaces the prototype of 'target' instead of creating an own property.
  function setKey ( target, k, value ) {
      if ( k === '__proto__' )   Object.defineProperty ( target, k, { value, enumerable:true, writable:true, configurable:true });
      else                       target[k] = value;
  } // setKey func.

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
                          , br = `${breadcrumbs}/${k}`
                          ;

                      if ( type !== 'simple' && objectCallback ) {
                                          item = objectCallback ({ value:item, key:k, breadcrumbs: br, IGNORE }, ...args );
                                          if ( item === IGNORE )   return
                                          type = findType ( item );
                          }

                      if ( type === 'simple' ) {
                                      if ( !keyCallback ) {
                                              const canInsert = validateForInsertion ( k, result );  // Find if it's array or object?
                                              if ( canInsert )    result.push ( item );     // It's an array
                                              else                setKey ( result, k, item ); // It's an object
                                              return
                                          }
                                      let keyRes = keyCallback ({ value:item, key:k, breadcrumbs: br, IGNORE }, ...args );
                                      if ( keyRes === IGNORE )   return
                                      // Re-type the returned value. A plain object/array returned from
                                      // keyCallback is walked into via the same extend mechanism used for
                                      // original nested values; built-in types (Date, Map, Set, etc.) are
                                      // still 'simple' and stored by reference.
                                      const newType = findType ( keyRes );
                                      if ( newType === 'simple' ) {
                                              const canInsert = validateForInsertion ( k, result );  // Find if it's array or object?
                                              if ( canInsert )    result.push ( keyRes );      // It's an array
                                              else                setKey ( result, k, keyRes ); // It's an object
                                              return
                                          }
                                      if ( newType === 'object' ) {
                                              const newObject = {};
                                              if ( resultIsArray && keyNumber )   result.push ( newObject );
                                              else                                setKey ( result, k, newObject );
                                              extend.push ( generateList ( keyRes, newObject, extend, cb, br, args ) );
                                              return
                                          }
                                      if ( newType === 'array' ) {
                                              const newArray = [];
                                              if ( resultIsArray && keyNumber )   result.push ( newArray );
                                              else                                setKey ( result, k, newArray );
                                              extend.push ( generateList ( keyRes, newArray, extend, cb, br, args ) );
                                              return
                                          }
                          }

                      if ( type === 'object' ) {
                              const newObject = {};
                              if ( resultIsArray && keyNumber )   result.push ( newObject );
                              else                                setKey ( result, k, newObject );
                              extend.push ( generateList ( item, newObject,  extend, cb, br, args ) );
                         }

                      if ( type === 'array' ) {
                              const newArray = [];
                              if ( resultIsArray && keyNumber )   result.push ( newArray );
                              else                                setKey ( result, k, newArray );
                              extend.push ( generateList( item, newArray, extend, cb, br, args ) );
                          }
              });
  } // copyObject func.



  function* generateList ( data, location, ex, callback, breadcrumbs, args ) {
      yield copyObject ( data , location, ex, callback, breadcrumbs, ...args );
  } // generateList func.

  /**
   *  Sentinel value passed to callbacks. Return it from a callback to drop
   *  the current key from the result. A fresh symbol is created on every
   *  callback call, so always return the value that was handed to you.
   *
   *  @typedef {symbol} IgnoreToken
   */

  /**
   *  Arguments object received by both `keyCallback` and `objectCallback`.
   *
   *  @typedef {object} CallbackArgs
   *  @property {*}          value        - The current value being processed.
   *  @property {string}     key          - Property key as a string.
   *  @property {string}     breadcrumbs  - Slash-delimited path to the current key, starting with `root` (e.g. `"root/props/age"`).
   *  @property {IgnoreToken} IGNORE      - Return this from the callback to drop the current key from the result.
   */

  /**
   *  Called once per primitive property (string, number, bigint, boolean,
   *  symbol, null, undefined, function, Date, RegExp, Map, Set, WeakMap,
   *  WeakSet, ArrayBuffer, DataView, typed arrays, DOM nodes).
   *
   *  Return the new value to store, or `IGNORE` to drop the key:
   *    - return a primitive (or a built-in like `Date`/`Map`/`Set`) → stored as-is by reference;
   *    - return a plain object or array → walk continues into it with the other callback applied to its children;
   *    - return `IGNORE` → that key is dropped from the result.
   *
   *  @callback KeyCallback
   *  @param {CallbackArgs} args
   *  @param {...*}         rest - Any extra arguments passed to `walk()` are forwarded to the callback.
   *  @returns {*}
   */

  /**
   *  Called once per object or array property, including the root.
   *  The returned value becomes the new value at that key:
   *    - return an object or array → walk continues into it with the other callbacks;
   *    - return a primitive        → it is stored as the value, no further walking;
   *    - return `IGNORE`           → the key is dropped from the result.
   *
   *  @callback ObjectCallback
   *  @param {CallbackArgs} args
   *  @param {...*}         rest
   *  @returns {*}
   */

  /**
   *  @typedef {object} Options
   *  @property {*}             data           - Required. Any JS data structure that will be copied.
   *  @property {KeyCallback}    [keyCallback]    - Optional. Executed on each primitive property.
   *  @property {ObjectCallback} [objectCallback] - Optional. Executed on each object/array property, including the root.
   */


  /**
   *  Walk
   *
   *  Creates an immutable copy of a deep JavaScript data structure.
   *  Two optional callbacks run during the walk and can mask, filter, or
   *  substitute values as the result is built.
   *
   *  @function walk
   *  @param {Options} options   - Required. Object with required `data` property and two optional callback functions: `keyCallback` and `objectCallback`.
   *  @param {...*}    args      - Optional. Additional arguments forwarded to both callbacks.
   *  @returns {*}               - Created immutable copy of `options.data`.
   *  @example
   *  let result = walk ({
   *      data: someData,
   *      keyCallback:    keyCallbackFn,
   *      objectCallback: objectCallbackFn
   *  })
   *
   *  // Note: objectCallback is executed before keyCallback.
   *  // If you modify an object with objectCallback, keyCallback will be
   *  // executed on the result of objectCallback.
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

      if ( type !== 'simple' && objectCallback ) {   // Root object callback. Executed before the result is allocated, so it can replace the root with anything.
              const IGNORE = Symbol ( 'ignore___' );
              const replacement = objectCallback ({ value:origin, key:'root', breadcrumbs, IGNORE }, ...args );
              if ( replacement === IGNORE )   return ( type === 'array' ) ? [] : {}
              origin = replacement;
              type = findType ( origin );
          }

      switch ( type ) {
              case 'array'  :
                                  result = [];
                                  copyObject ( origin, result, extend, cb, breadcrumbs, ...args );
                                  break
              case 'object' :
                                  result = {};
                                  copyObject ( origin, result, extend, cb, breadcrumbs, ...args );
                                  break
              case 'simple' :
                                  return origin
          } // switch type

      for ( const plus of extend ) {   plus.next(); }
      return result
  } // walk func.

  function notice () {
      
                      let
                            scroll     = Object.assign ( Object.create(null), {'*':[]} )  // General events with their subscribers. Null prototype - event names like '__proto__' are safe
                          , scrollOnce = Object.create ( null )  // Single events with their subscribers
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
                              if ( typeof fn !== 'function' )   return   // Silently no-op on bad input — see Changelog
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
                              if ( typeof fn !== 'function' )   return   // Silently no-op on bad input — see Changelog
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
                                      if ( e !== '*' && scroll[e] && scroll[e].length === 0 )   delete scroll[e];   // scroll['*'] must always exist - 'emit' relies on it
                                      if ( scrollOnce[e] && scrollOnce[e].length === 0 )   delete scrollOnce[e];
                                      return
                                  }
                              if ( scrollOnce[e] )   delete scrollOnce[e];
                              if ( e === '*'     )   scroll['*'] = [];   // scroll['*'] must always exist - 'emit' relies on it
                              else if ( scroll[e] )   delete scroll[e];
                          } // off func.
                      /**
                       * Resets all event-related data structures.
                       * Clears all general and single event subscriptions, as well as the ignore list.
                       */
                      function reset () {
                              scroll     = Object.assign ( Object.create(null), {'*':[]} );
                              scrollOnce = Object.create ( null );
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
                       * Exceptions thrown by individual subscribers are caught and
                       * logged to `console.error` so that one misbehaving callback does
                       * not abort the rest of the chain. The `STOP` return-string
                       * contract is unchanged.
                       *
                       * @param {string|Symbol} e - Name of the event to be triggered.
                       * @param {...*} [args] - Optional. Arguments to be passed to the callback functions.
                       * @returns void
                       */
                      function emit ( e, ...args ) {
                              if ( debugFlag ) {
                                          console.log ( `${debugHeader} Event "${String(e)}" was triggered.`);   // String() - event names can be Symbols
                                          if ( args.length > 0 ) {
                                              console.log ( 'Arguments:');
                                              console.log ( ...args );
                                              console.log ( '^----' );
                                          }
                                  }

                              function safeCall ( fn, callArgs ) {
                                          try   { return fn ( ...callArgs ) }
                                          catch ( err ) {
                                                  console.error ( 'notice: subscriber threw —', err );
                                                  return undefined
                                              }
                                      } // safeCall func.

                              function exeCallback ( name ) {
                                          let stopped = false;
                                          if ( name === '*' )   return   // 'emit("*")' iterates Reflect.ownKeys(scroll) which includes '*'; skip the meta-loop to avoid double-firing the wildcard
                                          if ( ignore.has(name) )   return
                                          scroll[name].every ( fn => {
                                                              const r = safeCall ( fn, args );
                                                              if ( typeof(r) !== 'string' )   return true
                                                              if ( r.toUpperCase() === 'STOP' ) {
                                                                                                  stopped = true;
                                                                                                  return false
                                                                                      }
                                                              return true
                                                          });
                                          if ( !stopped )   scroll['*'].forEach ( fn => safeCall ( fn, [e, ...args] )  );
                                  } // exeCallback func.

                              if ( e === '*' ) {   // The wildcard '*' doesn't work for 'once' events
                                          let evNames = Reflect.ownKeys ( scroll );   // Reflect.ownKeys - event names can be Symbols
                                          evNames.forEach ( name => exeCallback(name)   );
                                          return
                                  }
                              if ( scrollOnce[e] ) {
                                          if ( ignore.has(e) )   return
                                          const onceFns = scrollOnce[e];
                                          delete scrollOnce[e];   // Delete before the calls, so handlers can re-register with 'once'
                                          onceFns.forEach ( fn => safeCall ( fn, args )   );
                                          if ( !scroll[e] )   scroll['*'].forEach ( fn => safeCall ( fn, [e, ...args] )  );   // Notify wildcard listeners; if regular subscribers exist, 'exeCallback' will do it
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
                                                evNames     = Reflect.ownKeys ( scroll )   // Reflect.ownKeys - event names can be Symbols
                                              , evOnceNames = Reflect.ownKeys ( scrollOnce )
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

  /**
   * Factory that produces the `effect(relations, fn, ...args)` API for a
   * given shared `local`.
   *
   * @private
   * @param {Object} l - The shared local object from `main()`. Holds the
   *   storage map and the global call markers.
   * @returns {Function} The `effect` constructor (see JSDoc below).
   */
  function effectLib ( l ) {
  /**
   * Registers a side effect that fires synchronously every time any of the
   * specified signal states (or computeds) is `set`. The effect body is NOT
   * called during setup — only on subsequent `set` calls on the relations.
   *
   * @param {Array} relations - Signals this effect depends on. Each one
   *   must expose a `.get()` method (states, computeds, anything that
   *   follows the signals convention). Anything read inside `fn` that is not
   *   in `relations` will NOT trigger the effect.
   * @param {Function} fn - The side effect body. Called with `...args` as
   *   arguments, where `args` is the rest passed to `effect`.
   * @param {...any} args - Default arguments passed to every `fn` invocation.
   *   Cannot be changed at fire time.
   * @returns {void}
   * @example
   *   const count = h.state ( 0 )
   *   h.effect ( [count], ( label ) => console.log ( `${label}: ${count.get ()}` ), 'tick' )
   *   count.set ( 1 )   // -> "tick: 1"
   */
  return function effect ( relations, fn, ...args ) {
      const id = Symbol ( 'effect' );
      l.callID = id;
      l.callType = l.EFFECT_CALL;    // Stable sentinel; see main.js — dep tracking checks this by reference
      l.storage[id] = { id, fn, defaultArgs: args };
      try {
          relations.forEach ( signal => signal.get() );   // Register effect in signal state
      } finally {
          // Reset the global call markers even if a relation's `get()` throws,
          // otherwise a mid-setup exception would leak them and silently corrupt
          // every subsequent `state.get()` in this signals instance.
          l.callID = null;
          l.callType = null;
      }
  } // effect func.
  } // effectLib func.

  /**
   * Factory that produces the `state(initialValue, validation?)` API for a
   * given shared `local` (the same `local` is passed to `effect` and
   * `computed` so all three primitives share a single dep-tracking context).
   *
   * @private
   * @param {Object} l - The shared local object from `main()`. Holds the
   *   storage map and the global call markers (`callID` / `callType`).
   * @returns {Function} The `state` constructor (see JSDoc below).
   */
  function stateLib ( l ) {


  /**
   * Creates a reactive item with an initial value and optional validation function.
   *
   * The `validation` function is called on the `initialValue` too — if it
   * returns `false`, the constructor throws a `TypeError` (fail fast), since a
   * state that violates its own contract is almost certainly a bug. Pass `false`
   * (the default) or omit the argument to skip validation entirely.
   *
   * @param {any} initialValue - The initial value of the item.
   * @param {Function|false} [validation=false] - An optional validation function that takes a new value
   * and returns a boolean indicating if the new value is valid. Defaults to false, which means no validation.
   *
   * @returns {Object} An object with `get`, `set` and `modify` methods:
   *  - `get`: Retrieves the current value of the item.
   *  - `set`: Attempts to update the item's value. If validation is provided and fails, returns false. Otherwise, returns true.
   *  - `modify`: Accepts a function that takes the current value of the item and returns a new value.
   *    If validation is provided and fails, returns false. Otherwise, returns true.
   */
  function state ( initialValue, validation=false ) {
      if ( validation && !validation ( initialValue ) ) {
                  throw new TypeError ( 'signals: initial value failed validation' )
              }
      const id = Symbol ( 'item' );
      l.storage[id] = { id, value: clone ( initialValue ) , validate: validation, deps: new Set(), effects: new Set() };
  // TODO: Did promises have a place here?
  // TODO: What about dependency injection here or in computed and effect functions?
  // TODO: Can 'notes' get benefit from signals?

      /**
       * Attempts to update the state's value. The new value is deep-cloned
       * via `structuredClone` (with a clear `TypeError` if it can't be cloned).
       * If a `validation` function is configured and it returns `false`, the
       * state is left unchanged and `set` returns `false`. On success, every
       * computed that depends on this state is marked dirty, every effect
       * that depends on this state is fired synchronously, and `set` returns
       * `true`. The check is `oldValue !== newValue`-blind: setting the same
       * value still fires dependents — by design, no deep-equality is run.
       *
       * @param {any} newValue - The new value. Must be cloneable (primitives,
       *   plain objects, arrays, etc.). Functions and Symbols are rejected.
       * @returns {boolean} `true` if the value was set, `false` if validation
       *   rejected the new value.
       */
      function set ( newValue ) {
                  const rec = l.storage[id];
                  if ( rec.validate) {
                              if ( rec.validate && rec.validate ( newValue ) )  l.storage[id].value = clone ( newValue );
                              else                                              return false
                          }
                  else l.storage[id].value = clone ( newValue );
                  for ( const val of l.storage[id].deps ) {
                              l.storage[val].dirty = true;
                      }
                  for ( const val of l.storage[id].effects ) {
                              let { fn, defaultArgs } = l.storage[val];
                              fn ( ...defaultArgs  );
                      }
                  return true
              } // set func.

      /**
       * Returns the current value of the state. As a side effect, if called
       * from inside a `computed()` evaluation or an `effect()` setup, the
       * call registers this state as a dep of the caller — that's how
       * reactivity is wired.
       *
       * @returns {any} The current value.
       */
      function get () {
                  if ( l.callType === l.EFFECT_CALL    )   l.storage[id].effects.add ( l.callID );
                  if ( l.callType === l.COMPUTED_CALL )   l.storage[id].deps.add    ( l.callID );
                  return l.storage[id].value
              } // get func.

      /**
       * Atomically updates the state's value by passing the current value to
       * `fn` and using the return value as the new value. The state is left
       * unchanged if the resulting value fails validation.
       *
       * @param {(currentValue: any) => any} fn - Transformer function.
       * @returns {boolean} `true` if the value was set, `false` if validation
       *   rejected the new value. If `fn` itself throws, the throw propagates
       *   and the state is left unchanged.
       */
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

  // Clone a value for storage. Most signal values are plain data (numbers,
  // strings, arrays, plain objects) and `structuredClone` handles those. For
  // values that can't be cloned (functions, Symbols, etc.) we throw a
  // `TypeError` with a clear message instead of the raw `DataCloneError` so
  // the call site is obvious.
  /**
   * Deep-clone a state value, throwing a `TypeError` if cloning fails.
   * @private
   * @param {any} value - The value to clone.
   * @returns {any} A deep copy of `value`.
   * @throws {TypeError} If `structuredClone` cannot clone `value` (e.g. it is a
   *   function, a Symbol, or holds a non-cloneable child).
   */
  function clone ( value ) {
      try { return structuredClone ( value ) }
      catch ( e ) {
          throw new TypeError ( `signals: state value cannot be cloned (${e && e.message ? e.message : e})` )
      }
  }

  return state
  } // stateLib func.

  /**
   * Factory that produces the `computed(fn, ...args)` API for a given shared
   * `local`.
   *
   * @private
   * @param {Object} l - The shared local object from `main()`. Holds the
   *   storage map and the global call markers.
   * @returns {Function} The `computed` constructor (see JSDoc below).
   */
  function computedLib ( l ) {
  /**
   * Creates a computed reactive item that derives its value from `fn`. The
   * value is lazy: `fn` runs once at construction (with the constructor's
   * `args`), and again on each `.get()` only after a dep has been marked
   * dirty.
   *
   * If `fn` throws at construction time, the throw propagates and no
   * computed is registered (the global call markers are still reset; see
   * `states.js` for the matching fix on the `state` side).
   *
   * @param {Function} fn - A function that returns the computed value. Will
   *   be re-invoked when any dep is marked dirty.
   * @param {...any} args - Default arguments. Used when `.get()` is called
   *   with no arguments; otherwise `.get()`'s arguments are forwarded to
   *   `fn`. This makes the computed both memoized-by-deps (no args) and
   *   parameterized (with args).
   * @returns {Object} A computed object with a single `get` method.
   * @example
   *   const a = h.state ( 2 )
   *   const double = h.computed ( x => a.get () * 2, 0 )
   *   double.get ()       // -> 4   (default args = [0], fn(0) returns 4)
   *   double.get ( 10 )   // -> 20  (override args, fn(10) returns 20)
   */
  return function computed ( fn, ...args ) {
             const id = Symbol ( 'computed' );
             l.callID = id;
             l.callType = l.COMPUTED_CALL;    // Stable sentinel; see main.js — dep tracking checks this by reference
             try {
                         l.storage[id] = { id, value:fn(...args), fn, effects: new Set(), dirty: false, defaultArgs: args };
             } finally {
                         // Reset the global call markers even if `fn(...args)` throws,
                         // otherwise a mid-construction exception would leak them and
                         // silently corrupt every subsequent `state.get()` in this
                         // signals instance.
                         l.callID = null;
                         l.callType = null;
             }

             return {
                     /**
                      * Returns the computed value, recomputing if any dep is
                      * dirty. Side effects:
                      *  - If called from inside an `effect()` setup, this computed
                      *    is registered as a dep of that effect.
                      *  - If called from a non-effect context (callType is null),
                      *    every effect registered on this computed is fired
                      *    synchronously — this is the lazy-evaluation contract.
                      * @param {...any} args - Override the default args for this
                      *   call. If omitted, the constructor's `...args` is used.
                      * @returns {any} The (possibly just-recomputed) value.
                      */
                     get: ( ...args ) => {
                                 if ( l.callType === l.EFFECT_CALL )   l.storage[id].effects.add ( l.callID );
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
  } // computed func.
  } // computedLib func.

  /**
   *    Signals - A simple reactivity system.
   *   - Started on January 9th, 2025
   *  
   */




  /**
   * Creates a new, independent signals instance. Each call returns a fresh
   * instance with its own `state` / `computed` / `effect` API and its own
   * internal `storage`; instances do not share state.
   *
   * @returns {Object} A signals API with the three primitives:
   *  - `state(initialValue, validation?)` — create a reactive cell.
   *  - `computed(fn, ...args)` — create a derived, lazy reactive value.
   *  - `effect(relations, fn, ...args)` — register a side effect on the
   *    given relations.
   * @example
   *   const signals = require ( '@peter.naydenov/signals' )
   *   const h = signals ()
   *   const count = h.state ( 0 )
   *   h.effect ( [count], () => console.log ( 'count changed' ) )
   *   count.set ( 1 )     // -> "count changed"
   */
  function main () {
      /**
       * A local storage for reactive items.
       *
       * `callID` and `callType` together identify what kind of call is in
       * progress (if any). `callID` is the symbol id of the effect/computed
       * being evaluated; `callType` is a stable sentinel (one of
       * `EFFECT_CALL` / `COMPUTED_CALL`) so dep tracking does not depend on
       * the description of a `Symbol` (which would break if anyone ever
       * renamed the `Symbol('effect')` / `Symbol('computed')` literals).
       *
       * @type {Object}
       * @property {Object}  storage - A map of reactive items.
       * @property {null|Symbol} callID - A unique identifier for the current call.
       * @property {null|Symbol} callType - Stable sentinel identifying the call kind.
       * @property {Symbol} EFFECT_CALL - Sentinel set while an effect is being registered.
       * @property {Symbol} COMPUTED_CALL - Sentinel set while a computed is being registered.
       */
      const local = {
                  storage      : {}
              ,   callID       : null
              ,   callType     : null
              ,   EFFECT_CALL    : Symbol ( 'signals-effect-call' )
              ,   COMPUTED_CALL : Symbol ( 'signals-computed-call' )
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
   * Data Pool
   *
   * Data layer for node apps and single page application (SPA). Data-pool simplifies
   * data maintenance with:
   * - Multiple data stores
   * - Stores with immutable data
   * - Signal stores with computed properties and effects
   * - API based stores
   * - Caching data records from API requests
   * - Optional TTL for each data record
   * - Optional update schedule for each data record
   * - Mechanism to fake API request responses
   *
   * History notes:
   * - Development started on October 27th, 2022
   * - Published on GitHub for first time: November 7th, 2022
   *
   * @returns {DataPoolAPI} The data-pool API object with methods for data management.
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

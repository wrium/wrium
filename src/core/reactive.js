/**
 * DEEP REACTIVITY (reactive)
 * ==========================
 * Creates a deeply reactive proxy for objects and arrays.
 * All nested objects are automatically wrapped in proxies.
 * Array methods are specially handled to trigger proper updates.
 */
import { Dep } from './dep.js';
import { isObj } from '../utils.js';

/** Symbol to access the raw (unwrapped) object */
const RAW = Symbol('raw');

/** Symbol to check if an object is already reactive */
export const IS_REACTIVE = Symbol('isReactive');

/** WeakMap to cache reactive proxies (prevents double-wrapping) */
const reactiveMap = new WeakMap();

/** Helper: Check if object has own property */
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/** Array methods that mutate the array */
const arrayMutators = new Set([
    'push', 'pop', 'shift', 'unshift', 'splice',
    'sort', 'reverse', 'fill', 'copyWithin'
]);

/** Array methods that iterate/read the array */
const arrayIterators = new Set([
    'includes', 'indexOf', 'lastIndexOf', 'find', 'findIndex',
    'findLast', 'findLastIndex', 'every', 'some', 'forEach',
    'map', 'filter', 'reduce', 'reduceRight', 'flat', 'flatMap',
    'values', 'entries', 'keys', Symbol.iterator
]);

/**
 * Create a deeply reactive proxy for an object or array
 *
 * @param {Object|Array} target - The object to make reactive
 * @returns {Proxy} A reactive proxy of the object
 *
 * @example
 * const state = reactive({
 *   user: { name: 'John' },
 *   items: [1, 2, 3]
 * });
 * state.user.name = 'Jane'; // Triggers updates
 * state.items.push(4);      // Triggers updates
 */
export const reactive = target => {
    // Only objects can be reactive
    if (!isObj(target) || target[IS_REACTIVE]) return target;

    // Return cached proxy if exists (prevents double-wrapping)
    if (reactiveMap.has(target)) return reactiveMap.get(target);

    const isArray = Array.isArray(target);

    // Each property gets its own dependency tracker
    const depsMap = new Map();

    // Special dep for iteration (for...of, Object.keys, etc.)
    const iterationDep = new Dep();

    /** Get or create dependency tracker for a property */
    const getDep = k => depsMap.get(k) || (depsMap.set(k, new Dep()), depsMap.get(k));

    /**
     * Create a wrapped array method that triggers reactivity
     * @param {string|symbol} method - The array method name
     */
    const createArrayMethod = method => {
        const isMut = arrayMutators.has(method);
        const isIter = arrayIterators.has(method);

        return function (...args) {
            const raw = this[RAW];

            // Track iteration dependency for non-mutating iterators
            if (!isMut && isIter) iterationDep.depend();

            let res;
            // Special handling for search methods (need to unwrap reactive args)
            if (method === 'includes' || method === 'indexOf' || method === 'lastIndexOf') {
                getDep('length').depend();
                // Track all indices for search
                for (let i = 0; i < raw.length; i++) getDep(String(i)).depend();
                // Unwrap reactive argument if needed
                res = Array.prototype[method].call(raw, args[0]?.[RAW] ?? args[0], ...args.slice(1));
            } else {
                // Mutators work on raw array, iterators on proxy (for reactive nested objects)
                res = Array.prototype[method].apply(isMut ? raw : this, args);
            }

            // Notify subscribers for mutations
            if (isMut) {
                iterationDep.notify();
                getDep('length').notify();
                // Methods that reorder elements need to notify all indices
                if (method === 'sort' || method === 'reverse' || method === 'shift' || method === 'unshift') {
                    for (let i = 0; i < raw.length; i++) getDep(String(i)).notify();
                }
            }

            // Wrap result in reactive if it's an object
            return isObj(res) && !res[IS_REACTIVE] ? reactive(res) : res;
        };
    };

    // Pre-create wrapped array methods
    const arrayMethods = isArray
        ? Object.fromEntries([...arrayMutators, ...arrayIterators].map(m => [m, createArrayMethod(m)]))
        : null;

    // Create the proxy with reactive handlers
    const proxy = new Proxy(target, {
        /**
         * GET handler - tracks dependencies and returns reactive nested objects
         */
        get(t, k, r) {
            // Return raw object (used internally)
            if (k === RAW) return t;
            // Check if reactive
            if (k === IS_REACTIVE) return true;
            // Use wrapped array methods
            if (isArray && arrayMethods?.[k]) return arrayMethods[k];

            // Track this property as a dependency
            getDep(k).depend();

            const res = Reflect.get(t, k, r);
            // Recursively wrap nested objects
            return isObj(res) ? (res[IS_REACTIVE] ? res : reactive(res)) : res;
        },

        /**
         * SET handler - notifies subscribers when values change
         */
        set(t, k, v, r) {
            const old = t[k];
            const hadKey = has(t, k);
            const res = Reflect.set(t, k, v, r);

            // Only notify if value actually changed or key is new
            if (!hadKey || !Object.is(old, v)) {
                getDep(k).notify();
                // Notify iteration dep for new keys or array index changes
                if (!hadKey || (isArray && (k === 'length' || String(+k) === k))) {
                    iterationDep.notify();
                }
            }
            return res;
        },

        /**
         * DELETE handler - notifies when properties are deleted
         */
        deleteProperty(t, k) {
            const hadKey = has(t, k);
            const res = Reflect.deleteProperty(t, k);
            if (hadKey) {
                getDep(k).notify();
                iterationDep.notify();
            }
            return res;
        },

        /**
         * OWNKEYS handler - tracks iteration (for...in, Object.keys, etc.)
         */
        ownKeys(t) {
            iterationDep.depend();
            return Reflect.ownKeys(t);
        },

        /**
         * HAS handler - tracks 'in' operator usage
         */
        has(t, k) {
            getDep(k).depend();
            return Reflect.has(t, k);
        }
    });

    // Cache the proxy
    reactiveMap.set(target, proxy);
    return proxy;
};

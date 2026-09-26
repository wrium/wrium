/**
 * REF
 * ===
 * ref() - For primitive values (string, number, boolean)
 */
import { Dep } from './dep.js';
import { isObj } from '../utils.js';

/**
 * Create a reactive reference for a primitive value
 *
 * NOTE: ref() only accepts primitive values (string, number, boolean, null, undefined).
 * For objects and arrays, use reactive() instead.
 *
 * @param {*} val - The primitive value
 * @returns {Object} A ref object with .value property
 * @throws {Error} If val is an object or array
 *
 * @example
 * const count = ref(0);
 * count.value++;        // Updates and triggers reactivity
 * console.log(count.value); // 1
 *
 * // In templates, .value is automatic:
 * // {{ count }} instead of {{ count.value }}
 */
export const ref = val => {
    // Enforce primitive-only rule for API clarity
    if (isObj(val)) {
        console.warn('ref() only accepts primitive values. Use reactive() for objects and arrays.');
        throw new Error('ref() cannot be used with objects or arrays. Use reactive() instead.');
    }

    let v = val;
    const dep = new Dep();

    return {
        /** Flag to identify refs (used by evalExp for auto-unwrapping) */
        _isRef: true,

        /** Get the value (tracks dependency) */
        get value() {
            dep.depend();
            return v;
        },

        /** Set the value (triggers updates if changed) */
        set value(nv) {
            // Also prevent setting to object/array
            if (isObj(nv)) {
                console.warn('ref() value cannot be set to an object or array. Use reactive() instead.');
                throw new Error('ref() value cannot be set to an object or array.');
            }
            if (!Object.is(nv, v)) {
                v = nv;
                dep.notify();
            }
        },

        /** String conversion for template interpolation */
        toString: () => String(v)
    };
};

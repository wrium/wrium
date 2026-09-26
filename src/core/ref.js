/**
 * REF
 * ===
 * ref() - A reactive box around any value. Primitives are tracked directly;
 * objects/arrays are transparently handed to reactive() (matches Vue's
 * ref() semantics, so `ref({ ... })` is no longer an error).
 */
import { Dep } from './dep.js';
import { isObj } from '../utils.js';
import { reactive } from './reactive.js';

/**
 * Create a reactive reference to any value.
 *
 * - Primitive values (string, number, boolean, null, undefined) are tracked
 *   directly.
 * - Objects and arrays are wrapped with reactive() - `.value` returns the
 *   reactive proxy, so nested property access/mutation is reactive too.
 *
 * @param {*} val - The initial value
 * @returns {Object} A ref object with a reactive .value property
 *
 * @example
 * const count = ref(0);
 * count.value++;
 *
 * const user = ref({ name: 'John' });
 * user.value.name = 'Jane'; // reactive, same as reactive({ name: 'John' })
 *
 * // In templates, .value is automatic:
 * // {{ count }} / {{ user.name }} instead of {{ count.value }} / {{ user.value.name }}
 */
export const ref = val => {
    // The raw, unwrapped value - used to detect real changes on assignment
    let rawValue = val;
    // The exposed value - objects/arrays are transparently reactive
    let value = isObj(val) ? reactive(val) : val;
    const dep = new Dep();

    return {
        /** Flag to identify refs (used by evalExp for auto-unwrapping) */
        _isRef: true,

        /** Get the value (tracks dependency) */
        get value() {
            dep.depend();
            return value;
        },

        /** Set the value (triggers updates if the raw value changed) */
        set value(nv) {
            if (!Object.is(nv, rawValue)) {
                rawValue = nv;
                value = isObj(nv) ? reactive(nv) : nv;
                dep.notify();
            }
        },

        /** String conversion for template interpolation */
        toString: () => String(value)
    };
};

export type Ref<T> = {
    /**
     * - The current value (reactive if T is an object/array)
     */
    value: T;
    /**
     * - Marker used by evalExp for auto-unwrapping
     */
    _isRef: true;
    toString: () => string;
};
/**
 * @template T
 * @typedef {Object} Ref
 * @property {T} value - The current value (reactive if T is an object/array)
 * @property {true} _isRef - Marker used by evalExp for auto-unwrapping
 * @property {() => string} toString
 */
/**
 * Create a reactive reference to any value.
 *
 * - Primitive values (string, number, boolean, null, undefined) are tracked
 *   directly.
 * - Objects and arrays are wrapped with reactive() - `.value` returns the
 *   reactive proxy, so nested property access/mutation is reactive too.
 *
 * @template T
 * @param {T} val - The initial value
 * @returns {Ref<T>} A ref object with a reactive .value property
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
export declare const ref: <T>(val: T) => Ref<T>;

export type ComputedRef<T> = {
    /**
     * - The current (memoized) value
     */
    value: T;
    /**
     * - Marker used by evalExp for auto-unwrapping
     */
    _isRef: true;
    /**
     * - Exposed for debugging
     */
    _effect: import('./effect.js').ReactiveEffect;
};
/**
 * @template T
 * @typedef {Object} ComputedRef
 * @property {T} value - The current (memoized) value
 * @property {true} _isRef - Marker used by evalExp for auto-unwrapping
 * @property {import('./effect.js').ReactiveEffect} _effect - Exposed for debugging
 */
/**
 * Create a computed property that auto-updates when dependencies change
 *
 * Computed values are lazy - they only recalculate when accessed and dirty.
 * They cache their result until a dependency changes.
 *
 * @template T
 * @param {() => T} getter - Function that returns the computed value
 * @returns {ComputedRef<T>} A ref-like object with .value property (read-only)
 *
 * @example
 * const count = ref(1);
 * const doubled = computed(() => count.value * 2);
 * console.log(doubled.value); // 2
 * count.value = 5;
 * console.log(doubled.value); // 10
 */
export declare const computed: <T>(getter: () => T) => ComputedRef<T>;

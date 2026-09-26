/**
 * COMPUTED
 * ========
 * computed() - For derived/calculated values that auto-update
 */
import { Dep } from './dep.js';
import { ReactiveEffect } from './effect.js';

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
export const computed = getter => {
    let value;
    let dirty = true; // Needs recalculation?
    const dep = new Dep();

    // Create effect with custom scheduler
    // Scheduler marks as dirty instead of re-running immediately
    const effect = new ReactiveEffect(getter, () => {
        if (!dirty) {
            dirty = true;
            dep.notify(); // Notify computed's own subscribers
        }
    });

    return {
        _isRef: true,

        /** Get the computed value (lazy evaluation) */
        get value() {
            // Recalculate if dirty
            if (dirty) {
                value = effect.run();
                dirty = false;
            }
            dep.depend();
            return value;
        },

        /** Expose effect for debugging */
        _effect: effect
    };
};

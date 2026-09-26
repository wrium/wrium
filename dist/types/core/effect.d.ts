/**
 * Currently running effect (used for dependency tracking by Dep).
 * Exported as a live binding - dep.js reads the current value on every
 * property access, it is never re-assigned outside this module.
 */
export declare let activeEffect: null;
/**
 * Add an effect to the queue for batch execution
 * @param {ReactiveEffect} effect - The effect to queue
 */
export declare const queueEffect: (effect: ReactiveEffect) => void;
/**
 * ReactiveEffect - Wraps a function to make it reactive
 * When run, it tracks which reactive values are accessed (dependencies).
 * When those values change, the effect is re-run automatically.
 */
export declare class ReactiveEffect {
    id: number;
    fn: Function;
    scheduler: Function | null;
    deps: any[];
    active: boolean;
    /**
     * @param {Function} fn - The function to run reactively
     * @param {Function|null} scheduler - Optional custom scheduler for updates
     */
    constructor(fn: Function, scheduler?: Function | null);
    /**
     * Run the effect function and track dependencies
     * @returns {*} The return value of the function
     */
    run(): any;
    /**
     * Stop this effect from running
     * Removes it from all dependency lists
     */
    stop(): void;
    /**
     * Remove this effect from all its dependencies
     * Called before re-running to avoid stale subscriptions
     */
    cleanup(): void;
}
/**
 * Create and run a reactive effect
 * The effect will automatically re-run when its dependencies change.
 *
 * @param {Function} fn - Function to run reactively
 * @param {Object} opts - Options (scheduler)
 * @returns {Function} Stop function to cancel the effect
 *
 * @example
 * const stop = watchEffect(() => {
 *   console.log('Count is:', count.value);
 * });
 * // Later: stop() to cancel
 */
export declare const watchEffect: (fn: Function, opts?: Object) => Function;

/**
 * EFFECT SCHEDULING & REACTIVE EFFECT
 * ===================================
 * Effects are batched and run asynchronously in the next microtask.
 * This prevents multiple updates when several reactive values change at once.
 * Effects are sorted by ID to ensure consistent execution order.
 */
import { runHooks } from '../hooks.js';
import { getCurrentScope } from '../scope.js';

/**
 * Currently running effect (used for dependency tracking by Dep).
 * Exported as a live binding - dep.js reads the current value on every
 * property access, it is never re-assigned outside this module.
 */
export let activeEffect = null;

/** Stack of nested effects (supports computed inside computed, etc.) */
const effectStack = [];

/** Queue of effects waiting to be executed */
let effectQueue = [];

/** Flag to prevent multiple flush scheduling */
let isFlushing = false;

/**
 * Add an effect to the queue for batch execution
 * @param {ReactiveEffect} effect - The effect to queue
 */
export const queueEffect = effect => {
    if (!effectQueue.includes(effect)) {
        effectQueue.push(effect);
        // Schedule flush in next microtask (after current sync code completes)
        if (!isFlushing) {
            isFlushing = true;
            Promise.resolve().then(flushEffects);
        }
    }
};

/**
 * Execute all queued effects
 * Effects are sorted by ID to ensure parent effects run before children
 */
const flushEffects = () => {
    // Copy and sort queue, then clear it (allows new effects to be queued during flush)
    const queue = effectQueue.slice().sort((a, b) => a.id - b.id);
    effectQueue.length = 0;
    isFlushing = false;

    for (const e of queue) {
        if (e.active) {
            try {
                e.run();
            } catch (err) {
                console.error?.('Effect error:', err);
                runHooks('onError', err, 'effect', e);
            }
        }
    }
};

/** Auto-incrementing ID for effect ordering */
let effectId = 0;

/**
 * ReactiveEffect - Wraps a function to make it reactive
 * When run, it tracks which reactive values are accessed (dependencies).
 * When those values change, the effect is re-run automatically.
 */
export class ReactiveEffect {
    /**
     * @param {Function} fn - The function to run reactively
     * @param {Function|null} scheduler - Optional custom scheduler for updates
     */
    constructor(fn, scheduler = null) {
        this.id = effectId++;      // Unique ID for sorting
        this.fn = fn;              // The reactive function
        this.scheduler = scheduler; // Custom scheduler (used by computed)
        this.deps = [];            // Dependencies this effect has
        this.active = true;        // Whether this effect is still active
    }

    /**
     * Run the effect function and track dependencies
     * @returns {*} The return value of the function
     */
    run() {
        // If stopped, just run without tracking
        if (!this.active) return this.fn();

        // Clear old dependencies before re-running
        this.cleanup();

        try {
            // Push to stack (supports nested effects)
            effectStack.push(this);
            activeEffect = this;
            // Run function - any reactive reads will call dep.depend()
            return this.fn();
        } finally {
            // Pop from stack, restore previous effect
            effectStack.pop();
            activeEffect = effectStack[effectStack.length - 1] || null;
        }
    }

    /**
     * Stop this effect from running
     * Removes it from all dependency lists
     */
    stop() {
        if (this.active) {
            this.cleanup();
            this.active = false;
        }
    }

    /**
     * Remove this effect from all its dependencies
     * Called before re-running to avoid stale subscriptions
     */
    cleanup() {
        for (const dep of this.deps) dep.subs.delete(this);
        this.deps.length = 0;
    }
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
export const watchEffect = (fn, opts = {}) => {
    const effect = new ReactiveEffect(fn, opts.scheduler);
    effect.run(); // Run immediately
    const stop = () => effect.stop();
    // Auto-register with current scope for cleanup
    getCurrentScope()?.addEffect(stop);
    return stop;
};

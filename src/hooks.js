/**
 * Simple plugin hook system for extending compiler/effect/app behavior.
 * Hooks: beforeCompile, afterCompile, onError
 */

/** Registered hooks */
const hooks = {};

/**
 * Register a hook function
 *
 * Available hooks:
 * - beforeCompile(el, scope, cs) - Called before compiling an element
 * - afterCompile(el, scope, cs) - Called after compiling an element
 * - onError(err, type, context) - Called when an error occurs
 *
 * @param {string} name - Hook name
 * @param {Function} fn - Hook function
 *
 * @example
 * onHook('beforeCompile', (el, scope) => {
 *   console.log('Compiling:', el.tagName);
 * });
 */
export const onHook = (name, fn) => (hooks[name] = hooks[name] || []).push(fn);

/**
 * Run all registered hooks for a given name
 * @param {string} name - Hook name
 * @param {...*} args - Arguments to pass to hooks
 */
export const runHooks = (name, ...args) => {
    const list = hooks[name];
    if (!list) return;
    for (const fn of list) {
        try { if (fn(...args) === false) return false; }
        catch (err) { console.error?.(`Hook error (${name}):`, err); }
    }
};

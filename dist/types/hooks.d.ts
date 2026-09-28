/**
 * Simple plugin hook system for extending compiler/effect/app behavior.
 * Hooks: beforeCompile, afterCompile, onError
 */
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
export declare const onHook: (name: string, fn: Function) => any;
/**
 * Run all registered hooks for a given name
 * @param {string} name - Hook name
 * @param {...*} args - Arguments to pass to hooks
 */
export declare const runHooks: (name: string, ...args: any[]) => false | undefined;

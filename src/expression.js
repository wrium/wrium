/**
 * Evaluates JavaScript expressions in templates with access to scope variables.
 * Expressions are compiled to functions and cached for performance.
 * Refs are automatically unwrapped (no need for .value in templates).
 */

/** Cache for compiled expression functions */
const expCache = new Map();

/**
 * Evaluate a JavaScript expression with scope variables
 *
 * Features:
 * - Auto-unwraps refs (count instead of count.value)
 * - Cached compilation for performance
 * - Safe evaluation with try/catch
 *
 * @param {string} exp - The expression to evaluate
 * @param {Object} scope - Variables available to the expression
 * @returns {*} The result of the expression, or undefined on error
 *
 * @example
 * evalExp('count + 1', { count: ref(5) }) // Returns 6
 * evalExp('items.length', { items: reactive([1,2,3]) }) // Returns 3
 */
export const evalExp = (exp, scope) => {
    try {
        const keys = Object.keys(scope);
        // Cache key includes expression and available variables
        const cacheKey = exp + '|' + keys.join(',');

        let fn = expCache.get(cacheKey);
        if (!fn) {
            // Compile expression to function
            // Inner try/catch returns undefined for invalid expressions
            fn = Function(...keys, `"use strict";try{return(${exp})}catch(e){return undefined}`);

            // Limit cache size to prevent memory leaks
            if (expCache.size > 500) {
                expCache.delete(expCache.keys().next().value);
            }
            expCache.set(cacheKey, fn);
        }

        // Auto-unwrap refs when passing to function
        const vals = keys.map(k => {
            const v = scope[k];
            return v?._isRef ? v.value : v;
        });

        return fn(...vals);
    } catch {
        return undefined;
    }
};

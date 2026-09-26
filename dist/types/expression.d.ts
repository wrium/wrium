/**
 * Evaluates JavaScript expressions in templates with access to scope variables.
 * Expressions are compiled to functions and cached for performance.
 * Refs are automatically unwrapped (no need for .value in templates).
 */
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
export declare const evalExp: (exp: string, scope: Object) => any;

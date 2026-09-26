/**
 * DIRECTIVE REGISTRY
 * ==================
 * Extension point for `v-xxx` directives that don't need structural DOM
 * manipulation (unlike v-if/v-for, which clone/remove template nodes and
 * stay hardcoded in the compiler). Core directives (model, show, text) are
 * registered the same way plugins register their own - there is no special
 * privilege for built-ins, so plugins are first-class citizens.
 *
 * A directive handler is called once per matching element with:
 *   handler(el, expression, ctx)
 * where ctx = { scope, cs, evalExp, watchEffect, ref, reactive }
 *
 * The handler is responsible for setting up whatever effect(s) or
 * listener(s) it needs, registering them with `cs` (the current Scope) so
 * they're cleaned up automatically when the element is removed.
 *
 * @example
 * api.directive('html', (el, exp, { scope, cs, watchEffect, evalExp }) => {
 *   cs.addEffect(watchEffect(() => { el.innerHTML = evalExp(exp, scope) ?? ''; }));
 * });
 */

const registry = new Map();

/**
 * Register a directive handler for `v-<name>="expression"`.
 * @param {string} name - Directive name without the `v-` prefix (e.g. 'show')
 * @param {Function} handler - (el, expression, ctx) => void
 */
export const registerDirective = (name, handler) => {
    registry.set(name, handler);
};

/**
 * Look up a registered directive handler.
 * @param {string} name - Directive name without the `v-` prefix
 * @returns {Function|undefined}
 */
export const getDirective = name => registry.get(name);

/**
 * Built-in directives, registered through the same `registerDirective` API
 * that plugins use. There is no special privilege for these - they are
 * proof that the registry is the real extension point, not an afterthought.
 *
 * Imported once (for its side effects) by compiler.js.
 */
import { registerDirective } from './directives.js';

/**
 * v-show="exp" - Toggle display:none without removing the element
 */
registerDirective('show', (el, exp, { scope, cs, watchEffect, evalExp }) => {
    cs.addEffect(watchEffect(() => {
        el.style.display = evalExp(exp, scope) ? '' : 'none';
    }));
});

/**
 * v-text="exp" - Set textContent (safe, no HTML)
 */
registerDirective('text', (el, exp, { scope, cs, watchEffect, evalExp }) => {
    cs.addEffect(watchEffect(() => {
        el.textContent = evalExp(exp, scope) ?? '';
    }));
});

/**
 * v-model - Two-way binding for text inputs, checkboxes, radios, and selects
 */
registerDirective('model', (el, exp, { scope, cs, watchEffect, evalExp }) => {
    const isCheck = el.type === 'checkbox' || el.type === 'radio';
    const prop = isCheck ? 'checked' : 'value';
    const ev = isCheck || el.tagName === 'SELECT' ? 'change' : 'input';

    // Update model when input changes
    const fn = () => {
        if (el.type === 'radio' && !el.checked) return;
        const val = el.type === 'radio' ? el.value : el[prop];

        if (scope[exp]?._isRef) {
            scope[exp].value = val;
        } else {
            evalExp(exp + '=_v', { ...scope, _v: val });
        }
    };

    el.addEventListener(ev, fn);
    cs.addListener(el, ev, fn);

    // Update input when model changes
    cs.addEffect(watchEffect(() => {
        const res = evalExp(exp, scope);
        if (el.type === 'radio') {
            el.checked = String(el.value) === String(res);
        } else {
            el[prop] = res;
        }
    }));
});

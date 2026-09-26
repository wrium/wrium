/**
 * TEMPLATE COMPILER
 * =================
 * Compiles DOM elements with directives into reactive components.
 *
 * Supported directives:
 * - {{ expression }}     - Text interpolation
 * - z-if / z-else-if / z-else - Conditional rendering
 * - z-for="(item, index) in array" - List rendering
 * - z-model              - Two-way binding
 * - z-show               - Toggle display
 * - z-text / z-html      - Content binding
 * - :attr or z-bind:attr - Attribute binding
 * - @event or z-on:event - Event handling
 */
import { runHooks } from './hooks.js';
import { watchEffect } from './core/effect.js';
import { evalExp } from './expression.js';
import { Scope } from './scope.js';
import { ref } from './core/ref.js';
import { reactive, IS_REACTIVE } from './core/reactive.js';
import { isObj } from './utils.js';

/**
 * Compile a DOM element and its children
 *
 * @param {Node} el - DOM element to compile
 * @param {Object} scope - Reactive data scope
 * @param {Scope} cs - Current scope for cleanup tracking
 */
export const compile = (el, scope, cs) => {
    // Run beforeCompile hooks (plugins can modify elements)
    if (runHooks('beforeCompile', el, scope, cs) === false) return;

    // -------------------------------------------------------------------------
    // TEXT NODE - Handle {{ expression }} interpolation
    // -------------------------------------------------------------------------
    if (el.nodeType === 3) {
        const text = el.nodeValue;
        const regex = /\{\{([^}]+)\}\}/g;

        // Skip if no interpolation
        if (!regex.test(text)) return;

        // Parse text into static parts and expression parts
        const parts = [];
        let lastIdx = 0, match;
        regex.lastIndex = 0;

        while ((match = regex.exec(text))) {
            // Add static text before this match
            if (match.index > lastIdx) {
                parts.push(text.slice(lastIdx, match.index));
            }
            // Add expression
            parts.push({ exp: match[1].trim() });
            lastIdx = regex.lastIndex;
        }

        // Add remaining static text
        if (lastIdx < text.length) {
            parts.push(text.slice(lastIdx));
        }

        // Create reactive effect to update text when expressions change
        cs.addEffect(watchEffect(() => {
            el.nodeValue = parts.map(p =>
                typeof p === 'string' ? p : evalExp(p.exp, scope) ?? ''
            ).join('');
        }));
        return;
    }

    // Only process element nodes
    if (el.nodeType !== 1) return;

    // -------------------------------------------------------------------------
    // Z-IF - Conditional rendering
    // -------------------------------------------------------------------------
    // Supports: z-if, z-else-if, z-else
    // Elements must be adjacent siblings
    // Each branch gets its own scope (created when shown, cleaned up when hidden)
    // -------------------------------------------------------------------------
    if (el.hasAttribute('z-if')) {
        const branches = [];
        const parent = el.parentNode;
        if (!parent) return;

        // Create placeholder comment for insertion point
        const ph = document.createComment('z-if');
        parent.insertBefore(ph, el);

        // Collect all branches (z-if, z-else-if, z-else)
        let curr = el;
        while (curr) {
            const type = curr && (branches.length === 0
                ? curr.hasAttribute('z-if') && 'z-if'
                : ['z-else-if', 'z-else'].find(t => curr.hasAttribute(t))
            );
            if (!type) break;

            const exp = curr.getAttribute(type);
            curr.removeAttribute(type);

            // Store template and metadata
            branches.push({
                template: curr.cloneNode(true),
                exp,      // Condition expression (null for z-else)
                type,     // 'z-if', 'z-else-if', or 'z-else'
                el: null, // Current DOM element (when rendered)
                scope: null // Current scope (when rendered)
            });

            const next = curr.nextElementSibling;
            parent.removeChild(curr);
            curr = next;
        }

        // Create reactive effect to update which branch is shown
        cs.addEffect(watchEffect(() => {
            // Find first matching branch
            let chosen = null;
            for (const b of branches) {
                if (b.type === 'z-else' || evalExp(b.exp, scope)) {
                    chosen = b;
                    break;
                }
            }

            // Update each branch
            branches.forEach(b => {
                if (b === chosen) {
                    // Show this branch (if not already shown)
                    if (!b.el) {
                        b.el = b.template.cloneNode(true);
                        b.scope = new Scope({ ...scope });
                        cs.addChild(b.scope);
                        parent.insertBefore(b.el, ph.nextSibling);
                        compile(b.el, b.scope.data, b.scope);
                    }
                } else if (b.scope) {
                    // Hide this branch
                    b.el?.remove();
                    b.scope.cleanup();
                    cs.removeChild(b.scope);
                    b.scope = null;
                    b.el = null;
                }
            });
        }));

        runHooks('afterCompile', el, scope, cs);
        return;
    }

    // Skip orphaned else branches (already processed with their z-if)
    if (el.hasAttribute('z-else-if') || el.hasAttribute('z-else')) return;

    // -------------------------------------------------------------------------
    // Z-FOR - List rendering
    // -------------------------------------------------------------------------
    // Syntax: z-for="item in items"
    //         z-for="(item, index) in items"
    //
    // Key attribute (:key or z-key) recommended for efficient updates
    // Each item gets its own scope with item and index variables
    // Objects are automatically wrapped in reactive()
    // Primitives are wrapped in ref() (auto-unwrapped in templates)
    // Index is a plain number that updates when array changes
    // -------------------------------------------------------------------------
    if (el.hasAttribute('z-for')) {
        const rawFor = el.getAttribute('z-for');

        // Parse z-for expression: "(item, index) in items" or "item in items"
        const m = rawFor.match(/^\s*(?:\((\w+)\s*,\s*(\w+)\)|(\w+))\s+(?:in|of)\s+(.*)$/);
        const itemName = m?.[1] || m?.[3] || 'item';
        const indexName = m?.[2] || 'index';
        const listExp = m?.[4] || rawFor.split(/\s+(?:in|of)\s+/)[1]?.trim() || rawFor;

        const parent = el.parentNode;
        if (!parent) return;

        // Create placeholder and remove template element
        const ph = document.createComment('z-for');
        parent.insertBefore(ph, el);
        el.remove();
        el.removeAttribute('z-for');

        // Get key attribute for efficient diffing
        const keyAttr = el.getAttribute(':key') || el.getAttribute('z-key');
        if (keyAttr) {
            el.removeAttribute(':key');
            el.removeAttribute('z-key');
        }

        // Map of key -> { clone, scope, itemValue, itemRef }
        let itemsMap = new Map();

        // Create reactive effect to update list when array changes
        cs.addEffect(watchEffect(() => {
            // Get array value
            let arr = evalExp(listExp, scope);
            if (arr?._isRef) arr = arr.value;
            if (!Array.isArray(arr)) arr = [];

            const newItemsMap = new Map();
            const newKeys = [];

            arr.forEach((v, i) => {
                // Create key for tracking (use :key if provided, else index)
                const key = '_' + (keyAttr
                    ? evalExp(keyAttr, { ...scope, [itemName]: v, [indexName]: i })
                    : i);
                newKeys.push(key);

                const existing = itemsMap.get(key);

                // Convert to reactive if object (primitives stay as-is)
                const val = isObj(v) && !v[IS_REACTIVE] ? reactive(v) : v;
                const isReactiveObj = val && val[IS_REACTIVE];

                if (existing) {
                    // Handle reference change for reactive objects
                    if (isReactiveObj && existing.itemValue !== val) {
                        // Reference changed, rebuild item
                        existing.clone.remove();
                        existing.scope.cleanup();
                        cs.removeChild(existing.scope);
                        // Fall through to create new item
                    } else {
                        // Update existing item
                        if (!isReactiveObj) {
                            // For primitives, update the ref value
                            existing.itemRef.value = val;
                        }
                        // Update index in scope data (important for correct index after reorder)
                        existing.scope.data[indexName] = i;
                        newItemsMap.set(key, existing);
                        return;
                    }
                }

                // Create new item
                const clone = el.cloneNode(true);

                // For reactive objects: use directly (accessed as item.prop)
                // For primitives: wrap in ref (auto-unwrapped in templates)
                let itemValue, itemRef;
                if (isReactiveObj) {
                    itemValue = val;
                    itemRef = null;
                } else {
                    itemRef = ref(val);
                    itemValue = itemRef;
                }

                // Create scope with item and index
                const indexValue = i;
                const s = new Scope({ ...scope, [itemName]: itemValue, [indexName]: indexValue });
                cs.addChild(s);
                compile(clone, s.data, s);
                newItemsMap.set(key, { clone, scope: s, itemValue, itemRef });
            });

            // Remove items that no longer exist
            for (const [key, item] of itemsMap) {
                if (!newItemsMap.has(key)) {
                    item.clone.remove();
                    item.scope.cleanup();
                    cs.removeChild(item.scope);
                }
            }

            // Reorder DOM nodes to match array order
            let prevNode = ph;
            for (const key of newKeys) {
                const item = newItemsMap.get(key);
                if (item.clone.previousSibling !== prevNode) {
                    parent.insertBefore(item.clone, prevNode.nextSibling);
                }
                prevNode = item.clone;
            }

            itemsMap = newItemsMap;
        }));

        runHooks('afterCompile', el, scope, cs);
        return;
    }

    // -------------------------------------------------------------------------
    // DIRECTIVES - Process element attributes
    // -------------------------------------------------------------------------
    for (const { name, value } of [...el.attributes]) {

        // ---------------------------------------------------------------------
        // EVENT BINDING: @event or z-on:event
        // ---------------------------------------------------------------------
        // Examples: @click="handler" @input="count++" z-on:submit="save"
        // Handler can be a method name or inline expression
        // Event object available as 'e' in inline expressions
        // ---------------------------------------------------------------------
        if (name.startsWith('@') || name.startsWith('z-on:')) {
            const ev = name[0] === '@' ? name.slice(1) : name.slice(5);
            el.removeAttribute(name);

            const fn = e => {
                // If value is a function name in scope, call it
                if (typeof scope[value] === 'function') {
                    scope[value](e);
                } else {
                    // Otherwise evaluate as expression
                    try {
                        const keys = Object.keys(scope);
                        const vals = keys.map(k => scope[k]);
                        Function(...keys, 'e', `"use strict";${value}`)(...vals, e);
                    } catch (err) {
                        console.error?.('Event error:', err);
                        runHooks('onError', err, 'event', { name, value });
                    }
                }
            };

            el.addEventListener(ev, fn);
            cs.addListener(el, ev, fn);
        }

        // ---------------------------------------------------------------------
        // TWO-WAY BINDING: z-model
        // ---------------------------------------------------------------------
        // Binds input value to a reactive variable
        // Supports: text inputs, checkboxes, radio buttons, select
        // ---------------------------------------------------------------------
        else if (name === 'z-model') {
            el.removeAttribute(name);

            const isCheck = el.type === 'checkbox' || el.type === 'radio';
            const prop = isCheck ? 'checked' : 'value';
            const ev = isCheck || el.tagName === 'SELECT' ? 'change' : 'input';

            // Update model when input changes
            const fn = () => {
                if (el.type === 'radio' && !el.checked) return;
                const val = el.type === 'radio' ? el.value : el[prop];

                if (scope[value]?._isRef) {
                    scope[value].value = val;
                } else {
                    evalExp(value + '=_v', { ...scope, _v: val });
                }
            };

            el.addEventListener(ev, fn);
            cs.addListener(el, ev, fn);

            // Update input when model changes
            cs.addEffect(watchEffect(() => {
                const res = evalExp(value, scope);
                if (el.type === 'radio') {
                    el.checked = String(el.value) === String(res);
                } else {
                    el[prop] = res;
                }
            }));
        }

        // ---------------------------------------------------------------------
        // ATTRIBUTE/DIRECTIVE BINDING
        // ---------------------------------------------------------------------
        // z-text="exp"  - Set textContent
        // z-html="exp"  - Set innerHTML (caution: XSS risk)
        // z-show="exp"  - Toggle display:none
        // :attr="exp"   - Bind any attribute
        // :class="obj"  - Object syntax for classes { active: isActive }
        // :style="obj"  - Object syntax for styles { color: 'red' }
        // ---------------------------------------------------------------------
        else if (name === 'z-text' || name === 'z-html' || name === 'z-show' ||
            name.startsWith(':') || name.startsWith('z-')) {
            const attr = name[0] === ':' ? name.slice(1) : name;
            el.removeAttribute(name);

            // Preserve static classes for merging
            const staticClass = attr === 'class' ? (el.getAttribute('class') || '') : '';

            cs.addEffect(watchEffect(() => {
                const res = evalExp(value, scope);

                if (attr === 'z-text') {
                    // Set text content (safe, no HTML)
                    el.textContent = res ?? '';
                }
                else if (attr === 'z-html') {
                    // Set HTML content (use with caution)
                    el.innerHTML = res ?? '';
                }
                else if (attr === 'z-show') {
                    // Toggle visibility
                    el.style.display = res ? '' : 'none';
                }
                else if (attr === 'style' && isObj(res)) {
                    // Object style binding: :style="{ color: 'red' }"
                    Object.assign(el.style, res);
                }
                else if (attr === 'class') {
                    // Class binding - supports string or object
                    // Object: :class="{ active: isActive, error: hasError }"
                    // String: :class="'btn ' + btnType"
                    el.setAttribute('class', (isObj(res)
                        ? staticClass + ' ' + Object.keys(res).filter(k => res[k]).join(' ')
                        : typeof res === 'string' ? staticClass + ' ' + res : staticClass
                    ).trim());
                }
                else {
                    // Generic attribute binding
                    const setName = attr.startsWith('z-') ? attr.slice(2) : attr;

                    if (typeof res === 'boolean') {
                        // Boolean attributes: :disabled="isDisabled"
                        res ? el.setAttribute(setName, '') : el.removeAttribute(setName);
                    } else if (res == null) {
                        el.removeAttribute(setName);
                    } else {
                        el.setAttribute(setName, res);
                    }
                }
            }));
        }
    }

    // Recursively compile children
    [...el.childNodes].forEach(child => compile(child, scope, cs));

    runHooks('afterCompile', el, scope, cs);
};

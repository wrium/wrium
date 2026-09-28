/**
 * TEMPLATE COMPILER
 * =================
 * Compiles DOM elements with directives into reactive components.
 *
 * Structural directives (v-if/v-for) clone/remove template nodes and stay
 * hardcoded here. Everything else - v-model, v-show, v-text, and anything a
 * plugin adds - is dispatched through the directive registry (directives.js),
 * so built-ins have no special privilege over plugin-provided directives.
 *
 * Supported directives:
 * - {{ expression }}       - Text interpolation
 * - v-pre                  - Skip compiling this element and its subtree
 * - v-if / v-else-if / v-else - Conditional rendering
 * - v-for="(item, index) in array" - List rendering
 * - v-model                - Two-way binding (registry)
 * - v-show / v-text         - Registry directives
 * - :attr or v-bind:attr   - Attribute binding
 * - @event or v-on:event   - Event handling, with .prevent/.stop/.once/
 *                             .self/.capture/.passive and key modifiers
 *                             (e.g. .enter matches e.key === 'Enter')
 * - <tag-name>             - A component registered via app.component(),
 *                             matched by tag name (components.js)
 */
import { runHooks } from './hooks.js';
import { watchEffect } from './core/effect.js';
import { evalExp } from './expression.js';
import { Scope } from './scope.js';
import { ref } from './core/ref.js';
import { reactive, IS_REACTIVE } from './core/reactive.js';
import { isObj } from './utils.js';
import { getDirective } from './directives.js';
import { getComponent } from './components.js';
import './core-directives.js';

/** Event modifiers handled structurally (not treated as key filters) */
const STRUCTURAL_MODS = new Set(['prevent', 'stop', 'once', 'self', 'capture', 'passive']);

/**
 * Resolve a :class binding value into a class string.
 * Accepts a string, an object ({ active: isActive }), an array of either
 * (mixing strings and objects, like Vue's :class="[base, { active }]"), or
 * anything falsy (empty string).
 */
const resolveClass = res => {
    if (Array.isArray(res)) return res.map(resolveClass).filter(Boolean).join(' ');
    if (isObj(res)) return Object.keys(res).filter(k => res[k]).join(' ');
    return typeof res === 'string' ? res : '';
};

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
    // V-PRE - Skip compiling this element and its entire subtree
    // -------------------------------------------------------------------------
    // Takes priority over everything else, including other directives on the
    // same element - matches Vue. Useful for showing literal {{ }} syntax
    // (e.g. in docs) or embedding a third-party widget's markup untouched.
    // -------------------------------------------------------------------------
    if (el.hasAttribute('v-pre')) {
        el.removeAttribute('v-pre');
        runHooks('afterCompile', el, scope, cs);
        return;
    }

    // -------------------------------------------------------------------------
    // V-IF - Conditional rendering
    // -------------------------------------------------------------------------
    // Supports: v-if, v-else-if, v-else
    // Elements must be adjacent siblings
    // Each branch gets its own scope (created when shown, cleaned up when hidden)
    // -------------------------------------------------------------------------
    if (el.hasAttribute('v-if')) {
        // v-if + v-for on the same element is a known footgun in Vue too
        // (Essential-priority style guide rule there), but for us it's worse
        // than "confusing": v-for replaces itself with sibling clones that
        // aren't descendants of this element, so v-if's branch cleanup can't
        // find and remove them again on toggle-off - the list leaks. Refuse
        // to render rather than silently leak.
        if (el.hasAttribute('v-for')) {
            const msg = 'v-if and v-for cannot be used together on the same element - use a computed filtered list, or move v-if to a wrapping element instead.';
            console.error?.(msg);
            runHooks('onError', new Error(msg), 'compile', { el });
            return;
        }

        const branches = [];
        const parent = el.parentNode;
        if (!parent) return;

        // Create placeholder comment for insertion point
        const ph = document.createComment('v-if');
        parent.insertBefore(ph, el);

        // Collect all branches (v-if, v-else-if, v-else)
        let curr = el;
        while (curr) {
            const type = curr && (branches.length === 0
                ? curr.hasAttribute('v-if') && 'v-if'
                : ['v-else-if', 'v-else'].find(t => curr.hasAttribute(t))
            );
            if (!type) break;

            const exp = curr.getAttribute(type);
            curr.removeAttribute(type);

            // Store template and metadata
            branches.push({
                template: curr.cloneNode(true),
                exp,      // Condition expression (null for v-else)
                type,     // 'v-if', 'v-else-if', or 'v-else'
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
                if (b.type === 'v-else' || evalExp(b.exp, scope)) {
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

    // Skip orphaned else branches (already processed with their v-if)
    if (el.hasAttribute('v-else-if') || el.hasAttribute('v-else')) return;

    // -------------------------------------------------------------------------
    // V-FOR - List rendering
    // -------------------------------------------------------------------------
    // Syntax: v-for="item in items"
    //         v-for="(item, index) in items"
    //
    // :key recommended for efficient updates
    // Each item gets its own scope with item and index variables
    // Objects are automatically wrapped in reactive()
    // Primitives are wrapped in ref() (auto-unwrapped in templates)
    // Index is a plain number that updates when array changes
    // -------------------------------------------------------------------------
    if (el.hasAttribute('v-for')) {
        const rawFor = el.getAttribute('v-for');

        // Parse v-for expression: "(item, index) in items" or "item in items"
        const m = rawFor.match(/^\s*(?:\((\w+)\s*,\s*(\w+)\)|(\w+))\s+(?:in|of)\s+(.*)$/);
        const itemName = m?.[1] || m?.[3] || 'item';
        const indexName = m?.[2] || 'index';
        const listExp = m?.[4] || rawFor.split(/\s+(?:in|of)\s+/)[1]?.trim() || rawFor;

        const parent = el.parentNode;
        if (!parent) return;

        // Create placeholder and remove template element
        const ph = document.createComment('v-for');
        parent.insertBefore(ph, el);
        el.remove();
        el.removeAttribute('v-for');

        // Get key attribute for efficient diffing
        const keyAttr = el.getAttribute(':key');
        if (keyAttr) el.removeAttribute(':key');

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
                    // Marks this ref as v-for's own bookkeeping box, not a
                    // user-declared ref - see the event-handler unwrap logic
                    // above for why that distinction matters.
                    itemRef._isVForItem = true;
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
    // COMPONENTS - <tag-name> matching a registered app.component()
    // -------------------------------------------------------------------------
    // Every attribute on the tag becomes a prop (dynamic :attr ones stay
    // reactively in sync with the parent). Unlike v-if/v-for branches, the
    // component's scope does NOT inherit the parent scope - only props and
    // whatever setup() returns, so components are actually encapsulated.
    // -------------------------------------------------------------------------
    const compDef = getComponent(el.tagName.toLowerCase());
    if (compDef) {
        // Rendered as children of the tag itself, not a sibling replacement -
        // v-for compiles its item clones *before* they're attached to a
        // parent (it inserts them into the DOM afterward), so anything here
        // that depended on el.parentNode would silently do nothing for a
        // component used as a v-for item template.
        const props = reactive({});
        const childScope = new Scope(props);
        cs.addChild(childScope);

        for (const { name, value } of [...el.attributes]) {
            // kebab-case -> camelCase (Vue's own convention): HTML attribute
            // names can't contain the characters a JS identifier needs, and
            // prop keys end up as evalExp's Function() parameter names, so
            // e.g. "static-attr" would otherwise throw a SyntaxError there.
            const key = (name.startsWith(':') ? name.slice(1) : name)
                .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
            if (name.startsWith(':')) {
                childScope.addEffect(watchEffect(() => {
                    props[key] = evalExp(value, scope);
                }));
            } else {
                props[key] = value;
            }
            el.removeAttribute(name);
        }

        if (compDef.setup) {
            const setupResult = compDef.setup(props);
            if (setupResult) Object.assign(props, setupResult);
        }

        el.innerHTML = compDef.template;
        [...el.childNodes].forEach(n => compile(n, childScope.data, childScope));

        runHooks('afterCompile', el, scope, cs);
        return;
    }

    // -------------------------------------------------------------------------
    // DIRECTIVES - Process element attributes
    // -------------------------------------------------------------------------
    for (const { name, value } of [...el.attributes]) {

        // ---------------------------------------------------------------------
        // EVENT BINDING: @event or v-on:event, with dot modifiers
        // ---------------------------------------------------------------------
        // Examples: @click="handler"  @click.prevent.self="handler"
        //           v-on:submit.prevent="save"  @keyup.enter="submit"
        // Handler can be a method name or inline expression
        // Event object available as 'e' in inline expressions
        //
        // Modifiers: .prevent .stop .once .self .capture .passive are
        // structural. Any other modifier is treated as a key filter and
        // matched against e.key (lowercased), e.g. .enter matches "Enter".
        // ---------------------------------------------------------------------
        if (name.startsWith('@') || name.startsWith('v-on:')) {
            const raw = name[0] === '@' ? name.slice(1) : name.slice(5);
            const [ev, ...mods] = raw.split('.');
            el.removeAttribute(name);

            const keyMods = mods.filter(m => !STRUCTURAL_MODS.has(m));
            const opts = {};
            if (mods.includes('capture')) opts.capture = true;
            if (mods.includes('passive')) opts.passive = true;
            if (mods.includes('once')) opts.once = true;

            const fn = e => {
                if (mods.includes('self') && e.target !== el) return;
                if (keyMods.length && !keyMods.some(m => e.key?.toLowerCase() === m)) return;
                if (mods.includes('prevent')) e.preventDefault();
                if (mods.includes('stop')) e.stopPropagation();

                // If value is a function name in scope, call it
                if (typeof scope[value] === 'function') {
                    scope[value](e);
                } else {
                    // Otherwise evaluate as expression
                    try {
                        const keys = Object.keys(scope);
                        // Object-valued refs unwrap (mutating .name etc. works,
                        // since objects are shared by reference), and so do
                        // v-for's own primitive item refs (they're internal
                        // bookkeeping to keep the binding live across renders -
                        // never meant to be reassigned via this variable, so
                        // there's nothing lost by handing out the raw value).
                        // A user-declared primitive ref stays boxed:
                        // `count.value++` still needs .value, since a bare
                        // number can't carry the write back to the ref.
                        const vals = keys.map(k => {
                            const v = scope[k];
                            return v?._isRef && (isObj(v.value) || v._isVForItem) ? v.value : v;
                        });
                        Function(...keys, 'e', `"use strict";${value}`)(...vals, e);
                    } catch (err) {
                        console.error?.('Event error:', err);
                        runHooks('onError', err, 'event', { name, value });
                    }
                }
            };

            el.addEventListener(ev, fn, opts);
            cs.addListener(el, ev, fn, opts.capture);
        }

        // ---------------------------------------------------------------------
        // ATTRIBUTE BINDING: :attr or v-bind:attr
        // ---------------------------------------------------------------------
        // :attr="exp"   - Bind any attribute
        // :class="obj"  - Object syntax for classes { active: isActive }
        // :style="obj"  - Object syntax for styles { color: 'red' }
        // ---------------------------------------------------------------------
        else if (name.startsWith(':') || name.startsWith('v-bind:')) {
            const attr = name[0] === ':' ? name.slice(1) : name.slice(7);
            el.removeAttribute(name);

            // Preserve static classes for merging
            const staticClass = attr === 'class' ? (el.getAttribute('class') || '') : '';

            cs.addEffect(watchEffect(() => {
                const res = evalExp(value, scope);

                if (attr === 'style' && isObj(res)) {
                    // Object style binding: :style="{ color: 'red' }"
                    Object.assign(el.style, res);
                }
                else if (attr === 'class') {
                    // Class binding - supports string, object, or array
                    // Object: :class="{ active: isActive, error: hasError }"
                    // Array:  :class="[baseClass, { active: isActive }]"
                    // String: :class="'btn ' + btnType"
                    el.setAttribute('class', (staticClass + ' ' + resolveClass(res)).trim());
                }
                else {
                    // Generic attribute binding
                    if (typeof res === 'boolean') {
                        // Boolean attributes: :disabled="isDisabled"
                        res ? el.setAttribute(attr, '') : el.removeAttribute(attr);
                    } else if (res == null) {
                        el.removeAttribute(attr);
                    } else {
                        el.setAttribute(attr, res);
                    }
                }
            }));
        }

        // ---------------------------------------------------------------------
        // NAMED DIRECTIVES: v-xxx[:arg][.modifier...] (registry lookup)
        // ---------------------------------------------------------------------
        // v-model, v-show, v-text are built in (core-directives.js); anything
        // else (e.g. v-html) is only available if a plugin registered it via
        // api.directive(name, handler).
        //
        // Matches Vue's own custom-directive shape: v-tooltip:top.instant="x"
        // gives the handler arg="top" and modifiers={instant:true} - the same
        // dot-split idea @event.modifier already uses, just applied to the
        // directive name too.
        // ---------------------------------------------------------------------
        else if (name.startsWith('v-')) {
            const [nameAndArg, ...modifierParts] = name.slice(2).split('.');
            const [dirName, arg] = nameAndArg.split(':');
            const modifiers = Object.fromEntries(modifierParts.map(m => [m, true]));
            el.removeAttribute(name);

            const handler = getDirective(dirName);
            if (handler) {
                handler(el, value, { scope, cs, evalExp, watchEffect, ref, reactive, arg, modifiers });
            } else {
                console.error?.(`Unknown directive: v-${dirName}`);
                runHooks('onError', new Error(`Unknown directive: v-${dirName}`), 'compile', { el, name });
            }
        }
    }

    // Recursively compile children
    [...el.childNodes].forEach(child => compile(child, scope, cs));

    runHooks('afterCompile', el, scope, cs);
};

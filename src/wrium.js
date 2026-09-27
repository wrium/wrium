/**
 * Wrium - Minimal reactive framework
 *
 * A lightweight Vue-inspired reactive framework for small to medium projects.
 * Provides reactivity, template binding, and directives without build steps.
 *
 * Features:
 * - Reactive state with ref() (any value) and reactive() (objects/arrays)
 * - Computed properties with computed()
 * - Template interpolation {{ expression }}
 * - Directives: v-if, v-else-if, v-else, v-for, v-model, v-show, v-text
 * - Event binding: @event or v-on:event, with .prevent/.stop/.once/.self/
 *   .capture/.passive and key modifiers (e.g. @keyup.enter)
 * - Attribute binding: :attr or v-bind:attr
 * - Directive registry + plugin system for extensibility (e.g. v-html
 *   ships as an opt-in plugin, see ./plugins/html.js)
 *
 * @example
 * // Basic usage
 * import { createApp, ref, reactive } from './wrium.js';
 *
 * createApp(() => ({
 *   count: ref(0),
 *   items: reactive([{ name: 'Item 1' }]),
 *   increment() { this.count.value++ }
 * })).mount('#app');
 *
 * @license MIT
 *
 * This file is the public entry point. Implementation lives in:
 * - ./core/dep.js, ./core/effect.js  - dependency tracking & effect scheduling
 * - ./core/reactive.js               - reactive()
 * - ./core/ref.js                    - ref()
 * - ./core/computed.js               - computed()
 * - ./scope.js                       - Scope (effect/listener/child lifecycle)
 * - ./hooks.js                       - plugin hook system
 * - ./directives.js                  - directive registry (registerDirective/getDirective)
 * - ./core-directives.js             - built-in v-model/v-show/v-text, registered like any plugin
 * - ./expression.js                  - template expression evaluation
 * - ./compiler.js                    - directive/template compiler
 * - ./app.js                         - createApp()
 * - ./next-tick.js                   - nextTick()
 * - ./plugins/html.js                - optional v-html directive (app.use(HtmlPlugin))
 */
export { ref } from './core/ref.js';
export { reactive } from './core/reactive.js';
export { computed } from './core/computed.js';
export { watchEffect } from './core/effect.js';
export { onHook } from './hooks.js';
export { nextTick } from './next-tick.js';
export { createApp } from './app.js';

/**
 * Zog.js v0.4.10 - Minimal reactive framework
 *
 * A lightweight Vue-inspired reactive framework for small to medium projects.
 * Provides reactivity, template binding, and directives without build steps.
 *
 * Features:
 * - Reactive state with ref() and reactive()
 * - Computed properties with computed()
 * - Template interpolation {{ expression }}
 * - Directives: z-if, z-else-if, z-else, z-for, z-model, z-show, z-text, z-html
 * - Event binding: @event or z-on:event
 * - Attribute binding: :attr or z-bind:attr
 * - Plugin system for extensibility
 *
 * @example
 * // Basic usage
 * import { createApp, ref, reactive } from './zog.js';
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
 * - ./expression.js                  - template expression evaluation
 * - ./compiler.js                    - directive/template compiler
 * - ./app.js                         - createApp()
 * - ./next-tick.js                   - nextTick()
 */
export { ref } from './core/ref.js';
export { reactive } from './core/reactive.js';
export { computed } from './core/computed.js';
export { watchEffect } from './core/effect.js';
export { onHook } from './hooks.js';
export { nextTick } from './next-tick.js';
export { createApp } from './app.js';

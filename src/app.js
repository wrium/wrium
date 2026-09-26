/**
 * APPLICATION
 * ===========
 * createApp() creates an application instance that can be mounted to the DOM.
 * Supports plugin system for extensibility.
 */
import { Scope, setCurrentScope } from './scope.js';
import { compile } from './compiler.js';
import { reactive } from './core/reactive.js';
import { ref } from './core/ref.js';
import { computed } from './core/computed.js';
import { watchEffect } from './core/effect.js';
import { onHook, runHooks } from './hooks.js';
import { evalExp } from './expression.js';
import { registerDirective } from './directives.js';

/**
 * Create a Wrium application
 *
 * @param {Function} setup - Setup function that returns reactive data
 * @returns {Object} App instance with mount(), unmount(), and use() methods
 *
 * @example
 * const app = createApp(() => ({
 *   count: ref(0),
 *   items: reactive([]),
 *   increment() { this.count.value++ }
 * }));
 *
 * app.use(myPlugin);
 * app.mount('#app');
 */
export const createApp = setup => {
    let rootScope = null;
    const appContext = { plugins: new Set() };

    return {
        /**
         * Install a plugin
         *
         * @param {Object} plugin - Plugin with install(api, options) method
         * @param {Object} options - Options to pass to plugin
         * @returns {Object} App instance for chaining
         *
         * @example
         * const myPlugin = {
         *   install(api, options) {
         *     api.directive('html', (el, exp, { scope, cs, watchEffect, evalExp }) => {
         *       cs.addEffect(watchEffect(() => { el.innerHTML = evalExp(exp, scope) ?? ''; }));
         *     });
         *   }
         * };
         * app.use(myPlugin, { debug: true });
         */
        use(plugin, options = {}) {
            if (appContext.plugins.has(plugin)) return this;
            if (typeof plugin.install !== 'function') {
                console.error?.('Plugin must have install method');
                return this;
            }

            // Provide API to plugin
            plugin.install({
                app: this,
                reactive, ref, computed, watchEffect,
                onHook, compile, Scope, evalExp,
                directive: registerDirective
            }, options);

            appContext.plugins.add(plugin);
            return this;
        },

        /**
         * Mount the app to a DOM element
         *
         * @param {string|Element} root - CSS selector or DOM element
         * @returns {Object} App instance for chaining
         *
         * @example
         * app.mount('#app');
         * app.mount(document.getElementById('app'));
         */
        mount(root) {
            const el = typeof root === 'string' ? document.querySelector(root) : root;
            if (!el) {
                console.error?.('Root not found:', root);
                return;
            }

            // Create root scope
            rootScope = new Scope({});
            setCurrentScope(rootScope);

            // Run setup function to get reactive data
            rootScope.data = setup?.() || {};
            setCurrentScope(null);

            // Compile the root element
            try {
                compile(el, rootScope.data, rootScope);
            } catch (err) {
                console.error?.('Compile error:', err);
                runHooks('onError', err, 'compile', { el });
            }

            return this;
        },

        /**
         * Unmount the app and clean up all effects and listeners
         */
        unmount() {
            rootScope?.cleanup();
            rootScope = null;
        }
    };
};

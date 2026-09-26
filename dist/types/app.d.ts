export type WriumPlugin = {
    install: (api: Object, options?: Object) => void;
};
export type App = {
    /**
     * - Install a plugin
     */
    use: (plugin: WriumPlugin, options?: Object) => App;
    /**
     * - Mount to a DOM element
     */
    mount: (root: string | Element) => App;
    /**
     * - Clean up all effects and listeners
     */
    unmount: () => void;
};
/**
 * @typedef {Object} WriumPlugin
 * @property {(api: Object, options?: Object) => void} install
 */
/**
 * @typedef {Object} App
 * @property {(plugin: WriumPlugin, options?: Object) => App} use - Install a plugin
 * @property {(root: string | Element) => App} mount - Mount to a DOM element
 * @property {() => void} unmount - Clean up all effects and listeners
 */
/**
 * Create a Wrium application
 *
 * @param {() => Object} setup - Setup function that returns reactive data
 * @returns {App} App instance with mount(), unmount(), and use() methods
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
export declare const createApp: (setup: () => Object) => App;

export type WriumPlugin = {
    install: (api: Object, options?: Object) => void;
};
export type ComponentDef = {
    /**
     * - HTML string for the component's own subtree
     */
    template: string;
    /**
     * - Receives the reactive
     * props object; whatever it returns is merged into the component's scope
     */
    setup?: (props: Object) => Object | void;
};
export type App = {
    /**
     * - Install a plugin
     */
    use: (plugin: WriumPlugin, options?: Object) => App;
    /**
     * - Register a reusable component under a tag name
     */
    component: (name: string, def: ComponentDef) => App;
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
 * @typedef {Object} ComponentDef
 * @property {string} template - HTML string for the component's own subtree
 * @property {(props: Object) => Object|void} [setup] - Receives the reactive
 *   props object; whatever it returns is merged into the component's scope
 */
/**
 * @typedef {Object} App
 * @property {(plugin: WriumPlugin, options?: Object) => App} use - Install a plugin
 * @property {(name: string, def: ComponentDef) => App} component - Register a reusable component under a tag name
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

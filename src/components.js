/**
 * COMPONENT REGISTRY
 * ==================
 * Minimal component system: a named, reusable template + setup(props) pair,
 * used in markup as a custom tag (`<my-sidebar :active="page">`). Mirrors
 * the directive registry (directives.js) - same "just a Map" shape.
 *
 * Deliberately small scope for v1: props flow down (reactive, kept in sync
 * with the parent), and a function-valued prop doubles as an "emit" (the
 * child just calls it) - no separate slots/emit API. The component's scope
 * is isolated: it does NOT inherit the parent's scope like v-if/v-for
 * branches do, only what's passed as props plus whatever setup() returns.
 */

const registry = new Map();

/**
 * Register a component under a kebab-case tag name (e.g. 'my-sidebar').
 * Browsers always report element tag names in this normalized lowercase
 * form, so component names must be written the same way in markup:
 * `<my-sidebar>`, not `<MySidebar>`.
 *
 * @param {string} name - Tag name the component is used under
 * @param {{ template: string, setup?: (props: Object) => Object|void }} def
 */
export const registerComponent = (name, def) => {
    registry.set(name, def);
};

/**
 * Look up a registered component by tag name.
 * @param {string} name
 * @returns {{ template: string, setup?: Function }|undefined}
 */
export const getComponent = name => registry.get(name);

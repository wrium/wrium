/**
 * Scope - Manages lifecycle of a reactive region
 * Tracks effects, event listeners, and child scopes for proper cleanup.
 * Each v-if branch and v-for item gets its own scope.
 */
export class Scope {
    /**
     * @param {Object} data - The reactive data for this scope
     */
    constructor(data) {
        this.data = data;       // Reactive data object
        this.effects = [];      // Stop functions for effects
        this.listeners = [];    // Event listeners to remove
        this.children = [];     // Child scopes (v-if, v-for items)
    }

    /**
     * Register an effect's stop function for cleanup
     * @param {Function} stop - Function to stop the effect
     */
    addEffect(stop) {
        this.effects.push(stop);
    }

    /**
     * Register an event listener for cleanup
     * @param {Element} el - The DOM element
     * @param {string} ev - Event name
     * @param {Function} fn - Event handler
     * @param {boolean} [capture] - Must match the `capture` option the
     *   listener was added with, or removeEventListener won't find it
     */
    addListener(el, ev, fn, capture = false) {
        this.listeners.push({ el, ev, fn, capture });
    }

    /**
     * Register a child scope
     * @param {Scope} child - The child scope
     */
    addChild(child) {
        this.children.push(child);
    }

    /**
     * Remove a child scope
     * @param {Scope} child - The child scope to remove
     */
    removeChild(child) {
        this.children = this.children.filter(c => c !== child);
    }

    /**
     * Clean up this scope and all children
     * Stops all effects and removes all event listeners
     */
    cleanup() {
        // Recursively clean up children first
        this.children.forEach(c => c.cleanup());
        this.children.length = 0;

        // Stop all effects
        this.effects.forEach(stop => stop?.());
        this.effects.length = 0;

        // Remove all event listeners
        this.listeners.forEach(({ el, ev, fn, capture }) => el.removeEventListener(ev, fn, capture));
        this.listeners.length = 0;
    }
}

/**
 * Current scope, used by watchEffect() to auto-register its stop function
 * with whichever scope is being compiled (set by createApp/compile).
 */
let currentScope = null;

export const getCurrentScope = () => currentScope;
export const setCurrentScope = s => { currentScope = s; };

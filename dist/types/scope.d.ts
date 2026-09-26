/**
 * Scope - Manages lifecycle of a reactive region
 * Tracks effects, event listeners, and child scopes for proper cleanup.
 * Each v-if branch and v-for item gets its own scope.
 */
export declare class Scope {
    data: Object;
    effects: any[];
    listeners: any[];
    children: any[];
    /**
     * @param {Object} data - The reactive data for this scope
     */
    constructor(data: Object);
    /**
     * Register an effect's stop function for cleanup
     * @param {Function} stop - Function to stop the effect
     */
    addEffect(stop: Function): void;
    /**
     * Register an event listener for cleanup
     * @param {Element} el - The DOM element
     * @param {string} ev - Event name
     * @param {Function} fn - Event handler
     * @param {boolean} [capture] - Must match the `capture` option the
     *   listener was added with, or removeEventListener won't find it
     */
    addListener(el: Element, ev: string, fn: Function, capture?: boolean): void;
    /**
     * Register a child scope
     * @param {Scope} child - The child scope
     */
    addChild(child: Scope): void;
    /**
     * Remove a child scope
     * @param {Scope} child - The child scope to remove
     */
    removeChild(child: Scope): void;
    /**
     * Clean up this scope and all children
     * Stops all effects and removes all event listeners
     */
    cleanup(): void;
}
export declare const getCurrentScope: () => any;
export declare const setCurrentScope: (s: any) => void;

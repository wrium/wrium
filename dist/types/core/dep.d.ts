/**
 * Dependency tracker class
 * Each reactive property has its own Dep instance to track which effects depend on it
 */
export declare class Dep {
    /** Set of effects that depend on this value */
    subs: Set<any>;
    /**
     * Track the current effect as a subscriber
     * Called when a reactive value is READ
     */
    depend(): void;
    /**
     * Notify all subscribers that the value has changed
     * Called when a reactive value is WRITTEN
     */
    notify(): void;
}

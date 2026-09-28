/**
 * DEPENDENCY TRACKER
 * ==================
 * The reactivity system is based on the Observer pattern.
 * When a reactive value is read, the current effect is tracked as a subscriber.
 * When the value changes, all subscribers are notified to re-run.
 */
import { activeEffect, queueEffect } from './effect.js';

/**
 * Dependency tracker class
 * Each reactive property has its own Dep instance to track which effects depend on it
 */
export class Dep {
    /** Set of effects that depend on this value */
    subs = new Set();

    /**
     * Track the current effect as a subscriber
     * Called when a reactive value is READ
     */
    depend() {
        if (activeEffect && !this.subs.has(activeEffect)) {
            this.subs.add(activeEffect);
            activeEffect.deps.push(this);
        }
    }

    /**
     * Notify all subscribers that the value has changed
     * Called when a reactive value is WRITTEN
     */
    notify() {
        // Create a copy to avoid issues if subs is modified during iteration
        new Set(this.subs).forEach(e => {
            if (e !== activeEffect) e.scheduler ? e.scheduler(e.run.bind(e)) : queueEffect(e);
        });
    }
}

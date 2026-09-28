/**
 * Shared low-level helpers used across the reactivity core and the compiler.
 */

/** Check if a value is a non-null object (includes arrays) */
export const isObj = v => v && typeof v === 'object';

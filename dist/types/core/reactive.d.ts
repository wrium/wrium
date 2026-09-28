/** Symbol to check if an object is already reactive */
export declare const IS_REACTIVE: unique symbol;
/**
 * Create a deeply reactive proxy for an object or array
 *
 * @template {object} T
 * @param {T} target - The object to make reactive
 * @returns {T} A reactive proxy of the object (same shape as the input)
 *
 * @example
 * const state = reactive({
 *   user: { name: 'John' },
 *   items: [1, 2, 3]
 * });
 * state.user.name = 'Jane'; // Triggers updates
 * state.items.push(4);      // Triggers updates
 */
export declare const reactive: <T extends object>(target: T) => T;

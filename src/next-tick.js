/**
 * Execute a function after DOM updates are flushed.
 * Useful when you need to access updated DOM after reactive changes.
 *
 * @param {Function} fn - Function to execute
 * @returns {Promise} Promise that resolves after execution
 *
 * @example
 * count.value++;
 * nextTick(() => {
 *   console.log(document.querySelector('#count').textContent);
 * });
 */
export const nextTick = fn => Promise.resolve().then(fn);

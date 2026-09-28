/**
 * Password strength plugin.
 *
 * Written to depend on nothing but the `api` object a plugin receives at
 * install time - no reach into wrium's own src/ internals - so it can be
 * lifted into its own standalone package/repo later without changes.
 *
 * @example
 * import { createApp } from '@wrium/wrium';
 * import { PasswordStrengthPlugin } from '@wrium/wrium/plugins/password-strength';
 *
 * createApp(() => {
 *     const strength = ref(null);
 *     return { strength };
 * })
 *     .use(PasswordStrengthPlugin, { minLength: 10, minScore: 'good' })
 *     .mount('#app');
 *
 * <input type="password" v-password-strength="strength" />
 * <p>{{ strength?.label }}</p>
 */
/** A deliberately short, well-known list - this flags the obvious cases, it is not a breach-database lookup. */
export declare const DEFAULT_COMMON_PASSWORDS: Set<string>;
/**
 * Assess a password's strength. Pure function - no DOM, no reactivity -
 * usable standalone (e.g. for server-side-style re-validation) as well as
 * through the v-password-strength directive below.
 *
 * @param {string} password
 * @param {Object} [options]
 * @param {number} [options.minLength] - Length considered a baseline (default 8)
 * @param {'weak'|'fair'|'good'|'strong'} [options.minScore] - Minimum label
 *   for `valid` to be true (default 'fair')
 * @param {Set<string>|string[]} [options.commonPasswords] - Overrides the
 *   built-in blocklist entirely (merge with DEFAULT_COMMON_PASSWORDS yourself
 *   if you want to extend rather than replace it)
 * @returns {{ label: string, valid: boolean, reasons: string[] }}
 */
export declare function assessPassword(password: string, options?: {
    minLength?: number;
    minScore?: 'weak' | 'fair' | 'good' | 'strong';
    commonPasswords?: Set<string> | string[];
}): {
    label: string;
    valid: boolean;
    reasons: string[];
};
/**
 * v-password-strength="someRef" - assesses the element's live value on every
 * input and writes the result into someRef (which must be a ref()), the same
 * write-back pattern the core v-model directive uses.
 */
export declare const PasswordStrengthPlugin: {
    install(api: any, options?: {}): void;
};

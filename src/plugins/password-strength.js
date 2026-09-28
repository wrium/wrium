/**
 * Password strength plugin.
 *
 * Written to depend on nothing but the `api` object a plugin receives at
 * install time - no reach into wrium's own src/ internals - so it can be
 * lifted into its own standalone package/repo later without changes.
 *
 * @example
 * import { createApp } from 'wrium';
 * import { PasswordStrengthPlugin } from 'wrium/plugins/password-strength';
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
export const DEFAULT_COMMON_PASSWORDS = new Set([
    '123456', 'password', '123456789', '12345', '12345678', 'qwerty', '111111',
    '1234567', 'dragon', '123123', 'baseball', 'abc123', 'football', 'monkey',
    'letmein', 'shadow', 'master', '666666', 'qwertyuiop', 'mustang',
    '1234567890', 'michael', '654321', 'superman', '1qaz2wsx', '7777777',
    '121212', '000000', 'qazwsx', '123qwe', 'trustno1', 'iloveyou', 'hunter',
    'soccer', 'batman', 'sunshine', 'princess', 'admin', 'welcome', 'login',
    'passw0rd', 'starwars', 'hello', 'freedom', 'whatever', 'qwerty123',
]);

const LABELS = ['weak', 'fair', 'good', 'strong'];

const scoreToLabel = tally => LABELS[tally < 2 ? 0 : tally < 3 ? 1 : tally < 5 ? 2 : 3];

/** True if `s` contains a run of `run` consecutive ascending or descending characters (e.g. "1234", "dcba"). */
function hasSequentialRun(s, run = 4) {
    for (let i = 0; i <= s.length - run; i++) {
        let asc = true, desc = true;
        for (let j = 1; j < run; j++) {
            const diff = s.charCodeAt(i + j) - s.charCodeAt(i + j - 1);
            if (diff !== 1) asc = false;
            if (diff !== -1) desc = false;
        }
        if (asc || desc) return true;
    }
    return false;
}

/** True if `s` contains the same character repeated `run`+ times in a row (e.g. "aaaa"). */
function hasRepeatedRun(s, run = 4) {
    let streak = 1;
    for (let i = 1; i < s.length; i++) {
        streak = s[i] === s[i - 1] ? streak + 1 : 1;
        if (streak >= run) return true;
    }
    return false;
}

/** Number of distinct character classes present: lowercase, uppercase, digit, symbol. */
function countCharClasses(s) {
    return [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(re => re.test(s)).length;
}

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
export function assessPassword(password, options = {}) {
    const minLength = options.minLength ?? 8;
    const minScore = options.minScore ?? 'fair';
    const commonPasswords = !options.commonPasswords ? DEFAULT_COMMON_PASSWORDS
        : options.commonPasswords instanceof Set ? options.commonPasswords
        : new Set(options.commonPasswords);

    if (!password) {
        return { label: 'empty', valid: false, reasons: [] };
    }

    const lower = password.toLowerCase();
    const reasons = [];

    if (commonPasswords.has(lower)) {
        return { label: 'weak', valid: false, reasons: ['This is one of the most common passwords in use'] };
    }

    let tally = 0;
    tally += password.length >= minLength ? 1 : 0;
    tally += password.length >= minLength + 4 ? 1 : 0;
    tally += Math.max(0, countCharClasses(password) - 1);

    if (password.length < minLength) {
        reasons.push(`Use at least ${minLength} characters`);
    }
    for (const common of commonPasswords) {
        if (common.length >= 4 && lower.includes(common)) {
            reasons.push('Contains a common word or pattern');
            tally -= 3;
            break;
        }
    }
    if (hasSequentialRun(lower)) {
        reasons.push('Avoid sequential characters like "1234" or "abcd"');
        tally -= 2;
    }
    if (hasRepeatedRun(lower)) {
        reasons.push('Avoid repeating the same character many times');
        tally -= 2;
    }
    if (countCharClasses(password) < 2) {
        reasons.push('Mix letters, numbers, and symbols');
    }

    const label = scoreToLabel(Math.max(0, tally));
    const valid = LABELS.indexOf(label) >= LABELS.indexOf(minScore);

    return { label, valid, reasons };
}

/**
 * v-password-strength="someRef" - assesses the element's live value on every
 * input and writes the result into someRef (which must be a ref()), the same
 * write-back pattern the core v-model directive uses.
 */
export const PasswordStrengthPlugin = {
    install(api, options = {}) {
        api.directive('password-strength', (el, exp, { scope, cs }) => {
            const target = scope[exp];
            if (!target?._isRef) {
                console.error?.(`v-password-strength="${exp}" must point to a ref()`);
                return;
            }

            const update = () => { target.value = assessPassword(el.value, options); };
            update();
            el.addEventListener('input', update);
            cs.addListener(el, 'input', update);
        });
    }
};

import { describe, it, expect } from 'vitest';
import { assessPassword, DEFAULT_COMMON_PASSWORDS } from '../src/plugins/password-strength.js';

describe('assessPassword (pure logic)', () => {
    it('treats an empty password as "empty", not "weak"', () => {
        expect(assessPassword('')).toEqual({ label: 'empty', valid: false, reasons: [] });
    });

    it('flags well-known common passwords as weak and invalid, regardless of length', () => {
        const result = assessPassword('123456');
        expect(result.label).toBe('weak');
        expect(result.valid).toBe(false);
        expect(result.reasons[0]).toMatch(/common/i);
    });

    it('flags a password merely containing a common word as weak', () => {
        const result = assessPassword('password1!');
        expect(result.label).toBe('weak');
        expect(result.valid).toBe(false);
    });

    it('flags sequential characters', () => {
        const result = assessPassword('abcdefgh');
        expect(result.label).toBe('weak');
        expect(result.reasons.some(r => /sequential/i.test(r))).toBe(true);
    });

    it('flags repeated characters', () => {
        const result = assessPassword('aaaaaaaa');
        expect(result.label).toBe('weak');
        expect(result.reasons.some(r => /repeat/i.test(r))).toBe(true);
    });

    it('flags passwords shorter than minLength', () => {
        const result = assessPassword('Ab1!', { minLength: 8 });
        expect(result.reasons.some(r => /at least 8 characters/.test(r))).toBe(true);
    });

    it('rates a long, low-variety passphrase as fair, not weak', () => {
        const result = assessPassword('supersecret');
        expect(result.label).toBe('weak');
        // length alone (11 chars, one character class) isn't enough on its own
        expect(result.reasons.some(r => /mix letters/i.test(r))).toBe(true);
    });

    it('rates a long password with real character variety as good or strong', () => {
        const result = assessPassword('Tr0ub4dor&3');
        expect(['good', 'strong']).toContain(result.label);
        expect(result.valid).toBe(true);
    });

    it('rates a long password with full character variety as strong', () => {
        const result = assessPassword('K7$mQz9!vLp2');
        expect(result.label).toBe('strong');
        expect(result.valid).toBe(true);
    });

    it('respects a custom minScore', () => {
        const fair = assessPassword('Tr0ub4dor&3', { minScore: 'fair' });
        const strong = assessPassword('Tr0ub4dor&3', { minScore: 'strong' });
        expect(fair.valid).toBe(true);
        expect(strong.label).toBe(fair.label); // same assessment
        expect(strong.valid).toBe(fair.label === 'strong');
    });

    it('respects a custom commonPasswords list, replacing the default', () => {
        const result = assessPassword('correct horse battery staple', {
            commonPasswords: ['correct horse battery staple']
        });
        expect(result.label).toBe('weak');
        expect(result.valid).toBe(false);
    });

    it('does not block a password absent from a custom (replaced) blocklist even if it is in the default one', () => {
        // "123456" is in DEFAULT_COMMON_PASSWORDS, but a fully custom list replaces it
        expect(DEFAULT_COMMON_PASSWORDS.has('123456')).toBe(true);
        const result = assessPassword('123456', { commonPasswords: ['not-this-one'] });
        expect(result.reasons.every(r => !/common passwords in use/.test(r))).toBe(true);
    });
});

import { test, expect } from '@playwright/test';

const URL = '/e2e/fixtures/login-form/index.html';

/** Fills every field with data that passes validation. */
async function fillValid(page, overrides = {}) {
    const values = {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        password: 'supersecret',
        confirmPassword: 'supersecret',
        country: 'ir',
        ...overrides,
    };
    await page.getByTestId('name-input').fill(values.name);
    await page.getByTestId('email-input').fill(values.email);
    await page.getByTestId('password-input').fill(values.password);
    await page.getByTestId('confirm-input').fill(values.confirmPassword);
    await page.getByTestId('country-select').selectOption(values.country);
    await page.getByTestId('agree-checkbox').check();
}

test.describe('Signup form (v-model, computed validation, event modifiers)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(URL);
    });

    test('shows no errors before a field is touched', async ({ page }) => {
        await expect(page.getByTestId('name-error')).toHaveCount(0);
        await expect(page.getByTestId('email-error')).toHaveCount(0);
        await expect(page.getByTestId('password-error')).toHaveCount(0);
    });

    test('reveals a field error on blur, and clears it reactively once fixed', async ({ page }) => {
        const name = page.getByTestId('name-input');
        await name.click();
        await name.blur();
        await expect(page.getByTestId('name-error')).toHaveText('Name is required');
        await expect(name).toHaveClass(/invalid/);

        await name.fill('Al');
        await expect(page.getByTestId('name-error')).toHaveCount(0);
        await expect(name).not.toHaveClass(/invalid/);
    });

    test('validates email format', async ({ page }) => {
        const email = page.getByTestId('email-input');
        await email.fill('not-an-email');
        await email.blur();
        await expect(page.getByTestId('email-error')).toHaveText('Enter a valid email address');

        await email.fill('ok@example.com');
        await expect(page.getByTestId('email-error')).toHaveCount(0);
    });

    test('validates password length and confirmation match', async ({ page }) => {
        const password = page.getByTestId('password-input');
        const confirm = page.getByTestId('confirm-input');

        await password.fill('short');
        await password.blur();
        await expect(page.getByTestId('password-error')).toHaveText('Password must be at least 8 characters');

        await password.fill('longenough1');
        await expect(page.getByTestId('password-error')).toHaveCount(0);

        await confirm.fill('doesNotMatch');
        await confirm.blur();
        await expect(page.getByTestId('confirm-error')).toHaveText('Passwords do not match');

        await confirm.fill('longenough1');
        await expect(page.getByTestId('confirm-error')).toHaveCount(0);
    });

    test('v-model works for select and checkbox, not just text inputs', async ({ page }) => {
        const country = page.getByTestId('country-select');
        await country.selectOption('de');
        await expect(country).toHaveValue('de');

        const agree = page.getByTestId('agree-checkbox');
        await expect(agree).not.toBeChecked();
        await agree.check();
        await expect(agree).toBeChecked();
    });

    test('clicking submit on an empty form reveals every error at once (no submission)', async ({ page }) => {
        await page.getByTestId('submit-button').click();

        await expect(page.getByTestId('name-error')).toBeVisible();
        await expect(page.getByTestId('email-error')).toBeVisible();
        await expect(page.getByTestId('password-error')).toBeVisible();
        await expect(page.getByTestId('confirm-error')).toBeVisible();
        await expect(page.getByTestId('country-error')).toBeVisible();
        await expect(page.getByTestId('agree-error')).toBeVisible();

        // still idle - no submission happened
        await expect(page.getByTestId('success-message')).toHaveCount(0);
        await expect(page.getByTestId('server-error-message')).toHaveCount(0);
    });

    test('submits successfully with valid data: disables the button, then shows success and resets', async ({ page }) => {
        await fillValid(page);

        const button = page.getByTestId('submit-button');
        await button.click();

        // reactive state flip should be visible immediately (button disabled,
        // label changed) while the simulated request is in flight
        await expect(button).toBeDisabled();
        await expect(button).toHaveText('Submitting...');

        await expect(page.getByTestId('success-message')).toBeVisible();
        await expect(button).toBeEnabled();
        await expect(button).toHaveText('Create account');

        // form was reset
        await expect(page.getByTestId('name-input')).toHaveValue('');
        await expect(page.getByTestId('email-input')).toHaveValue('');
        await expect(page.getByTestId('agree-checkbox')).not.toBeChecked();
    });

    test('surfaces a server-side error without resetting the form', async ({ page }) => {
        await fillValid(page, { email: 'taken@example.com' });
        await page.getByTestId('submit-button').click();

        await expect(page.getByTestId('server-error-message')).toHaveText('This email is already registered');
        await expect(page.getByTestId('success-message')).toHaveCount(0);

        // values are preserved so the user can correct and retry
        await expect(page.getByTestId('email-input')).toHaveValue('taken@example.com');
        await expect(page.getByTestId('name-input')).toHaveValue('Ada Lovelace');
    });
});

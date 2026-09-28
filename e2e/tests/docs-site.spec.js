import { test, expect } from '@playwright/test';

const HOME_URL = '/e2e/fixtures/docs-site/index.html';
const GUIDE_URL = '/e2e/fixtures/docs-site/guide.html';

test.describe('Docs site (shared components across pages, v-pre)', () => {
    test('home page renders the shared header/footer with Home active', async ({ page }) => {
        await page.goto(HOME_URL);

        await expect(page.getByTestId('nav-home')).toHaveClass(/active/);
        await expect(page.getByTestId('nav-guide')).not.toHaveClass(/active/);
        await expect(page.locator('site-footer')).toContainText('Wrium v1.0.0');
    });

    test('guide page renders the same shared header/footer with Guide active', async ({ page }) => {
        await page.goto(GUIDE_URL);

        await expect(page.getByTestId('nav-home')).not.toHaveClass(/active/);
        await expect(page.getByTestId('nav-guide')).toHaveClass(/active/);
        await expect(page.locator('site-footer')).toContainText('Wrium v1.0.0');
    });

    test('clicking the nav links navigates between the two real pages', async ({ page }) => {
        await page.goto(HOME_URL);

        await page.getByTestId('nav-guide').click();
        await expect(page).toHaveURL(/guide\.html$/);
        await expect(page.getByRole('heading', { name: 'Guide' })).toBeVisible();

        await page.getByTestId('nav-home').click();
        await expect(page).toHaveURL(/index\.html$/);
        await expect(page.getByRole('heading', { name: 'Wrium' })).toBeVisible();
    });

    test('the live counter demo on the home page is actually reactive', async ({ page }) => {
        await page.goto(HOME_URL);

        await expect(page.getByTestId('count-display')).toHaveText('Count: 0');
        await page.getByTestId('increment-button').click();
        await page.getByTestId('increment-button').click();
        await expect(page.getByTestId('count-display')).toHaveText('Count: 2');
    });

    test('the live item counter on the guide page is actually reactive', async ({ page }) => {
        await page.goto(GUIDE_URL);

        await expect(page.getByTestId('todo-count')).toHaveText('Items left: 3');
        await page.getByTestId('add-item-button').click();
        await expect(page.getByTestId('todo-count')).toHaveText('Items left: 4');
    });

    test('v-pre leaves the code sample as literal text on the home page', async ({ page }) => {
        await page.goto(HOME_URL);

        const sample = page.getByTestId('code-sample');
        await expect(sample).toContainText('{{ count }}');
        await expect(sample).toContainText("@click=\"count.value++\"");
    });

    test('v-pre leaves the code sample as literal text on the guide page', async ({ page }) => {
        await page.goto(GUIDE_URL);

        const sample = page.getByTestId('code-sample');
        await expect(sample).toContainText('v-for="item in items"');
        await expect(sample).toContainText('{{ item.text }}');
    });
});

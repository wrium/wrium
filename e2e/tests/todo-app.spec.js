import { test, expect } from '@playwright/test';

const URL = '/e2e/fixtures/todo-app/index.html';

async function addTodo(page, text) {
    const input = page.getByTestId('new-todo-input');
    await input.fill(text);
    await input.press('Enter');
}

test.describe('Todo app (v-for + :key, reactive array/object mutation, computed, filters)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(URL);
    });

    test('shows the empty state with no todos', async ({ page }) => {
        await expect(page.getByTestId('empty-state')).toBeVisible();
        await expect(page.getByTestId('remaining-count')).toHaveCount(0);
    });

    test('adds todos via Enter and updates the remaining count', async ({ page }) => {
        await addTodo(page, 'Buy milk');
        await addTodo(page, 'Walk the dog');

        await expect(page.getByTestId('empty-state')).toHaveCount(0);
        await expect(page.locator('.todo-list li')).toHaveCount(2);
        await expect(page.getByTestId('remaining-count')).toHaveText('2 item(s) left');

        // the input is cleared after each add (newTodo.value = '')
        await expect(page.getByTestId('new-todo-input')).toHaveValue('');
    });

    test('ignores empty/whitespace-only submissions', async ({ page }) => {
        const input = page.getByTestId('new-todo-input');
        await input.fill('   ');
        await input.press('Enter');
        await expect(page.getByTestId('empty-state')).toBeVisible();
    });

    test('toggling a todo updates its style and the remaining count reactively', async ({ page }) => {
        await addTodo(page, 'Buy milk');
        await addTodo(page, 'Walk the dog');
        const [id1] = await page.locator('.todo-list li').evaluateAll(els => els.map(el => el.dataset.testid));

        await page.getByTestId(id1.replace('todo-', 'toggle-')).check();

        await expect(page.getByTestId(id1)).toHaveClass(/completed/);
        await expect(page.getByTestId('remaining-count')).toHaveText('1 item(s) left');
    });

    test('removes a todo', async ({ page }) => {
        await addTodo(page, 'Buy milk');
        await addTodo(page, 'Walk the dog');

        await page.locator('.todo-list li').first().getByRole('button', { name: '×' }).click();

        await expect(page.locator('.todo-list li')).toHaveCount(1);
        await expect(page.locator('.todo-list li')).toHaveText(/Walk the dog/);
    });

    test('filters: All / Active / Completed', async ({ page }) => {
        await addTodo(page, 'Buy milk');
        await addTodo(page, 'Walk the dog');
        await addTodo(page, 'Ship Wrium v1');

        // mark the first one done
        await page.locator('.todo-list li').first().locator('input[type="checkbox"]').check();

        await page.getByTestId('filter-active').click();
        await expect(page.locator('.todo-list li')).toHaveCount(2);

        await page.getByTestId('filter-completed').click();
        await expect(page.locator('.todo-list li')).toHaveCount(1);
        await expect(page.locator('.todo-list li')).toHaveText(/Buy milk/);

        await page.getByTestId('filter-all').click();
        await expect(page.locator('.todo-list li')).toHaveCount(3);
    });

    test('toggle-all marks every todo done, and unmarks them on a second click', async ({ page }) => {
        await addTodo(page, 'Buy milk');
        await addTodo(page, 'Walk the dog');

        await page.getByTestId('toggle-all').check();
        for (const cb of await page.locator('.todo-list input[type="checkbox"]').all()) {
            await expect(cb).toBeChecked();
        }
        await expect(page.getByTestId('remaining-count')).toHaveText('0 item(s) left');

        await page.getByTestId('toggle-all').click();
        for (const cb of await page.locator('.todo-list input[type="checkbox"]').all()) {
            await expect(cb).not.toBeChecked();
        }
    });

    test('clear completed removes only done todos, and hides itself when none are done', async ({ page }) => {
        await addTodo(page, 'Buy milk');
        await addTodo(page, 'Walk the dog');
        await expect(page.getByTestId('clear-completed')).toHaveCount(0);

        await page.locator('.todo-list li').first().locator('input[type="checkbox"]').check();
        await expect(page.getByTestId('clear-completed')).toBeVisible();

        await page.getByTestId('clear-completed').click();
        await expect(page.locator('.todo-list li')).toHaveCount(1);
        await expect(page.getByTestId('clear-completed')).toHaveCount(0);
    });

    test('editing: double-click enters edit mode, Enter saves the new text', async ({ page }) => {
        await addTodo(page, 'Buy milk');
        const label = page.locator('.todo-list li label');

        await label.dblclick();
        const editInput = page.locator('.todo-list li .edit-wrap input');
        await expect(editInput).toBeVisible();
        await expect(editInput).toHaveValue('Buy milk');

        await editInput.fill('Buy oat milk');
        await editInput.press('Enter');

        await expect(editInput).toHaveCount(0);
        await expect(label).toHaveText('Buy oat milk');
    });

    test('editing: Escape cancels without saving', async ({ page }) => {
        await addTodo(page, 'Buy milk');
        const label = page.locator('.todo-list li label');

        await label.dblclick();
        const editInput = page.locator('.todo-list li .edit-wrap input');
        await editInput.fill('this should not be saved');
        await editInput.press('Escape');

        await expect(editInput).toHaveCount(0);
        await expect(label).toHaveText('Buy milk');
    });

    test('editing: blurring the edit input saves it too', async ({ page }) => {
        await addTodo(page, 'Buy milk');
        const label = page.locator('.todo-list li label');

        await label.dblclick();
        const editInput = page.locator('.todo-list li .edit-wrap input');
        await editInput.fill('Buy soy milk');
        await page.getByTestId('new-todo-input').click(); // blur by focusing elsewhere

        await expect(editInput).toHaveCount(0);
        await expect(label).toHaveText('Buy soy milk');
    });

    test('editing: clearing the text and saving removes the todo', async ({ page }) => {
        await addTodo(page, 'Buy milk');
        const label = page.locator('.todo-list li label');

        await label.dblclick();
        const editInput = page.locator('.todo-list li .edit-wrap input');
        await editInput.fill('   ');
        await editInput.press('Enter');

        await expect(page.locator('.todo-list li')).toHaveCount(0);
        await expect(page.getByTestId('empty-state')).toBeVisible();
    });
});

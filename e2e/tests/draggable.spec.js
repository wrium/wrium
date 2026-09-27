import { test, expect } from '@playwright/test';

const URL = '/e2e/fixtures/draggable/index.html';

function parseCoords(text) {
    const m = text.match(/x:\s*(-?\d+),\s*y:\s*(-?\d+)/);
    return { x: Number(m[1]), y: Number(m[2]) };
}

/** Dispatches a real PointerEvent with pointerType 'touch' directly, bypassing
 *  Playwright's mouse/touch abstractions - the reliable way to prove the
 *  plugin's single pointer-event code path actually handles touch input, not
 *  just mouse input. */
async function dispatchPointer(page, testId, type, { x, y, pointerId = 7 }) {
    await page.evaluate(({ testId, type, x, y, pointerId }) => {
        const el = document.querySelector(`[data-testid="${testId}"]`);
        (type === 'pointerdown' ? el : document).dispatchEvent(
            new PointerEvent(type, { clientX: x, clientY: y, pointerId, pointerType: 'touch', bubbles: true })
        );
    }, { testId, type, x, y, pointerId });
}

test.describe('Draggable plugin (v-draggable, pointer events)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(URL);
    });

    test('shows the initial position', async ({ page }) => {
        await expect(page.getByTestId('coords')).toHaveText('x: 150, y: 100');
    });

    test('dragging with the mouse updates the coordinates and moves the element', async ({ page }) => {
        const square = page.getByTestId('square');
        const before = await square.boundingBox();

        await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
        await page.mouse.down();
        await page.mouse.move(before.x + before.width / 2 + 50, before.y + before.height / 2 + 30, { steps: 5 });
        await page.mouse.up();

        const coords = parseCoords(await page.getByTestId('coords').textContent());
        expect(coords).toEqual({ x: 200, y: 130 });

        const after = await square.boundingBox();
        expect(Math.round(after.x - before.x)).toBe(50);
        expect(Math.round(after.y - before.y)).toBe(30);
    });

    test('stops moving once the pointer is released', async ({ page }) => {
        const square = page.getByTestId('square');
        const before = await square.boundingBox();

        await page.mouse.move(before.x + 30, before.y + 30);
        await page.mouse.down();
        await page.mouse.move(before.x + 80, before.y + 30, { steps: 3 });
        await page.mouse.up();
        const afterRelease = parseCoords(await page.getByTestId('coords').textContent());

        // further mouse movement (no button held) must not keep dragging it
        await page.mouse.move(before.x + 300, before.y + 30, { steps: 3 });
        await expect(page.getByTestId('coords')).toHaveText(`x: ${afterRelease.x}, y: ${afterRelease.y}`);
    });

    test('clamps dragging so the element never leaves the container', async ({ page }) => {
        const square = page.getByTestId('square');
        const box = await page.getByTestId('box').boundingBox();
        const start = await square.boundingBox();
        // The plugin clamps against clientWidth/Height (content box, border
        // excluded), which is what it should do - .box has a 1px border, so
        // this differs slightly from boundingBox() (border included).
        const { clientWidth, clientHeight } = await page.getByTestId('box').evaluate(el => (
            { clientWidth: el.clientWidth, clientHeight: el.clientHeight }
        ));

        await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
        await page.mouse.down();
        // aim far past the container's bottom-right corner
        await page.mouse.move(box.x + box.width + 400, box.y + box.height + 400, { steps: 8 });
        await page.mouse.up();

        const coords = parseCoords(await page.getByTestId('coords').textContent());
        expect(coords.x).toBe(clientWidth - start.width);
        expect(coords.y).toBe(clientHeight - start.height);

        const after = await square.boundingBox();
        expect(after.x + after.width).toBeLessThanOrEqual(box.x + box.width + 0.5);
        expect(after.y + after.height).toBeLessThanOrEqual(box.y + box.height + 0.5);
    });

    test('clamps at the top-left edge too (cannot be dragged to negative coordinates)', async ({ page }) => {
        const square = page.getByTestId('square');
        const box = await page.getByTestId('box').boundingBox();
        const start = await square.boundingBox();

        await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x - 400, box.y - 400, { steps: 8 });
        await page.mouse.up();

        await expect(page.getByTestId('coords')).toHaveText('x: 0, y: 0');
    });

    test('setting position from application code moves the element (ref -> DOM sync)', async ({ page }) => {
        const square = page.getByTestId('square');
        const before = await square.boundingBox();

        await page.mouse.move(before.x + 30, before.y + 30);
        await page.mouse.down();
        await page.mouse.move(before.x + 130, before.y + 90, { steps: 5 });
        await page.mouse.up();
        await expect(page.getByTestId('coords')).not.toHaveText('x: 150, y: 100');

        await page.getByTestId('reset-button').click();
        await expect(page.getByTestId('coords')).toHaveText('x: 150, y: 100');

        const after = await square.boundingBox();
        expect(Math.round(after.x)).toBe(Math.round(before.x));
        expect(Math.round(after.y)).toBe(Math.round(before.y));
    });

    test('supports touch-originated pointer events, not just mouse', async ({ page }) => {
        const start = await page.getByTestId('square').boundingBox();
        const startX = start.x + start.width / 2;
        const startY = start.y + start.height / 2;

        await dispatchPointer(page, 'square', 'pointerdown', { x: startX, y: startY });
        await dispatchPointer(page, 'square', 'pointermove', { x: startX + 40, y: startY + 20 });
        await dispatchPointer(page, 'square', 'pointerup', { x: startX + 40, y: startY + 20 });

        await expect(page.getByTestId('coords')).toHaveText('x: 190, y: 120');
    });
});

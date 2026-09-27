import { describe, it, expect } from 'vitest';
import { clampPosition } from '../src/plugins/draggable.js';

const bounds = { width: 400, height: 300, elWidth: 60, elHeight: 60 };

describe('clampPosition (pure logic)', () => {
    it('passes through a position already inside the bounds', () => {
        expect(clampPosition(100, 80, bounds)).toEqual({ x: 100, y: 80 });
    });

    it('clamps negative coordinates to 0', () => {
        expect(clampPosition(-50, -20, bounds)).toEqual({ x: 0, y: 0 });
    });

    it('clamps to the max position that keeps the element fully inside', () => {
        // container is 400x300, element is 60x60 -> max top-left is (340, 240)
        expect(clampPosition(1000, 1000, bounds)).toEqual({ x: 340, y: 240 });
    });

    it('clamps only the axis that overflows', () => {
        expect(clampPosition(1000, 50, bounds)).toEqual({ x: 340, y: 50 });
        expect(clampPosition(50, 1000, bounds)).toEqual({ x: 50, y: 240 });
    });

    it('never goes negative even when the element is bigger than the container', () => {
        const tinyContainer = { width: 40, height: 40, elWidth: 60, elHeight: 60 };
        expect(clampPosition(-10, 1000, tinyContainer)).toEqual({ x: 0, y: 0 });
    });

    it('only enforces the lower (0) bound when the upper bound is infinite (no parent element)', () => {
        const noParent = { width: Infinity, height: Infinity, elWidth: 0, elHeight: 0 };
        expect(clampPosition(-999, 99999, noParent)).toEqual({ x: 0, y: 99999 });
    });
});

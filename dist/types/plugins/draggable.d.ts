/**
 * Draggable plugin.
 *
 * Written against only the `api` object a plugin receives at install time -
 * no reach into wrium's own src/ internals - so it can be lifted into its
 * own standalone package/repo later without changes.
 *
 * Uses Pointer Events (pointerdown/pointermove/pointerup), which modern
 * browsers dispatch uniformly for mouse, touch, and pen - one code path
 * covers both "drag with the mouse" and "drag with a finger".
 *
 * @example
 * import { createApp, ref } from 'wrium';
 * import { DraggablePlugin } from 'wrium/plugins/draggable';
 *
 * createApp(() => ({ position: ref({ x: 0, y: 0 }) }))
 *     .use(DraggablePlugin)
 *     .mount('#app');
 *
 * <div class="box" style="position:relative">
 *     <div v-draggable="position">Drag me</div>
 * </div>
 * <p>{{ position.x }}, {{ position.y }}</p>
 */
/**
 * Clamp a position so the dragged element stays fully inside its container.
 * Pure function, no DOM - the directive below feeds it real measurements.
 *
 * @param {number} x
 * @param {number} y
 * @param {{ width: number, height: number, elWidth: number, elHeight: number }} bounds
 * @returns {{ x: number, y: number }}
 */
export declare function clampPosition(x: number, y: number, bounds: {
    width: number;
    height: number;
    elWidth: number;
    elHeight: number;
}): {
    x: number;
    y: number;
};
/**
 * v-draggable="position" - position must be a ref({ x, y }). Dragging the
 * element writes the new (clamped-to-parent) coordinates into it; setting
 * position.value from application code moves the element too, since a
 * single watchEffect drives the element's on-screen position either way.
 */
export declare const DraggablePlugin: {
    install(api: any): void;
};

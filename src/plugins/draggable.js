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
export function clampPosition(x, y, bounds) {
    const maxX = Math.max(0, bounds.width - bounds.elWidth);
    const maxY = Math.max(0, bounds.height - bounds.elHeight);
    return {
        x: Math.min(Math.max(x, 0), maxX),
        y: Math.min(Math.max(y, 0), maxY)
    };
}

/**
 * v-draggable="position" - position must be a ref({ x, y }). Dragging the
 * element writes the new (clamped-to-parent) coordinates into it; setting
 * position.value from application code moves the element too, since a
 * single watchEffect drives the element's on-screen position either way.
 */
export const DraggablePlugin = {
    install(api) {
        api.directive('draggable', (el, exp, { scope, cs, watchEffect }) => {
            const target = scope[exp];
            if (!target?._isRef) {
                console.error?.(`v-draggable="${exp}" must point to a ref()`);
                return;
            }

            el.style.touchAction = 'none';
            if (!el.style.position) el.style.position = 'absolute';
            el.style.cursor = 'grab';

            let dragging = false;
            let startX = 0, startY = 0, originX = 0, originY = 0;

            const clampToParent = (x, y) => {
                const parent = el.offsetParent || el.parentElement;
                const bounds = parent
                    ? { width: parent.clientWidth, height: parent.clientHeight, elWidth: el.offsetWidth, elHeight: el.offsetHeight }
                    : { width: Infinity, height: Infinity, elWidth: 0, elHeight: 0 };
                return clampPosition(x, y, bounds);
            };

            // Single source of visual truth: whether a drag or app code
            // changed position.value, this is what moves the element.
            cs.addEffect(watchEffect(() => {
                el.style.left = target.value.x + 'px';
                el.style.top = target.value.y + 'px';
            }));

            const onPointerDown = e => {
                dragging = true;
                startX = e.clientX;
                startY = e.clientY;
                originX = target.value.x;
                originY = target.value.y;
                el.style.cursor = 'grabbing';
                e.preventDefault();
            };

            const onPointerMove = e => {
                if (!dragging) return;
                const { x, y } = clampToParent(originX + (e.clientX - startX), originY + (e.clientY - startY));
                target.value = { x: Math.round(x), y: Math.round(y) };
            };

            const onPointerUp = () => {
                dragging = false;
                el.style.cursor = 'grab';
            };

            el.addEventListener('pointerdown', onPointerDown);
            document.addEventListener('pointermove', onPointerMove);
            document.addEventListener('pointerup', onPointerUp);

            cs.addListener(el, 'pointerdown', onPointerDown);
            cs.addListener(document, 'pointermove', onPointerMove);
            cs.addListener(document, 'pointerup', onPointerUp);
        });
    }
};

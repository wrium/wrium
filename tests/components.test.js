import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { createApp, ref, reactive, nextTick } from '../src/wrium.js';

describe('Component system (app.component)', () => {
    let dom, document, container;

    beforeEach(() => {
        dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
        global.document = dom.window.document;
        global.window = dom.window;
        document = dom.window.document;
        container = document.getElementById('app');
    });

    afterEach(() => {
        if (container) container.innerHTML = '';
    });

    it('renders a component under its registered tag name', () => {
        container.innerHTML = '<my-badge></my-badge>';
        const app = createApp(() => ({}));
        app.component('my-badge', { template: '<strong>hi</strong>' });
        app.mount(container);
        expect(container.querySelector('my-badge strong').textContent).toBe('hi');
    });

    it('passes static and dynamic attributes as props, camelCasing kebab-case names', () => {
        container.innerHTML = '<my-badge :label="count" static-attr="hi"></my-badge>';
        const app = createApp(() => ({ count: ref(3) }));
        app.component('my-badge', {
            template: '<strong>{{ label }} / {{ staticAttr }}</strong>'
        });
        app.mount(container);
        expect(container.querySelector('strong').textContent).toBe('3 / hi');
    });

    it('keeps a dynamic prop reactively in sync with the parent', async () => {
        container.innerHTML = '<my-badge :label="count"></my-badge>';
        let count;
        const app = createApp(() => {
            count = ref(1);
            return { count };
        });
        app.component('my-badge', { template: '<strong>{{ label }}</strong>' });
        app.mount(container);
        expect(container.querySelector('strong').textContent).toBe('1');

        count.value = 42;
        await nextTick();
        expect(container.querySelector('strong').textContent).toBe('42');
    });

    it('isolates the component scope - it cannot see the parent scope directly', () => {
        container.innerHTML = '<my-badge></my-badge>';
        const app = createApp(() => ({ secret: ref('nope') }));
        app.component('my-badge', { template: '<strong>{{ secret }}</strong>' });
        app.mount(container);
        // secret was never passed as a prop, so it must not leak in
        expect(container.querySelector('strong').textContent).toBe('');
    });

    it("setup()'s returned values are merged into the component's own scope", () => {
        container.innerHTML = '<my-counter :start="5"></my-counter>';
        const app = createApp(() => ({}));
        app.component('my-counter', {
            template: '<span>{{ doubled }}</span>',
            setup(props) {
                return { doubled: Number(props.start) * 2 };
            }
        });
        app.mount(container);
        expect(container.querySelector('span').textContent).toBe('10');
    });

    it('supports a function-valued prop as an emit-like callback up to the parent', () => {
        container.innerHTML = '<my-button :on-click="handleClick"></my-button>';
        let clicked = false;
        const app = createApp(() => ({ handleClick: () => { clicked = true; } }));
        // Note: the local handler must NOT be named the same as the incoming
        // prop (e.g. `onClick: () => props.onClick()`) - props is the live
        // scope object, so that would overwrite the incoming callback with a
        // self-reference and recurse forever. Name it differently.
        app.component('my-button', {
            template: '<button class="btn" @click="handleButtonClick">go</button>',
            setup(props) {
                return { handleButtonClick: () => props.onClick?.() };
            }
        });
        app.mount(container);
        container.querySelector('.btn').click();
        expect(clicked).toBe(true);
    });

    it('works as a v-for item template, with each instance getting independent props', () => {
        container.innerHTML = `
            <ul>
                <todo-item v-for="t in todos" :key="t.id" :text="t.text" :done="t.done"></todo-item>
            </ul>
        `;
        const app = createApp(() => ({
            todos: reactive([
                { id: 1, text: 'Buy milk', done: false },
                { id: 2, text: 'Walk dog', done: true }
            ])
        }));
        app.component('todo-item', {
            template: '<li :class="{ done }">{{ text }}</li>'
        });
        app.mount(container);

        const items = container.querySelectorAll('li');
        expect(items.length).toBe(2);
        expect(items[0].textContent).toBe('Buy milk');
        expect(items[0].className).toBe('');
        expect(items[1].textContent).toBe('Walk dog');
        expect(items[1].className).toBe('done');
    });

    it('reacts correctly when used with v-for and a callback prop for each item (emit pattern)', async () => {
        container.innerHTML = `
            <ul>
                <todo-item v-for="t in todos" :key="t.id" :text="t.text" :done="t.done" :on-toggle="() => toggle(t.id)"></todo-item>
            </ul>
        `;
        let todos;
        const app = createApp(() => {
            todos = reactive([{ id: 1, text: 'Buy milk', done: false }]);
            function toggle(id) {
                const t = todos.find(t => t.id === id);
                if (t) t.done = !t.done;
            }
            return { todos, toggle };
        });
        app.component('todo-item', {
            template: '<li :class="{ done }">{{ text }} <button class="tgl" @click="handleClick">x</button></li>',
            setup(props) {
                return { handleClick: () => props.onToggle?.() };
            }
        });
        app.mount(container);

        container.querySelector('.tgl').click();
        await nextTick();
        expect(todos[0].done).toBe(true);
        expect(container.querySelector('li').className).toBe('done');
    });

    it('cleans up the component instance when its containing scope is destroyed', async () => {
        container.innerHTML = '<div v-if="show"><my-badge></my-badge></div>';
        let show;
        let mounts = 0;
        const app = createApp(() => {
            show = ref(true);
            return { show };
        });
        app.component('my-badge', {
            template: '<strong>x</strong>',
            setup() { mounts++; return {}; }
        });
        app.mount(container);
        expect(mounts).toBe(1);
        expect(container.querySelector('strong')).not.toBeNull();

        show.value = false;
        await nextTick();
        expect(container.querySelector('strong')).toBeNull();

        show.value = true;
        await nextTick();
        expect(mounts).toBe(2); // remounted as a fresh instance
        expect(container.querySelector('strong')).not.toBeNull();
    });
});

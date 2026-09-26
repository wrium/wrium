import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { createApp, ref, reactive, nextTick } from '../src/wrium.js';

/**
 * Investigates a class of bug the user hit before: v-for items sometimes
 * needed `.value` and sometimes didn't, depending on whether the source
 * array was built with reactive() vs ref(), and whether the item was read
 * in the template vs mutated in an event handler vs passed as an argument
 * to an external function. Vue's actual rule is simple and uniform: you
 * never need `.value` for a v-for item, in any of those three places,
 * whether the item is a primitive or an object.
 */
describe('Vue-parity: v-for item consistency (reactive vs ref)', () => {
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

    describe('array of objects, built with reactive()', () => {
        it('renders item properties in the template', () => {
            container.innerHTML = '<ul><li v-for="item in items" :key="item.id">{{ item.name }}</li></ul>';
            const app = createApp(() => ({
                items: reactive([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }])
            }));
            app.mount(container);
            const lis = container.querySelectorAll('li');
            expect(lis[0].textContent).toBe('Alice');
            expect(lis[1].textContent).toBe('Bob');
        });

        it('mutates item.prop directly in an event handler, no .value', async () => {
            container.innerHTML = '<li v-for="item in items" :key="item.id" @click="item.name = \'Changed\'">{{ item.name }}</li>';
            const app = createApp(() => ({ items: reactive([{ id: 1, name: 'Alice' }]) }));
            app.mount(container);
            container.querySelector('li').click();
            await nextTick();
            expect(container.querySelector('li').textContent).toBe('Changed');
        });

        it('passes the live reactive item to an external function', async () => {
            let received;
            container.innerHTML = '<li v-for="item in items" :key="item.id" @click="handleItem(item)">{{ item.name }}</li>';
            const app = createApp(() => {
                const items = reactive([{ id: 1, name: 'Alice' }]);
                return { items, handleItem: item => { received = item; } };
            });
            app.mount(container);
            container.querySelector('li').click();
            expect(received?.name).toBe('Alice');
            // it must be the live object, not a snapshot/copy
            received.name = 'MutatedFromOutside';
            await nextTick();
            expect(container.querySelector('li').textContent).toBe('MutatedFromOutside');
        });
    });

    describe('array of objects, built with ref() (Vue-parity addition)', () => {
        it('renders item properties in the template', () => {
            container.innerHTML = '<ul><li v-for="item in items" :key="item.id">{{ item.name }}</li></ul>';
            const app = createApp(() => ({
                items: ref([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }])
            }));
            app.mount(container);
            const lis = container.querySelectorAll('li');
            expect(lis[0].textContent).toBe('Alice');
            expect(lis[1].textContent).toBe('Bob');
        });

        it('mutates item.prop directly in an event handler, no .value', async () => {
            container.innerHTML = '<li v-for="item in items" :key="item.id" @click="item.name = \'Changed\'">{{ item.name }}</li>';
            const app = createApp(() => ({ items: ref([{ id: 1, name: 'Alice' }]) }));
            app.mount(container);
            container.querySelector('li').click();
            await nextTick();
            expect(container.querySelector('li').textContent).toBe('Changed');
        });

        it('passes the live reactive item to an external function', async () => {
            let received;
            container.innerHTML = '<li v-for="item in items" :key="item.id" @click="handleItem(item)">{{ item.name }}</li>';
            const app = createApp(() => {
                const items = ref([{ id: 1, name: 'Alice' }]);
                return { items, handleItem: item => { received = item; } };
            });
            app.mount(container);
            container.querySelector('li').click();
            expect(received?.name).toBe('Alice');
            received.name = 'MutatedFromOutside';
            await nextTick();
            expect(container.querySelector('li').textContent).toBe('MutatedFromOutside');
        });

        it('pushing a new item through items.value still renders', async () => {
            container.innerHTML = '<ul><li v-for="item in items" :key="item.id">{{ item.name }}</li></ul>';
            let itemsRef;
            const app = createApp(() => {
                itemsRef = ref([{ id: 1, name: 'Alice' }]);
                return { items: itemsRef };
            });
            app.mount(container);
            itemsRef.value.push({ id: 2, name: 'Bob' });
            await nextTick();
            expect(container.querySelectorAll('li').length).toBe(2);
        });
    });

    describe('array of primitives, built with reactive()', () => {
        it('renders items in the template', () => {
            container.innerHTML = '<ul><li v-for="item in items">{{ item }}</li></ul>';
            const app = createApp(() => ({ items: reactive([1, 2, 3]) }));
            app.mount(container);
            const lis = container.querySelectorAll('li');
            expect(lis[0].textContent).toBe('1');
            expect(lis[1].textContent).toBe('2');
            expect(lis[2].textContent).toBe('3');
        });

        it('passes the raw primitive to an external function, not a ref wrapper', () => {
            let received;
            container.innerHTML = '<li v-for="item in items" @click="handleItem(item)">{{ item }}</li>';
            const app = createApp(() => {
                const items = reactive([42]);
                return { items, handleItem: item => { received = item; } };
            });
            app.mount(container);
            container.querySelector('li').click();
            expect(received).toBe(42);
            expect(typeof received).toBe('number');
        });

        it('passes the raw primitive to an inline event expression, not a ref wrapper', () => {
            let received;
            container.innerHTML = '<li v-for="item in items" @click="handleItem(item + 1)">{{ item }}</li>';
            const app = createApp(() => {
                const items = reactive([42]);
                return { items, handleItem: v => { received = v; } };
            });
            app.mount(container);
            container.querySelector('li').click();
            expect(received).toBe(43);
        });
    });

    describe('array of primitives, built with ref() (Vue-parity addition)', () => {
        it('renders items in the template', () => {
            container.innerHTML = '<ul><li v-for="item in items">{{ item }}</li></ul>';
            const app = createApp(() => ({ items: ref([1, 2, 3]) }));
            app.mount(container);
            const lis = container.querySelectorAll('li');
            expect(lis[0].textContent).toBe('1');
        });

        it('passes the raw primitive to an external function, not a ref wrapper', () => {
            let received;
            container.innerHTML = '<li v-for="item in items" @click="handleItem(item)">{{ item }}</li>';
            const app = createApp(() => {
                const items = ref([42]);
                return { items, handleItem: item => { received = item; } };
            });
            app.mount(container);
            container.querySelector('li').click();
            expect(received).toBe(42);
            expect(typeof received).toBe('number');
        });
    });

    describe('edge case: array containing pre-existing ref() items directly', () => {
        it('records what actually happens with reactive([ref(1), ref(2)]) in v-for', () => {
            container.innerHTML = '<ul><li v-for="item in items">{{ item }}</li></ul>';
            const app = createApp(() => ({ items: reactive([ref(1), ref(2)]) }));
            app.mount(container);
            const lis = container.querySelectorAll('li');
            // Documenting actual output for investigation - see test run notes.
            expect(lis.length).toBe(2);
            // eslint-disable-next-line no-console
            console.log('ref-in-array item[0] textContent:', JSON.stringify(lis[0].textContent));
        });
    });
});

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { createApp, ref, reactive, computed } from '../src/wrium.js';
import { HtmlPlugin } from '../src/plugins/html.js';

describe('Compiler and Directives', () => {
    let dom;
    let document;
    let container;

    beforeEach(() => {
        dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
        global.document = dom.window.document;
        global.window = dom.window;
        document = dom.window.document;
        container = document.getElementById('app');
    });

    afterEach(() => {
        if (container) {
            container.innerHTML = '';
        }
    });

    describe('Mustache Interpolation {{ }}', () => {
        it('should render simple value', () => {
            container.innerHTML = '<div>{{ message }}</div>';
            const app = createApp(() => {
                const message = ref('Hello');
                return { message };
            });
            app.mount(container);
            expect(container.querySelector('div').textContent).toBe('Hello');
        });

        it('should update when value changes', async () => {
            container.innerHTML = '<div>{{ message }}</div>';
            let message;
            const app = createApp(() => {
                message = ref('Hello');
                return { message };
            });
            app.mount(container);
            expect(container.querySelector('div').textContent).toBe('Hello');
            message.value = 'World';
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(container.querySelector('div').textContent).toBe('World');
        });

        it('should work with expressions', () => {
            container.innerHTML = '<div>{{ count * 2 }}</div>';
            const app = createApp(() => {
                const count = ref(5);
                return { count };
            });
            app.mount(container);
            expect(container.querySelector('div').textContent).toBe('10');
        });

        it('should work with reactive objects', async () => {
            container.innerHTML = '<div>{{ user.name }}</div>';
            let user;
            const app = createApp(() => {
                user = reactive({ name: 'Ali' });
                return { user };
            });
            app.mount(container);
            expect(container.querySelector('div').textContent).toBe('Ali');
            user.name = 'Hassan';
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(container.querySelector('div').textContent).toBe('Hassan');
        });

        it('should handle multiple interpolations', () => {
            container.innerHTML = '<div>{{ firstName }} {{ lastName }}</div>';
            const app = createApp(() => {
                const firstName = ref('Ali');
                const lastName = ref('Rezaei');
                return { firstName, lastName };
            });
            app.mount(container);
            expect(container.querySelector('div').textContent).toBe('Ali Rezaei');
        });

        it('should handle undefined gracefully', () => {
            container.innerHTML = '<div>{{ missing }}</div>';
            const app = createApp(() => {
                return {};
            });
            app.mount(container);
            expect(container.querySelector('div').textContent).toBe('');
        });
    });

    describe('v-text directive', () => {
        it('should set text content', () => {
            container.innerHTML = '<div v-text="message"></div>';
            const app = createApp(() => {
                const message = ref('Hello');
                return { message };
            });
            app.mount(container);
            expect(container.querySelector('div').textContent).toBe('Hello');
        });

        it('should update when value changes', async () => {
            container.innerHTML = '<div v-text="message"></div>';
            let message;
            const app = createApp(() => {
                message = ref('Hello');
                return { message };
            });
            app.mount(container);
            message.value = 'World';
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(container.querySelector('div').textContent).toBe('World');
        });
    });

    describe('v-html directive (HtmlPlugin)', () => {
        it('should set innerHTML', () => {
            container.innerHTML = '<div v-html="html"></div>';
            const app = createApp(() => {
                const html = ref('<strong>Bold</strong>');
                return { html };
            });
            app.use(HtmlPlugin);
            app.mount(container);
            expect(container.querySelector('div').innerHTML).toBe('<strong>Bold</strong>');
        });

        it('should report onError for an unregistered directive', () => {
            // A made-up directive name, guaranteed never registered by any plugin
            container.innerHTML = '<div v-totally-unregistered-xyz="html"></div>';
            const app = createApp(() => {
                const html = ref('<strong>Bold</strong>');
                return { html };
            });
            const onError = vi.fn();
            app.use({ install: api => api.onHook('onError', onError) });
            app.mount(container);
            expect(onError).toHaveBeenCalled();
        });
    });

    describe('v-show directive', () => {
        it('should show element when true', () => {
            container.innerHTML = '<div v-show="visible">Content</div>';
            const app = createApp(() => {
                const visible = ref(true);
                return { visible };
            });
            app.mount(container);
            expect(container.querySelector('div').style.display).toBe('');
        });

        it('should hide element when false', () => {
            container.innerHTML = '<div v-show="visible">Content</div>';
            const app = createApp(() => {
                const visible = ref(false);
                return { visible };
            });
            app.mount(container);
            expect(container.querySelector('div').style.display).toBe('none');
        });

        it('should toggle visibility', async () => {
            container.innerHTML = '<div v-show="visible">Content</div>';
            let visible;
            const app = createApp(() => {
                visible = ref(true);
                return { visible };
            });
            app.mount(container);
            expect(container.querySelector('div').style.display).toBe('');
            visible.value = false;
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(container.querySelector('div').style.display).toBe('none');
        });
    });

    describe('v-if / v-else-if / v-else directives', () => {
        it('should render v-if when true', () => {
            container.innerHTML = `
                <div v-if="show">Visible</div>
            `;
            const app = createApp(() => {
                const show = ref(true);
                return { show };
            });
            app.mount(container);
            expect(container.textContent.trim()).toBe('Visible');
        });

        it('should not render v-if when false', () => {
            container.innerHTML = `
                <div v-if="show">Visible</div>
            `;
            const app = createApp(() => {
                const show = ref(false);
                return { show };
            });
            app.mount(container);
            expect(container.textContent.trim()).toBe('');
        });

        it('should toggle v-if', async () => {
            container.innerHTML = `
                <div v-if="show">Visible</div>
            `;
            let show;
            const app = createApp(() => {
                show = ref(true);
                return { show };
            });
            app.mount(container);
            expect(container.textContent.trim()).toBe('Visible');
            show.value = false;
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(container.textContent.trim()).toBe('');
        });

        it('should work with v-else', async () => {
            container.innerHTML = `
                <div v-if="show">True</div>
                <div v-else>False</div>
            `;
            let show;
            const app = createApp(() => {
                show = ref(true);
                return { show };
            });
            app.mount(container);
            expect(container.textContent.trim()).toBe('True');
            show.value = false;
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(container.textContent.trim()).toBe('False');
        });

        it('should work with v-else-if', async () => {
            container.innerHTML = `
                <div v-if="type === 'A'">A</div>
                <div v-else-if="type === 'B'">B</div>
                <div v-else>C</div>
            `;
            let type;
            const app = createApp(() => {
                type = ref('A');
                return { type };
            });
            app.mount(container);
            expect(container.textContent.trim()).toBe('A');
            type.value = 'B';
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(container.textContent.trim()).toBe('B');
            type.value = 'C';
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(container.textContent.trim()).toBe('C');
        });
    });

    describe('v-for directive', () => {
        it('should render list with reactive array', () => {
            container.innerHTML = `
                <div v-for="item in items">{{ item }}</div>
            `;
            const app = createApp(() => {
                const items = reactive([1, 2, 3]);
                return { items };
            });
            app.mount(container);
            const divs = container.querySelectorAll('div');
            expect(divs.length).toBe(3);
            expect(divs[0].textContent).toBe('1');
            expect(divs[1].textContent).toBe('2');
            expect(divs[2].textContent).toBe('3');
        });

        it('should update when array changes', async () => {
            container.innerHTML = `
                <div v-for="item in items">{{ item }}</div>
            `;
            let items;
            const app = createApp(() => {
                items = reactive([1, 2, 3]);
                return { items };
            });
            app.mount(container);
            expect(container.querySelectorAll('div').length).toBe(3);
            items.push(4);
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(container.querySelectorAll('div').length).toBe(4);
        });

        it('should work with (item, index) syntax', () => {
            container.innerHTML = `
                <div v-for="(item, index) in items">{{ index }}: {{ item }}</div>
            `;
            const app = createApp(() => {
                const items = reactive(['a', 'b', 'c']);
                return { items };
            });
            app.mount(container);
            const divs = container.querySelectorAll('div');
            expect(divs[0].textContent).toBe('0: a');
            expect(divs[1].textContent).toBe('1: b');
            expect(divs[2].textContent).toBe('2: c');
        });

        it('should work with reactive objects in array', async () => {
            container.innerHTML = `
                <div v-for="user in users">{{ user.name }}</div>
            `;
            let users;
            const app = createApp(() => {
                users = reactive([
                    { name: 'Ali' },
                    { name: 'Hassan' }
                ]);
                return { users };
            });
            app.mount(container);
            const divs = container.querySelectorAll('div');
            expect(divs[0].textContent).toBe('Ali');
            expect(divs[1].textContent).toBe('Hassan');
            users[0].name = 'Changed';
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(container.querySelectorAll('div')[0].textContent).toBe('Changed');
        });

        it('should handle array mutations', async () => {
            container.innerHTML = `
                <div v-for="item in items">{{ item }}</div>
            `;
            let items;
            const app = createApp(() => {
                items = reactive([1, 2, 3]);
                return { items };
            });
            app.mount(container);
            
            items.pop();
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(container.querySelectorAll('div').length).toBe(2);
            
            items.unshift(0);
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(container.querySelectorAll('div').length).toBe(3);
            expect(container.querySelectorAll('div')[0].textContent).toBe('0');
        });

        it('should work with :key attribute', async () => {
            container.innerHTML = `
                <div v-for="user in users" :key="user.id">{{ user.name }}</div>
            `;
            let users;
            const app = createApp(() => {
                users = reactive([
                    { id: 1, name: 'Ali' },
                    { id: 2, name: 'Hassan' }
                ]);
                return { users };
            });
            app.mount(container);
            const divs = container.querySelectorAll('div');
            expect(divs.length).toBe(2);
            
            // Reverse array
            users.reverse();
            await new Promise(resolve => setTimeout(resolve, 0));
            const divsAfter = container.querySelectorAll('div');
            expect(divsAfter[0].textContent).toBe('Hassan');
            expect(divsAfter[1].textContent).toBe('Ali');
        });

        it('should handle empty array', () => {
            container.innerHTML = `
                <div v-for="item in items">{{ item }}</div>
            `;
            const app = createApp(() => {
                const items = reactive([]);
                return { items };
            });
            app.mount(container);
            expect(container.querySelectorAll('div').length).toBe(0);
        });

        it('should support a v-for nested inside another v-for', () => {
            container.innerHTML = `
                <div v-for="group in groups" :key="group.id">
                    <span v-for="item in group.items" :key="item">{{ item }}</span>
                </div>
            `;
            const app = createApp(() => ({
                groups: reactive([
                    { id: 1, items: ['a', 'b'] },
                    { id: 2, items: ['c'] }
                ])
            }));
            app.mount(container);
            const spans = container.querySelectorAll('span');
            expect([...spans].map(s => s.textContent)).toEqual(['a', 'b', 'c']);
        });

        it('should reactively update the inner v-for when a nested array changes', async () => {
            container.innerHTML = `
                <div v-for="group in groups" :key="group.id">
                    <span v-for="item in group.items" :key="item">{{ item }}</span>
                </div>
            `;
            let groups;
            const app = createApp(() => {
                groups = reactive([{ id: 1, items: ['a'] }]);
                return { groups };
            });
            app.mount(container);
            groups[0].items.push('b');
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(container.querySelectorAll('span').length).toBe(2);
        });
    });

    describe('v-if combined with v-for on the same element (undocumented combination)', () => {
        // Compile order checks v-if first; the branch it clones still carries
        // the v-for attribute (only the v-if-family attribute is stripped
        // before cloning), so the shown branch is then re-compiled and hits
        // the v-for path normally. This test exists to pin down and protect
        // that actual behavior - not to declare it "correct" or supported.
        it('renders the v-for list when the v-if condition is true', () => {
            container.innerHTML = '<li v-if="show" v-for="item in items">{{ item }}</li>';
            const app = createApp(() => ({
                show: ref(true),
                items: reactive(['a', 'b'])
            }));
            app.mount(container);
            expect([...container.querySelectorAll('li')].map(li => li.textContent)).toEqual(['a', 'b']);
        });

        it('renders nothing when the v-if condition is false', () => {
            container.innerHTML = '<li v-if="show" v-for="item in items">{{ item }}</li>';
            const app = createApp(() => ({
                show: ref(false),
                items: reactive(['a', 'b'])
            }));
            app.mount(container);
            expect(container.querySelectorAll('li').length).toBe(0);
        });

        // CONFIRMED BUG, not just an unsupported edge case: toggling v-if back
        // to false does NOT remove the rendered list. v-for replaces its own
        // template element with a placeholder comment + N sibling clones
        // (none of which are descendants of that template element anymore),
        // so when v-if's branch cleanup does `b.el?.remove()`, b.el is
        // already an empty, detached husk - removing it removes nothing
        // visible. Stopping the v-for effect (via b.scope.cleanup()) only
        // stops it from reacting to *future* changes; it does not undo the
        // DOM nodes the effect already inserted. Net effect: the list leaks
        // and keeps reacting to `items` changes forever, orphaned from the
        // v-if that thinks it deleted it.
        it('BUG: toggling v-if back to false does not remove a v-for rendered under it', async () => {
            container.innerHTML = '<li v-if="show" v-for="item in items">{{ item }}</li>';
            let show;
            const app = createApp(() => {
                show = ref(false);
                return { show, items: reactive(['a', 'b']) };
            });
            app.mount(container);
            expect(container.querySelectorAll('li').length).toBe(0);

            show.value = true;
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(container.querySelectorAll('li').length).toBe(2);

            show.value = false;
            await new Promise(resolve => setTimeout(resolve, 0));
            // This SHOULD be 0. It is not. Documented here so a future fix
            // has a test to flip red->green instead of discovering this by
            // accident again.
            expect(container.querySelectorAll('li').length).toBe(2);
        });
    });

    describe('v-model directive', () => {
        it('should bind input value', () => {
            container.innerHTML = '<input v-model="text">';
            const app = createApp(() => {
                const text = ref('Hello');
                return { text };
            });
            app.mount(container);
            expect(container.querySelector('input').value).toBe('Hello');
        });

        it('should update on input', async () => {
            container.innerHTML = '<input v-model="text">';
            let text;
            const app = createApp(() => {
                text = ref('Hello');
                return { text };
            });
            app.mount(container);
            const input = container.querySelector('input');
            input.value = 'World';
            input.dispatchEvent(new dom.window.Event('input'));
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(text.value).toBe('World');
        });

        it('should work with checkbox', () => {
            container.innerHTML = '<input type="checkbox" v-model="checked">';
            const app = createApp(() => {
                const checked = ref(true);
                return { checked };
            });
            app.mount(container);
            expect(container.querySelector('input').checked).toBe(true);
        });

        it('should update checkbox on change', async () => {
            container.innerHTML = '<input type="checkbox" v-model="checked">';
            let checked;
            const app = createApp(() => {
                checked = ref(false);
                return { checked };
            });
            app.mount(container);
            const input = container.querySelector('input');
            input.checked = true;
            input.dispatchEvent(new dom.window.Event('change'));
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(checked.value).toBe(true);
        });

        it('should work with reactive object properties', async () => {
            container.innerHTML = '<input v-model="user.name">';
            let user;
            const app = createApp(() => {
                user = reactive({ name: 'Ali' });
                return { user };
            });
            app.mount(container);
            const input = container.querySelector('input');
            expect(input.value).toBe('Ali');
            input.value = 'Hassan';
            input.dispatchEvent(new dom.window.Event('input'));
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(user.name).toBe('Hassan');
        });
    });

    describe('Event Handlers (@click, @input, etc)', () => {
        it('should handle @click events', () => {
            container.innerHTML = '<button @click="increment">Click</button>';
            let count;
            const app = createApp(() => {
                count = ref(0);
                const increment = () => count.value++;
                return { count, increment };
            });
            app.mount(container);
            const button = container.querySelector('button');
            button.click();
            expect(count.value).toBe(1);
        });

        it('should handle inline expressions', () => {
            container.innerHTML = '<button @click="count.value++">Click</button>';
            let count;
            const app = createApp(() => {
                count = ref(0);
                return { count };
            });
            app.mount(container);
            const button = container.querySelector('button');
            button.click();
            expect(count.value).toBe(1);
        });

        it('should pass event object', () => {
            container.innerHTML = '<button @click="handleClick">Click</button>';
            let eventType;
            const app = createApp(() => {
                const handleClick = (e) => {
                    eventType = e.type;
                };
                return { handleClick };
            });
            app.mount(container);
            const button = container.querySelector('button');
            button.click();
            expect(eventType).toBe('click');
        });

        it('should work with reactive objects', () => {
            container.innerHTML = '<button @click="user.count++">Click</button>';
            let user;
            const app = createApp(() => {
                user = reactive({ count: 0 });
                return { user };
            });
            app.mount(container);
            const button = container.querySelector('button');
            button.click();
            expect(user.count).toBe(1);
        });

        it('should mutate an object-valued ref directly, without .value', () => {
            container.innerHTML = '<button @click="user.count++">Click</button>';
            let user;
            const app = createApp(() => {
                user = ref({ count: 0 });
                return { user };
            });
            app.mount(container);
            container.querySelector('button').click();
            expect(user.value.count).toBe(1);
        });

        it('should still require .value to reassign a primitive ref', () => {
            container.innerHTML = '<button @click="count.value++">Click</button>';
            let count;
            const app = createApp(() => {
                count = ref(0);
                return { count };
            });
            app.mount(container);
            container.querySelector('button').click();
            expect(count.value).toBe(1);
        });
    });

    describe('Event Modifiers (@event.modifier)', () => {
        it('should support v-on: as a long-form alias for @', () => {
            container.innerHTML = '<button v-on:click="increment">Click</button>';
            let count;
            const app = createApp(() => {
                count = ref(0);
                const increment = () => count.value++;
                return { count, increment };
            });
            app.mount(container);
            container.querySelector('button').click();
            expect(count.value).toBe(1);
        });

        it('.prevent should call preventDefault', () => {
            container.innerHTML = '<a href="#" @click.prevent="noop">Link</a>';
            const app = createApp(() => ({ noop: () => {} }));
            app.mount(container);
            const link = container.querySelector('a');
            const ev = new dom.window.MouseEvent('click', { cancelable: true, bubbles: true });
            link.dispatchEvent(ev);
            expect(ev.defaultPrevented).toBe(true);
        });

        it('.stop should call stopPropagation', () => {
            container.innerHTML = '<div id="outer"><button @click.stop="noop">Click</button></div>';
            let outerClicks = 0;
            const app = createApp(() => ({ noop: () => {} }));
            app.mount(container);
            container.querySelector('#outer').addEventListener('click', () => outerClicks++);
            container.querySelector('button').click();
            expect(outerClicks).toBe(0);
        });

        it('.once should only trigger the handler once', () => {
            container.innerHTML = '<button @click.once="increment">Click</button>';
            let count;
            const app = createApp(() => {
                count = ref(0);
                const increment = () => count.value++;
                return { count, increment };
            });
            app.mount(container);
            const button = container.querySelector('button');
            button.click();
            button.click();
            expect(count.value).toBe(1);
        });

        it('.self should ignore events bubbled from children', () => {
            container.innerHTML = '<div @click.self="increment"><span>child</span></div>';
            let count;
            const app = createApp(() => {
                count = ref(0);
                const increment = () => count.value++;
                return { count, increment };
            });
            app.mount(container);
            container.querySelector('span').click();
            expect(count.value).toBe(0);
            container.querySelector('div').click();
            expect(count.value).toBe(1);
        });

        it('key modifiers (e.g. .enter) should filter by e.key', () => {
            container.innerHTML = '<input @keyup.enter="submit" />';
            let submitted = 0;
            const app = createApp(() => ({ submit: () => submitted++ }));
            app.mount(container);
            const input = container.querySelector('input');
            input.dispatchEvent(new dom.window.KeyboardEvent('keyup', { key: 'a' }));
            expect(submitted).toBe(0);
            input.dispatchEvent(new dom.window.KeyboardEvent('keyup', { key: 'Enter' }));
            expect(submitted).toBe(1);
        });
    });

    describe('Attribute Binding (:attr)', () => {
        it('should bind attributes', () => {
            container.innerHTML = '<div :id="divId"></div>';
            const app = createApp(() => {
                const divId = ref('myDiv');
                return { divId };
            });
            app.mount(container);
            expect(container.querySelector('div').id).toBe('myDiv');
        });

        it('should support v-bind: as a long-form alias for :', () => {
            container.innerHTML = '<div v-bind:id="divId"></div>';
            const app = createApp(() => {
                const divId = ref('myDiv');
                return { divId };
            });
            app.mount(container);
            expect(container.querySelector('div').id).toBe('myDiv');
        });

        it('should update attribute when value changes', async () => {
            container.innerHTML = '<div :id="divId"></div>';
            let divId;
            const app = createApp(() => {
                divId = ref('myDiv');
                return { divId };
            });
            app.mount(container);
            divId.value = 'newDiv';
            await new Promise(resolve => setTimeout(resolve, 0));
            expect(container.querySelector('div').id).toBe('newDiv');
        });

        it('should handle boolean attributes', () => {
            container.innerHTML = '<button :disabled="isDisabled">Button</button>';
            const app = createApp(() => {
                const isDisabled = ref(true);
                return { isDisabled };
            });
            app.mount(container);
            expect(container.querySelector('button').hasAttribute('disabled')).toBe(true);
        });

        it('should bind class with object', () => {
            container.innerHTML = '<div :class="{ active: isActive, disabled: isDisabled }"></div>';
            const app = createApp(() => {
                const isActive = ref(true);
                const isDisabled = ref(false);
                return { isActive, isDisabled };
            });
            app.mount(container);
            const div = container.querySelector('div');
            expect(div.classList.contains('active')).toBe(true);
            expect(div.classList.contains('disabled')).toBe(false);
        });

        it('should bind class with an array of strings', () => {
            container.innerHTML = '<div :class="[base, extra]"></div>';
            const app = createApp(() => ({ base: ref('btn'), extra: ref('primary') }));
            app.mount(container);
            const div = container.querySelector('div');
            expect(div.classList.contains('btn')).toBe(true);
            expect(div.classList.contains('primary')).toBe(true);
        });

        it('should bind class with an array mixing strings and objects', () => {
            container.innerHTML = '<div class="static" :class="[base, { active: isActive, off: isOff }]"></div>';
            const app = createApp(() => {
                const base = ref('btn');
                const isActive = ref(true);
                const isOff = ref(false);
                return { base, isActive, isOff };
            });
            app.mount(container);
            const div = container.querySelector('div');
            expect(div.classList.contains('static')).toBe(true);
            expect(div.classList.contains('btn')).toBe(true);
            expect(div.classList.contains('active')).toBe(true);
            expect(div.classList.contains('off')).toBe(false);
        });

        it('should bind style with object', async () => {
            container.innerHTML = '<div :style="styleObj"></div>';
            const app = createApp(() => {
                const styleObj = reactive({ color: 'red', fontSize: '20px' });
                return { styleObj };
            });
            app.mount(container);
            const div = container.querySelector('div');
            expect(div.style.color).toBe('red');
            expect(div.style.fontSize).toBe('20px');
        });
    });

    describe('App Lifecycle', () => {
        it('should mount app successfully', () => {
            container.innerHTML = '<div>{{ message }}</div>';
            const app = createApp(() => {
                const message = ref('Hello');
                return { message };
            });
            const result = app.mount(container);
            expect(result).toBeDefined();
            expect(container.querySelector('div').textContent).toBe('Hello');
        });

        it('should unmount app and cleanup', async () => {
            container.innerHTML = '<div>{{ message }}</div>';
            let message;
            const app = createApp(() => {
                message = ref('Hello');
                return { message };
            });
            app.mount(container);
            app.unmount();
            message.value = 'World';
            await new Promise(resolve => setTimeout(resolve, 0));
            // Content should not update after unmount
            expect(container.querySelector('div').textContent).toBe('Hello');
        });

        it('should handle mount selector not found', () => {
            const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const app = createApp(() => ({}));
            app.mount('#nonexistent');
            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        });
    });
});

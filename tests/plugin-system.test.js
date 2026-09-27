import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { createApp, ref, reactive } from '../src/wrium.js';

/**
 * Covers the hook/plugin system paths that had zero direct coverage before:
 * beforeCompile/afterCompile actually firing (only onError had a test), and
 * the documented-but-never-verified fact that the directive registry and
 * hook list are module-level singletons, not scoped per createApp() - a
 * plugin installed on one app is visible to every app on the page.
 */
describe('Hook system (beforeCompile / afterCompile)', () => {
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

    it('calls beforeCompile and afterCompile for every node compiled, element and text alike', () => {
        container.innerHTML = '<div><span>{{ msg }}</span></div>';
        const before = [];
        const after = [];
        const app = createApp(() => ({ msg: ref('hi') }));
        app.use({
            install: api => {
                api.onHook('beforeCompile', el => before.push(el.nodeType));
                api.onHook('afterCompile', el => after.push(el.nodeType));
            }
        });
        app.mount(container);

        // element nodes (div, span) and the text node inside span
        expect(before).toContain(1);
        expect(before).toContain(3);
        expect(after.length).toBeGreaterThan(0);
    });

    it('beforeCompile returning false skips compiling that element and its subtree', () => {
        container.innerHTML = '<div id="skip">{{ msg }}</div>';
        const app = createApp(() => ({ msg: ref('should not appear') }));
        app.use({
            install: api => {
                api.onHook('beforeCompile', el => {
                    if (el.id === 'skip') return false;
                });
            }
        });
        app.mount(container);

        // the div's own directive processing AND its text-node child were
        // both skipped, so the mustache syntax is left completely untouched
        expect(container.querySelector('#skip').textContent).toBe('{{ msg }}');
    });

    it('does not let one plugin\'s beforeCompile veto stop a sibling element from compiling', () => {
        container.innerHTML = '<div id="skip">{{ a }}</div><div id="keep">{{ b }}</div>';
        const app = createApp(() => ({ a: ref('nope'), b: ref('yes') }));
        app.use({
            install: api => api.onHook('beforeCompile', el => {
                if (el.id === 'skip') return false;
            })
        });
        app.mount(container);

        expect(container.querySelector('#skip').textContent).toBe('{{ a }}');
        expect(container.querySelector('#keep').textContent).toBe('yes');
    });
});

describe('Plugin/hook registry scope (documented limitation: global, not per-app)', () => {
    let dom, document, container1, container2;

    beforeEach(() => {
        dom = new JSDOM('<!DOCTYPE html><html><body><div id="app1"></div><div id="app2"></div></body></html>');
        global.document = dom.window.document;
        global.window = dom.window;
        document = dom.window.document;
        container1 = document.getElementById('app1');
        container2 = document.getElementById('app2');
    });

    afterEach(() => {
        container1.innerHTML = '';
        container2.innerHTML = '';
    });

    it('a directive registered via one app\'s plugin is usable by a second app that never installed it', () => {
        container1.innerHTML = '<div v-shout="msg"></div>';
        container2.innerHTML = '<div v-shout="msg"></div>';

        const seen = [];
        const ShoutPlugin = {
            install: api => api.directive('shout', (el, exp, { scope, evalExp }) => {
                el.textContent = String(evalExp(exp, scope)).toUpperCase();
                seen.push(el);
            })
        };

        const app1 = createApp(() => ({ msg: ref('hello') }));
        app1.use(ShoutPlugin);
        app1.mount(container1);

        // app2 deliberately never calls .use(ShoutPlugin)
        const app2 = createApp(() => ({ msg: ref('world') }));
        app2.mount(container2);

        expect(seen.length).toBe(2);
        expect(container1.querySelector('div').textContent).toBe('HELLO');
        expect(container2.querySelector('div').textContent).toBe('WORLD');
    });

    it('an onHook callback registered via one app also fires while compiling a second, unrelated app', () => {
        const calls = [];
        const app1 = createApp(() => ({}));
        app1.use({ install: api => api.onHook('beforeCompile', () => { calls.push('seen'); }) });
        app1.mount(container1);

        const callsAfterApp1 = calls.length;

        container2.innerHTML = '<div>plain</div>';
        const app2 = createApp(() => ({})); // installs nothing itself
        app2.mount(container2);

        expect(calls.length).toBeGreaterThan(callsAfterApp1);
    });
});

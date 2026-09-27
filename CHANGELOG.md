# Changelog

All notable changes to this project are documented in this file.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [1.0.0]

First release under the name **Wrium** (formerly **Zog.js**). Every prior
0.x version was internal/unpublished development under the old name, so
this is effectively the project's first real release - the entries below
cover everything that changed on the way here.

### Changed

- **Renamed from Zog.js to Wrium**: package name (`zogjs` → `wrium`),
  directive prefix (`z-` → `v-`), entry file (`src/zog.js` → `src/wrium.js`).
- **`ref()` now accepts any value**, matching Vue: objects/arrays are
  transparently wrapped with `reactive()` instead of throwing. Previously
  `ref()` only accepted primitives and threw on objects/arrays.
- **Source split from a single 1245-line file** into a modular structure
  (`src/core/*`, `src/compiler.js`, `src/directives.js`, `src/app.js`, ...).
  No behavior change - same public API from `src/wrium.js`.
- **`v-html` moved out of core** into an opt-in plugin
  (`src/plugins/html.js`) - it sets `innerHTML` directly, which is an XSS
  risk core shouldn't carry by default.

### Added

- **Directive registry** (`registerDirective`/`getDirective`): built-in
  directives (`v-model`, `v-show`, `v-text`) now register through the same
  mechanism a plugin uses via the new `api.directive(name, handler)` -
  plugins can add real `v-xxx` directives, not just hook into compilation.
- **Event modifiers**: `.prevent`, `.stop`, `.once`, `.self`, `.capture`,
  `.passive`, plus generic key modifiers matched against
  `e.key.toLowerCase()` (e.g. `.enter`, `.escape`, `.arrowdown`).
- **`:class` array syntax**: `:class="[base, { active: isActive }]"`,
  mixing strings and objects like Vue.
- **Real TypeScript declarations** generated from JSDoc
  (`npm run build:types`, zero runtime cost) - `ref`, `reactive`,
  `computed`, and `createApp` all carry proper generic signatures.
- **Documented plugin API stability tiers**: `app`, `directive`, `onHook`,
  `reactive`, `ref`, `computed`, `watchEffect` are the supported,
  semver-stable surface; `compile`, `Scope`, `evalExp` remain available for
  advanced plugins but mirror internals and aren't stability-guaranteed.
- **Directive arguments and modifiers**: `v-tooltip:top.instant="x"` now
  gives a custom directive handler `{ arg: 'top', modifiers: { instant: true } }`,
  matching Vue's own custom-directive shape. Previously the entire string
  after `v-` was used as a literal registry lookup key, so a directive
  taking an argument had no way to be registered/found at all.
- **Two real, standalone-ready plugins**: `PasswordStrengthPlugin`
  (`v-password-strength`, pattern-based weak/common-password detection,
  zero dependencies) and `DraggablePlugin` (`v-draggable`, Pointer Events so
  one code path covers mouse/touch/pen).
- **Real-browser test coverage** (`npm run test:e2e`, Playwright/Chromium):
  three example apps under `e2e/fixtures/` (a signup form, a Todo app, and
  the draggable demo) with 30 passing tests, on top of the 189 jsdom-based
  unit tests.
- **Component system**: `app.component(name, { template, setup })`, used as
  a custom tag (`<todo-item :text="t.text">`). Every attribute becomes a
  prop (kebab-case camelCased, `:attr` ones kept reactively in sync); the
  component's scope is isolated (unlike `v-if`/`v-for` branches, it does not
  inherit the parent scope); no slots or a separate emit API in this first
  version - a function-valued prop doubles as one. Composes with `v-for`
  (each instance gets independent, correctly-scoped props) and cleans up
  properly when its containing scope is destroyed. Adds ~0.56KB
  (~9.9KB -> ~10.8KB, well inside the ≤15KB budget for this phase).

### Fixed

- **`v-for` primitive items passed to a function or expression in an event
  handler received the internal ref box instead of the raw value** (e.g.
  `handleItem(num)` got `{ _isRef, value, toString }` instead of `42`, and
  `num + 1` silently became string concatenation, `"421"`). This was the
  exact class of inconsistency - `.value` needed in some places but not
  others for the same v-for item - that originally motivated restricting
  `ref()` to primitives only. Root-caused and fixed with a dedicated test
  suite (`tests/vue-parity.test.js`) covering reactive() vs ref() arrays of
  both objects and primitives, checked in the template, in event-handler
  mutations, and passed to external functions.
- `@keyup.enter` (and every other dot-modifier) never actually worked - no
  modifier parsing existed at all, including in the README's own Todo List
  example.
- `v-bind:attr` (long form) stripped the wrong prefix and produced a
  malformed attribute name; only the `:attr` shorthand worked.
- `console.error` was being stripped from every published build
  (`drop_console: true` in the terser config), so runtime errors failed
  completely silently in production unless the consumer had registered an
  `onError` hook.
- Object-valued refs couldn't be mutated directly in event handlers
  (`@click="user.name = 'x'"` silently no-op'd) - a regression introduced
  earlier in this same release by letting `ref()` hold objects, caught and
  fixed before shipping.
- `package.json`'s `main`/`module`/`exports.import` pointed at a bare
  `wrium.js` (originally `zog.js`) that the build never produced - the vite
  config's `fileName` pattern always emits `wrium.es.js`/`wrium.umd.js`/
  `wrium.iife.js`. This had been broken since the very first `zog.js`
  release; `import 'wrium'` would 404.
- **`v-if` combined with `v-for` on the same element used to leak**: toggling
  the condition to true rendered the list correctly, but toggling back to
  false did not remove it - `v-for` replaces its own template element with a
  placeholder comment plus sibling clones that are no longer descendants of
  that element, so `v-if`'s branch cleanup (which only removes that one
  element) couldn't find the actual rendered nodes again. Now detected and
  refused at compile time (reported through `onError`/`console.error`,
  the element is left uncompiled) rather than silently half-working - see
  "Don't combine v-if with v-for" under Conditional Rendering in the README
  for the recommended alternatives.

### Removed

- `z-key` alternate spelling for `v-for`'s key attribute - use `:key`
  (matches Vue; there was never a `v-key` equivalent to replace it).

### Known limitations (not yet addressed)

- The directive registry, component registry, and hook system are all
  global/module-level singletons, not scoped per `createApp()` instance - a
  directive, component, or hook registered on one app is visible to every
  app on the page. Now backed by a regression test
  (`tests/plugin-system.test.js`) rather than just asserted here.
- The component system has no slots and no dedicated emit API - a
  function-valued prop stands in for emit. Naming a `setup()` return value
  the same as the prop it wraps recurses forever (see the Components
  section of the README for why and the fix).
- Reactive Map/Set are unsupported - `reactive()` has no special-casing for
  them (unlike Vue's), so calling their methods on a reactive-wrapped
  instance will likely throw.
- Putting a raw `ref()` directly inside a `reactive()`/plain array (e.g.
  `reactive([ref(1), ref(2)])`) and iterating it with `v-for` happens to
  render correctly today, but only as a side effect of how the internal
  reactive-wrapping and ref-unwrapping checks interact - it isn't a
  deliberately designed/tested path. Avoid relying on it; put plain values
  in arrays and let `v-for` do its own boxing.

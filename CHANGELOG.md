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

### Fixed

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

### Removed

- `z-key` alternate spelling for `v-for`'s key attribute - use `:key`
  (matches Vue; there was never a `v-key` equivalent to replace it).

### Known limitations (not yet addressed)

- The directive registry and hook system are global/module-level singletons,
  not scoped per `createApp()` instance - a plugin installed on one app is
  visible to every app on the page.
- No automated browser testing yet (test suite runs against jsdom only).

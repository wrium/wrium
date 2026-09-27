# Wrium

**Full reactivity with minimal code size.**

Wrium is a minimalist JavaScript library for building reactive user interfaces. It allows you to write clean, declarative templates directly in your HTML and power them with a simple, yet powerful, reactivity system. Inspired by the best parts of modern frameworks, Wrium offers an intuitive developer experience with zero dependencies and no build step required.

---

## Highlights

* **Reactive primitives**: `ref` (any value), `reactive` (objects/arrays), `computed`
* **Effects**: `watchEffect` with automatic dependency tracking
* **Lightweight template compiler** for declarative DOM binding and interpolation (`{{ }}`)
* **Template directives**: `v-if`, `v-for`, `v-text`, `v-show`, `v-model`, `v-on` (shorthand `@`), `v-bind` (shorthand `:`)
* **Event modifiers**: `.prevent`, `.stop`, `.once`, `.self`, `.capture`, `.passive`, and key modifiers like `.enter`
* **Directive registry + plugin architecture**: built-in directives are registered the same way plugins register their own (e.g. `v-html` ships as an opt-in plugin, not core)
* **App lifecycle**: `createApp(...).mount(selector)` and `.unmount()`
* **Hook System**: Extend and customize behavior with lifecycle hooks
* **Async effect queue**: Batched updates with effect sorting for optimal performance
* **TypeScript declarations** generated from source, with proper generics (`ref<T>`, `computed<T>`, ...)

---

## Installation

### Via npm

```bash
npm install wrium
```

### Direct ES Module

```html
<script type="module">
  import { createApp, ref } from 'wrium.js';
  // or from a CDN (replace with the actual CDN URL once published)
  import { createApp, ref } from 'https://cdn.example.com/wrium/1.0.0/wrium.js';
</script>
```

---

## Quick Start

### Basic Counter Example

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Wrium Counter</title>
</head>
<body>
    <div id="app">
        <h1>{{ title }}</h1>
        <p>Current count: {{ count }}</p>
        <button @click="increment">Increment</button>
        <button @click="decrement">Decrement</button>
    </div>

    <script type="module">
        import { createApp, ref } from './wrium.js';

        createApp(() => {
            const title = ref('Counter App');
            const count = ref(0);

            const increment = () => count.value++;
            const decrement = () => count.value--;

            return { title, count, increment, decrement };
        }).mount('#app');
    </script>
</body>
</html>
```

---

## Core Concepts

### Reactivity Primitives

#### `ref(value)` — A reactive box around any value

Creates a reactive reference. Primitives (string, number, boolean) are tracked directly; objects and arrays are transparently handed to `reactive()`.

```js
const count = ref(0);
count.value++; // Triggers reactive updates

const user = ref({ name: 'John' });
user.value.name = 'Jane'; // Reactive, same as reactive({ name: 'John' })

// In templates, .value is automatically unwrapped:
// {{ count }} / {{ user.name }} instead of {{ count.value }} / {{ user.value.name }}
```

#### `reactive(object)` — For objects and arrays

Returns a deep reactive proxy of an object or array. This is what `ref()` uses internally for non-primitive values - reach for it directly when you don't need a separate box, just a reactive object.

```js
const state = reactive({
    user: { name: 'John', age: 30 },
    todos: ['Learn Wrium']
});

// All nested properties are reactive
state.user.age = 31;
state.todos.push('Build an app');
```

**Array reactivity**: All array methods are fully reactive:
- **Mutators**: `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`, `fill`, `copyWithin`
- **Iterators**: `map`, `filter`, `find`, `findIndex`, `findLast`, `findLastIndex`, `every`, `some`, `forEach`, `reduce`, `reduceRight`, `flat`, `flatMap`, `values`, `entries`, `keys`, `includes`, `indexOf`, `lastIndexOf`

#### `computed(getter)`

Creates a lazily evaluated, memoized reactive value.

```js
const firstName = ref('John');
const lastName = ref('Doe');

const fullName = computed(() => `${firstName.value} ${lastName.value}`);

console.log(fullName.value); // "John Doe"
firstName.value = 'Jane';
console.log(fullName.value); // "Jane Doe"
```

#### `watchEffect(fn, opts?)`

Runs a reactive effect immediately and re-runs when dependencies change.

```js
const count = ref(0);

const stop = watchEffect(() => {
    console.log('Count is:', count.value);
});

count.value++; // Logs: "Count is: 1"
stop(); // Stop watching
```

#### `nextTick(fn)`

Runs `fn` after the DOM has been updated with the latest reactive changes (effects are batched and flushed on a microtask).

```js
count.value++;
nextTick(() => {
    console.log(document.querySelector('#count').textContent); // already updated
});
```

---

### Template Interpolation

Text nodes containing `{{ expression }}` are automatically reactive:

```html
<p>Hello, {{ name }}!</p>
<p>You have {{ items.length }} items.</p>
<p>Total: {{ price * quantity }}</p>
```

---

### Template Directives

#### Conditional Rendering

**`v-if`**, **`v-else-if`**, **`v-else`**: Conditionally render elements.

```html
<div v-if="score >= 90">Excellent!</div>
<div v-else-if="score >= 70">Good job!</div>
<div v-else>Keep trying!</div>
```

**Don't combine `v-if` with `v-for` on the same element** - it's rejected at compile time (reported via the `onError` hook and `console.error`, the element is left uncompiled). Use a computed filtered list, or move `v-if` to a wrapping element, instead:

```html
<!-- Don't -->
<li v-if="show" v-for="item in items">{{ item }}</li>

<!-- Do: move v-if to a real wrapping element (there's no <template> support,
     so it has to be an actual rendering element, e.g. the containing <ul>) -->
<ul v-if="show">
    <li v-for="item in items">{{ item }}</li>
</ul>

<!-- or filter the source instead of the render -->
<li v-for="item in visibleItems">{{ item }}</li>
```

#### List Rendering

**`v-for`**: Repeat elements for each item in an array.

```html
<!-- Simple iteration -->
<li v-for="item in items">{{ item }}</li>

<!-- With index -->
<li v-for="(item, index) in items">
    {{ index + 1 }}. {{ item.name }}
</li>

<!-- With key (recommended) -->
<li v-for="item in items" :key="item.id">
    {{ item.name }}
</li>
```

**v-for behavior:**
- Object items are reactive (direct property access, and stay live when passed to a method: `@click="handleItem(item)"` receives the real reactive object)
- Primitive items are ref-wrapped internally to stay live across re-renders, but you never see the box: reading them (`{{ item }}`), binding them (`:attr="item"`), and passing them to a method (`@click="handleItem(item)"`) all hand you the raw value
- To mutate a primitive item, write to the source array by index (`items[index]++`), not the loop variable itself - same as Vue, a v-for primitive item isn't its own reactive cell
- Index is a plain number that updates correctly when array changes
- Always use `:key` with unique IDs for performance

#### Content Directives

```html
<p v-text="message"></p>          <!-- Safe textContent -->
<div v-show="isVisible">...</div> <!-- Toggle display -->
```

`v-html` (raw innerHTML) is intentionally **not** part of the core - see [Optional Plugins](#optional-plugins) below.

#### Two-Way Binding

**`v-model`**: Bind form inputs bidirectionally.

```html
<input v-model="username" />
<textarea v-model="bio"></textarea>
<input type="checkbox" v-model="agreed" />
<input type="radio" v-model="color" value="red" />
<select v-model="country">
    <option value="us">United States</option>
</select>
```

#### Event Handling

**`@event`** or **`v-on:event`**: Attach event listeners.

```html
<!-- Method handler (recommended) -->
<button @click="handleClick">Click me</button>

<!-- Inline expression -->
<button @click="count.value++">Increment</button>
<button @click="user.name = 'Jane'">Rename</button>
```

**On `.value` in inline expressions:** you only need `.value` to *reassign* a
primitive ref itself (`count.value++`, `count.value = 5`) - a bare number
can't carry the write back to the ref. Reading or mutating the *contents* of
a ref never needs `.value`, including for object refs in event handlers
(`user.name = 'Jane'` works directly when `user = ref({ name: 'John' })`,
since the object is shared by reference).

**Event modifiers** — chain one or more with dots:

```html
<form @submit.prevent="save">...</form>          <!-- e.preventDefault() -->
<button @click.stop="onClick">...</button>       <!-- e.stopPropagation() -->
<button @click.once="init">...</button>          <!-- listener fires once -->
<div @click.self="onDivClick">...</div>          <!-- ignores bubbled child clicks -->
<button @click.capture="onClick">...</button>    <!-- listen during capture phase -->
<div @scroll.passive="onScroll">...</div>        <!-- passive listener -->
```

**Key modifiers** — any modifier that isn't one of the above is matched against `e.key` (case-insensitive):

```html
<input @keyup.enter="submit" />
<input @keyup.escape="cancel" />
<div @keydown.arrowdown="moveDown"></div>
```

#### Attribute Binding

**`:attribute`** or **`v-bind:attribute`**: Dynamically bind any attribute.

```html
<img :src="imageUrl" :alt="imageAlt" />
<button :disabled="isDisabled">Submit</button>
<div :class="{ active: isActive, error: hasError }">Content</div>
<div :class="[baseClass, { active: isActive }]">Content</div>  <!-- array syntax -->
<div :style="{ color: textColor, fontSize: size + 'px' }">Text</div>
```

---

## Hook System

```js
import { onHook } from './wrium.js';

// Available hooks: beforeCompile, afterCompile, onError
onHook('beforeCompile', (el, scope, cs) => {
    console.log('Compiling:', el.tagName);
});

onHook('onError', (error, context, details) => {
    console.error(`Error in ${context}:`, error);
});
```

---

## Plugin System

Plugins can hook into compilation (`onHook`) and, more powerfully, **register their own `v-xxx` directives** through the same registry that `v-model`/`v-show`/`v-text` use internally - there is no special privilege for built-ins.

### Creating a Plugin

```js
// my-plugin.js
export const MyPlugin = {
    install(api, options) {
        // api contains: app, reactive, ref, computed, watchEffect,
        //               onHook, directive, compile, Scope, evalExp

        // Register a new v-xxx directive
        api.directive('focus', (el, exp, ctx) => {
            setTimeout(() => el.focus(), 0);
        });

        // Directives can take an argument and modifiers too, same shape as
        // Vue's: v-tooltip:top.instant="text" -> arg: 'top', modifiers: { instant: true }
        api.directive('tooltip', (el, exp, { scope, evalExp, arg, modifiers }) => {
            const position = arg || 'bottom';
            const delay = modifiers.instant ? 0 : 300;
            // ...
        });

        // Or hook into the compile pass directly
        api.onHook('beforeCompile', (el, scope, cs) => {
            // ...
        });
    }
};
```

A directive handler receives `(el, expression, ctx)`, where `ctx` is `{ scope, cs, evalExp, watchEffect, ref, reactive, arg, modifiers }` - everything needed to set up a reactive effect or listener, plus `arg` (the string after `:`, or `undefined`) and `modifiers` (an object with each dot-suffix as a truthy key, e.g. `.foo.bar` -> `{ foo: true, bar: true }`). Register cleanup through `cs` (`cs.addEffect(...)` / `cs.addListener(...)`) so it's automatically torn down when the element is removed.

**API stability (v1):** `app`, `directive`, `onHook`, `reactive`, `ref`, `computed`, `watchEffect` are the supported plugin surface and follow semver - build against these. `compile`, `Scope`, `evalExp` are also passed through for advanced cases (e.g. compiling a dynamically-created subtree), but they mirror the compiler's internals directly and can change without a major version bump.

### Using Plugins

```js
import { createApp } from './wrium.js';
import { MyPlugin } from './my-plugin.js';

createApp(() => ({ /* ... */ }))
    .use(MyPlugin, { debug: true })
    .mount('#app');
```

### Optional Plugins

**`v-html`** — sets `innerHTML` directly. Left out of core because it's an XSS risk if bound to untrusted content; install it explicitly when you need it:

```js
import { createApp } from './wrium.js';
import { HtmlPlugin } from './plugins/html.js';

createApp(() => ({ htmlContent: ref('<b>Bold</b>') }))
    .use(HtmlPlugin)
    .mount('#app');
```

```html
<div v-html="htmlContent"></div>
```

Using an unregistered `v-xxx` directive (forgetting to install its plugin) reports an error through `onHook('onError', ...)` and logs to the console - it never fails silently.

---

## Complete Example: Todo List

```html
<div id="app">
    <input v-model="newTodo" @keyup.enter="addTodo" placeholder="Add todo" />
    <button @click="addTodo">Add</button>

    <ul>
        <li v-for="(todo, index) in todos" :key="todo.id">
            <input type="checkbox" 
                   :checked="todo.done" 
                   @change="toggleTodo(todo.id)" />
            <span :class="{ done: todo.done }">
                {{ index + 1 }}. {{ todo.text }}
            </span>
            <button @click="removeTodo(todo.id)">×</button>
        </li>
    </ul>
    
    <p v-show="todos.length === 0">No todos yet!</p>
    <p>{{ remaining }} of {{ todos.length }} remaining</p>
</div>

<script type="module">
import { createApp, ref, reactive, computed } from './wrium.js';

createApp(() => {
    const newTodo = ref('');
    const todos = reactive([]);
    let nextId = 1;
    
    const remaining = computed(() => todos.filter(t => !t.done).length);

    function addTodo() {
        if (!newTodo.value.trim()) return;
        todos.push({ id: nextId++, text: newTodo.value, done: false });
        newTodo.value = '';
    }

    function removeTodo(id) {
        const idx = todos.findIndex(t => t.id === id);
        if (idx > -1) todos.splice(idx, 1);
    }

    function toggleTodo(id) {
        const todo = todos.find(t => t.id === id);
        if (todo) todo.done = !todo.done;
    }

    return { newTodo, todos, remaining, addTodo, removeTodo, toggleTodo };
}).mount('#app');
</script>
```

---

## API Reference

| Function | Description |
|----------|-------------|
| `ref(value)` | Reactive box around any value (objects/arrays use `reactive()` internally) |
| `reactive(object)` | Deep reactive proxy for objects/arrays |
| `computed(getter)` | Cached computed value |
| `watchEffect(fn, opts?)` | Auto-tracking reactive effect |
| `createApp(setup)` | Create app with `.mount()`, `.unmount()`, `.use()` |
| `nextTick(fn)` | Execute after DOM update |
| `onHook(name, fn)` | Register lifecycle hook |

## Directive Reference

| Directive | Example |
|-----------|---------|
| `{{ expr }}` | `<p>{{ message }}</p>` |
| `v-if` / `v-else-if` / `v-else` | `<div v-if="show">Text</div>` |
| `v-for` | `<li v-for="item in items" :key="item.id">` |
| `v-model` | `<input v-model="value" />` |
| `v-show` | `<div v-show="visible">` |
| `v-text` | `<p v-text="msg"></p>` |
| `v-html` *(plugin)* | `<div v-html="raw">` — requires `HtmlPlugin` |
| `@event` / `v-on:event` | `<button @click="handler">`, `<button @click.prevent.stop="h">` |
| `:attr` / `v-bind:attr` | `<img :src="url" />` |
| `:class` | `<div :class="{ active: isActive }">`, `<div :class="[base, { active }]">` |
| `:style` | `<div :style="{ color: c }">` |

---

## Browser Support

Requires ES6 Proxy support:
- Chrome 49+, Firefox 18+, Safari 10+, Edge 12+
- ❌ Internet Explorer

---

## Bundle Size

- **~9.9KB** minified (ES build), zero dependencies, no build step required
- `v-html` and any other plugin-provided directives are not counted here - they're opt-in, shipped separately from core (see [Optional Plugins](#optional-plugins))
- Type declarations (`dist/types/`) are generated at build time and add nothing to the runtime bundle

---

## TypeScript

`npm run build` also runs `build:types`, generating real `.d.ts` files from the source's JSDoc (`dist/types/wrium.d.ts`, wired up via `package.json`'s `exports.types`) - `ref`, `reactive`, `computed`, and `createApp` all carry proper generic signatures, so editors get real autocomplete without any hand-written type definitions.

---

## Project Status

Wrium (formerly Zog.js) just shipped v1.0.0 - see [CHANGELOG.md](./CHANGELOG.md) for what changed on the way here, including a couple of known limitations still open (global plugin registry, no browser test coverage yet).

## License

MIT License - Free to use in commercial and non-commercial projects.

---

Made with ❤️ for simplicity.

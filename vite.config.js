import { readFileSync } from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'vite';

const packageVersion = JSON.parse(
  readFileSync('package.json', 'utf-8')
).version;

export default defineConfig({
  build: {
    outDir: `dist/${packageVersion}`,
    minify: 'terser',
    terserOptions: {
      compress: {
        // Keep console.error/warn: they are the only visible fallback for
        // runtime errors when a consumer hasn't registered an onError hook.
        // Stripping them here made every published build fail silently.
        drop_console: false,
        drop_debugger: true,
      },
      format: {
        comments: false,
      },
      mangle: true,
    },
    lib: {
      entry: resolve(__dirname, 'src/wrium.js'),
      name: 'Wrium',
      formats: ['es', 'umd', 'iife'],
      // The package sets "type": "module", so a plain .js file is always
      // treated as ESM regardless of format - the UMD build needs the
      // unambiguous .cjs extension or require() silently loads the wrong
      // branch of its own UMD wrapper.
      fileName: (format) => format === 'umd' ? 'wrium.umd.cjs' : `wrium.${format}.js`
    },
  },
});

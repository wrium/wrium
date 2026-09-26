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
        drop_console: true,
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
      formats: ['es','umd', 'iife'],
      fileName: () => 'wrium.[format].js'
    },
  },
});

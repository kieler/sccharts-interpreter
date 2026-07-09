import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: 'public',
  resolve: {
    alias: {
      'web-interpreter': path.resolve(__dirname, 'src/bundle.ts'),
    },
  },
  build: {
    outDir: '../dist/web',
    emptyOutDir: true,
  },
});

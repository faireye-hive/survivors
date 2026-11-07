import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Canvas 2D is the only game/studio renderer.
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        game: resolve(process.cwd(), 'index.html'),
        studio: resolve(process.cwd(), 'warrior-studio.html'),
      },
    },
  },
  server: { host: '0.0.0.0', port: 3000 },
  preview: { host: '0.0.0.0', port: 3000 },
});

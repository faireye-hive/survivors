import { defineConfig } from 'vite';

// Game and character studio; test fixtures stay outside the production build.
export default defineConfig({
  base: './',
  build: { rollupOptions: { input: { game: 'index.html', character: 'character.html' } } },
  server: { host: '0.0.0.0', port: 3000 },
  preview: { host: '0.0.0.0', port: 3000 },
});

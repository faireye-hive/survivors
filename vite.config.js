import { defineConfig } from 'vite';

// Single lightweight Canvas 2D gameplay entry point; no editor build.
export default defineConfig({
  base: './',
  server: { host: '0.0.0.0', port: 3000 },
  preview: { host: '0.0.0.0', port: 3000 },
});

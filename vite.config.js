import { defineConfig } from 'vite';

// One 3D gameplay entry point; preview fixtures stay outside the production build.
export default defineConfig({
  base: './',
  server: { host: '0.0.0.0', port: 3000 },
  preview: { host: '0.0.0.0', port: 3000 },
});

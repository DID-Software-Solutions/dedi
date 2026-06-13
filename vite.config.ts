import { defineConfig } from 'vite';

export default defineConfig({
  // Project pages are served from https://<org>.github.io/dedi/
  base: '/dedi/',
  optimizeDeps: {
    exclude: ['@babylonjs/havok'],
  },
  server: { port: 3000 },
});

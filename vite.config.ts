import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// base: './' keeps asset URLs relative so the build works under
// https://<user>.github.io/<repo>/ without hard-coding the repo name.
// outDir: 'docs' so GitHub Pages can serve from main /docs.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    outDir: 'docs',
    emptyOutDir: true,
  },
});

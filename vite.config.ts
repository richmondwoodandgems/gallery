import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// GitHub Pages serves this project from /richmond-wood-and-gems/.
// The workflow sets BASE_PATH; local dev falls back to '/'.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
});

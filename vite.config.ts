import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Pages supplies its repository subpath; local development and Cloudflare use /.
  base: process.env.VITE_BASE_PATH || '/',
});

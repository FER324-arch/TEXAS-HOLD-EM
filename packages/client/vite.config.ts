import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:4000',
      '/wallet': 'http://localhost:4000',
      '/history': 'http://localhost:4000',
      '/session': 'http://localhost:4000',
      '/admin': 'http://localhost:4000'
    }
  }
});

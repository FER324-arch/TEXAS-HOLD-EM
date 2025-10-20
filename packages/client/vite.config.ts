import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react({ fastRefresh: false })],
  resolve: {
    alias: [
      { find: 'react-dom/client', replacement: path.resolve(__dirname, 'src/lib/simple-react-dom') },
      { find: 'react-dom', replacement: path.resolve(__dirname, 'src/lib/simple-react-dom') }
    ]
  },
  optimizeDeps: {
    noDiscovery: true
  },
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

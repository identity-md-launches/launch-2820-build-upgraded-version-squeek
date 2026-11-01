import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 650,
    rollupOptions: { output: { manualChunks: (id) => id.includes('/node_modules/') && /\/(viem|wagmi|@wagmi|@tanstack)\//.test(id) ? 'chain' : undefined } },
  },
});

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  publicDir: false,
  build: {
    outDir: path.resolve(__dirname, 'public'),
    emptyOutDir: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks(id) {
          // Use normalized separators to handle pnpm's content-addressable store paths.
          const normalizedId = id.replace(/\\/g, '/');
          if (
            normalizedId.includes('/react/') ||
            normalizedId.includes('/react-dom/') ||
            normalizedId.includes('/react-is/') ||
            normalizedId.includes('/scheduler/')
          ) {
            return 'vendor-react';
          }
          if (normalizedId.includes('/@mantine/')) {
            return 'vendor-mantine';
          }
        },
      },
    },
  },
  server: {
    middlewareMode: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});

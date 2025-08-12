import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        manualChunks: undefined
      },
    }
  },
  // Reduce white flash in development
  server: {
    port: 4001, // Back to default port
    strictPort: false, // Allow fallback to other ports if needed
    hmr: {
      overlay: false // Disable error overlay to reduce flash
    },
    // Add stability settings
    watch: {
      usePolling: false,
      interval: 100
    }
  },
  // Optimize CSS loading
  css: {
    devSourcemap: false // Disable CSS source maps in dev for faster loading
  },
  optimizeDeps: {
    force: false, // Don't force rebuild every time
    include: [
      'react',
      'react-dom',
      '@tauri-apps/api',
      '@tauri-apps/plugin-notification'
    ]
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
});

import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    lib: {
      entry: 'src/react.jsx',
      formats: ['es'],
      fileName: () => 'react.js',
    },
    rollupOptions: {
      external: ['react'],
    },
  },
});

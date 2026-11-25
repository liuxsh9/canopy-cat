import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: 'src/index.js',
      name: 'CanopyCat',
      formats: ['es', 'umd'],
      fileName: format => (format === 'es' ? 'canopy-cat.js' : 'canopy-cat.umd.cjs'),
    },
  },
});

import { defineConfig } from 'vite';
import { resolve } from 'path';

const entry = process.env.ENTRY || 'content';
const isDashboard = entry === 'dashboard';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: entry === 'content',
    rollupOptions: isDashboard
      ? {
          input: {
            dashboard: resolve(__dirname, 'src/dashboard/index.html'),
          },
        }
      : {
          input: resolve(__dirname, `src/${entry}/index.ts`),
          output: {
            entryFileNames: `${entry}.js`,
          },
        },
  },
});

import { execSync } from 'node:child_process';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

function git(args: string, fallback: string): string {
  try {
    return execSync(`git ${args}`).toString().trim();
  } catch {
    return fallback;
  }
}

const gitCommit = process.env.GIT_COMMIT ?? git('rev-parse HEAD', 'local');
const gitRepository = process.env.GIT_REPOSITORY ?? git('config --get remote.origin.url', 'local');

export default defineConfig({
  define: {
    __GIT_COMMIT__: JSON.stringify(gitCommit),
    __GIT_REPOSITORY__: JSON.stringify(gitRepository),
  },
  plugins: [
    // The router plugin must run before the React plugin.
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});

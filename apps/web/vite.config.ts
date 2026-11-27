import { execSync } from 'node:child_process';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

function git(args: string, fallback: string): string {
  try {
    return execSync(`git ${args}`).toString().trim();
  } catch {
    return fallback;
  }
}

const gitCommit = process.env.GIT_COMMIT ?? git('rev-parse HEAD', 'local');
const gitRepository = process.env.GIT_REPOSITORY ?? git('config --get remote.origin.url', 'local');

/**
 * Expose the checkout metadata as a virtual module so it works both in dev
 * (where define does not reach the router's split component) and in build.
 */
function gitInfoPlugin(): Plugin {
  const id = 'virtual:git-info';
  const resolvedId = `\0${id}`;

  return {
    name: 'git-info',
    resolveId(source) {
      return source === id ? resolvedId : undefined;
    },
    load(source) {
      if (source !== resolvedId) return undefined;

      return [
        `export const commit = ${JSON.stringify(gitCommit)};`,
        `export const repository = ${JSON.stringify(gitRepository)};`,
      ].join('\n');
    },
  };
}

export default defineConfig({
  plugins: [
    gitInfoPlugin(),
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

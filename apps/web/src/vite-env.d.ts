/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Injected by vite.config.ts from the current Git checkout. */
declare module 'virtual:git-info' {
  export const commit: string;
  export const repository: string;
}

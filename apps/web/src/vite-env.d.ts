/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Injected by vite.config.ts from the current Git checkout. */
declare const __GIT_COMMIT__: string;
declare const __GIT_REPOSITORY__: string;

/**
 * Injected at build time by vite.config.ts. Declared rather than imported so
 * nothing has to reach out of `src/` to read package.json at runtime.
 */
declare const __APP_VERSION__: string
declare const __BUILD_SHA__: string

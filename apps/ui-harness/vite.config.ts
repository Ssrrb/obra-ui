import { defineConfig } from 'vite';

/**
 * Vite serves the harness in Chromium: `index.html` -> `src/main.ts` ->
 * `@obra/ui` custom elements + fixtures.
 *
 * No plugins are needed — `@obra/ui` is plain ESM. Two prerequisites before the
 * first run (see README.md): `pnpm install` (links the `workspace:*` dependency)
 * and `pnpm --filter @obra/ui build` (the package entry points at `dist/`).
 * Vite resolves `@obra/ui/tokens.css` through the package `exports` map to
 * `design/generated/tokens.css`; the workspace root is inside Vite's default
 * `server.fs.allow`, so no extra fs configuration is required.
 *
 * The host/port must stay in sync with `playwright.config.ts`
 * (`webServer.url` and `use.baseURL`).
 */
export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
  },
});

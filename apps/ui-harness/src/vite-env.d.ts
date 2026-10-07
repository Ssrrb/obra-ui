/// <reference types="vite/client" />

/**
 * Vite client types: ambient declarations for the CSS side-effect imports used
 * by `src/main.ts` (`@obra/ui/tokens.css`, `./harness.css`) plus `import.meta.env`.
 *
 * Before `pnpm install` this reference is unresolved (TS2688) — the same
 * documented, dependency-only failure mode as `@obra/ui-storybook`'s Storybook
 * imports. It resolves once the workspace is installed.
 */

/**
 * ctrl webview bundle (src/ctrl/main.tsx) → dist-ctrl/.
 *
 *   pnpm build:ctrl
 *
 * - One ES module `budget-editor.js` and one `budget-editor.css` with stable
 *   names; wasm/worker assets under `assets/` without hashes, referenced
 *   relative to the script (`base: './'`), so the host can serve the folder
 *   through `webview.asWebviewUri`. Load the script with `type="module"`.
 * - Dynamic imports are inlined (no chunks to whitelist).
 * - Same CSS scoping as the embed library (vite.lib.config.ts), except for
 *   the shell stylesheet in src/ctrl/.
 * - Build flags: CTRL_BUILD on, OpenAEC integrations off, experimental tabs
 *   (3D viewer with its unpkg wasm, PDF viewer, offerte) hidden.
 * - The hidden 3D/PDF viewers are replaced by empty stand-ins (src/ctrl/stubs),
 *   which keeps three/@thatopen/pdfjs, their workers and unpkg URLs out.
 * - scripts/ctrl-manifest.mjs writes dist-ctrl/manifest.json afterwards.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import pkg from './package.json' with { type: 'json' };
import { cssScopePlugin } from './src/lib/cssScope';

const scope = cssScopePlugin();
const ctrlCssScope = {
  postcssPlugin: 'ocs-css-scope-ctrl',
  Rule(rule: Parameters<typeof scope.Rule>[0] & { source?: { input?: { file?: string } } }) {
    if (rule.source?.input?.file?.replace(/\\/g, '/').includes('/src/ctrl/')) return;
    scope.Rule(rule);
  },
};

/** Upstream modules replaced in the ctrl build (by absolute path) → stand-in. */
const STUBS: Record<string, string> = {
  'src/components/viewers/ThreeDViewer.tsx': 'src/ctrl/stubs/viewers.tsx',
  'src/components/viewers/PdfViewer.tsx': 'src/ctrl/stubs/viewers.tsx',
};
const ctrlStubs = {
  name: 'ctrl-stubs',
  enforce: 'pre' as const,
  async resolveId(this: any, source: string, importer: string | undefined) {
    if (!importer || !/Viewer$/.test(source)) return null;
    const resolved = await this.resolve(source, importer, { skipSelf: true });
    const rel = resolved && path.relative(__dirname, resolved.id).split(path.sep).join('/');
    return rel && STUBS[rel] ? path.resolve(__dirname, STUBS[rel]) : null;
  },
};

export default defineConfig({
  plugins: [ctrlStubs, react()],
  base: './',
  publicDir: false,
  // Ignore .env.* (they switch the OpenAEC integrations on); flags come from `define`.
  envDir: path.resolve(__dirname, 'src/ctrl'),
  resolve: {
    alias: {
      // The engine's ported OpenCalc calculator (not re-exported by its index).
      '@ctrlmas/budget-engine/opencalc': path.resolve(__dirname, 'node_modules/@ctrlmas/budget-engine/src/opencalc'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': '"production"',
    'process.env': '{}',
    'process.browser': 'true',
    'process.version': '"v18.0.0"',
    __APP_VERSION__: JSON.stringify(pkg.version),
    'import.meta.env.VITE_CTRL_BUILD': '"true"',
    'import.meta.env.VITE_OPENAEC_ENABLED': '"false"',
    'import.meta.env.VITE_HIDE_EXPERIMENTAL': '"true"',
  },
  css: {
    postcss: { plugins: [ctrlCssScope] },
  },
  build: {
    outDir: 'dist-ctrl',
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: false,
    target: 'es2020',
    modulePreload: false,
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 16384,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/ctrl/main.tsx'),
      output: {
        format: 'es',
        inlineDynamicImports: true,
        entryFileNames: 'budget-editor.js',
        assetFileNames: (info) =>
          (info.names ?? []).some((n) => n.endsWith('.css')) ? 'budget-editor.css' : 'assets/[name][extname]',
      },
    },
  },
  worker: {
    format: 'es',
    rollupOptions: { output: { entryFileNames: 'assets/[name].js' } },
  },
});

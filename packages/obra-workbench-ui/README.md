# @obra/workbench-ui

Native Obra navigation, shipped as an isolated built-in extension. The five
activity containers and trees use VS Code ThemeIcons, welcome content, commands
and text editors. VS Code owns all typography, colors, selection and keyboard
behavior. There is no stylesheet, webview or product icon theme.

```sh
cd ui
pnpm workbench:sync
pnpm workbench:check
pnpm --filter @obra/workbench-ui test
pnpm --filter @obra/workbench-ui test:host
pnpm --filter @obra/workbench-ui test:package
```

Sync generates `dist/extension` and `vscode/extensions/obra-workbench-ui` from
`src`. Both copies are self-contained; the product does not import the UI
checkout at runtime. The normal built-in scanner and local-extension packaging
glob discover the generated extension. No extension development flag is needed.

```sh
cd vscode
./scripts/code.sh --user-data-dir /tmp/obra-native-review --new-window
```

An empty window opens Proyectos once per profile. Production views contain
explicit empty states. Run **Obra: Mostrar proyecto de ejemplo** for the exact
Storybook project hierarchy. Every sample document opens through a read-only
`obra-sample:` content provider without writing files. **Obra: Salir de vista
previa**, a reload, or disabling `obra.sidebar.enabled` clears the in-memory
sample state. Re-enabling the setting restores empty views. The one-time
onboarding marker uses extension-owned global state; it never stores projects.

Spanish reference copy is the manifest default; English resources are included.
The sample project names follow the Spanish Storybook reference in both locales.
Human visual approval is pending. This experimental UI release includes no
backend integration, business document editing or project persistence.

The native test runner launches ordinary `code.sh` against existing build output
with `VSCODE_SKIP_PRELAUNCH=1` to avoid writing the shared built-in-extension
control file in the user's home directory. It uses no development-extension
flag. Results, full host logs and theme screenshots are in
`ui/.tmp/captures/obra-sidebar/`.

// Codicon glyphs for the workbench replica.
//
// Codicons are Microsoft's icon font shipped with VS Code. The font file is
// copied unmodified from the Code OSS fork pinned in this workspace
// (`vscode/node_modules/@vscode/codicons`) into `assets/codicon.ttf`, and this
// module exposes the same private-use codepoints the real workbench uses.
//
// License: CC BY 4.0 for the icons and MIT for the code — the full texts are in
// `assets/CODICONS-LICENSE.txt` and `assets/CODICONS-LICENSE-CODE.txt`.
//
// Preview-only. Product code never imports this module; it exists so the
// replica looks and reads like the real workbench.

export const codiconGlyphs = {
  account: 0xeb99,
  add: 0xea60,
  arrowLeft: 0xea9b,
  arrowRight: 0xea9c,
  attach: 0xec34,
  bell: 0xeaa2,
  check: 0xeab2,
  checklist: 0xeab3,
  chevronDown: 0xeab4,
  chevronRight: 0xeab6,
  chevronUp: 0xeab7,
  close: 0xea76,
  cloudDownload: 0xeac2,
  code: 0xeac4,
  commentDiscussion: 0xeac7,
  creditCard: 0xeac9,
  database: 0xeace,
  debugAlt: 0xeb91,
  ellipsis: 0xea7c,
  error: 0xea87,
  extensions: 0xeae6,
  file: 0xea7b,
  filePdf: 0xeaeb,
  files: 0xeaf0,
  folder: 0xea83,
  gitBranch: 0xec6f,
  graph: 0xeb03,
  graphLine: 0xebe2,
  inbox: 0xeb09,
  law: 0xeb12,
  layoutPanel: 0xebf2,
  layoutSidebarLeft: 0xebf3,
  layoutSidebarRight: 0xebf4,
  organization: 0xea7e,
  output: 0xeb9d,
  package: 0xeb29,
  person: 0xea67,
  project: 0xeb30,
  rootFolder: 0xeb46,
  search: 0xea6d,
  send: 0xec0f,
  settingsGear: 0xeb51,
  sourceControl: 0xea68,
  sync: 0xea77,
  table: 0xebb7,
  terminal: 0xea85,
  tools: 0xeb6d,
  warning: 0xea6c,
} as const;

export type IconName = keyof typeof codiconGlyphs;

/**
 * An inline, decorative codicon glyph. The accessible name belongs to the
 * button or tree item that owns it, never to the glyph.
 */
export function codicon(name: IconName, extraClass = ''): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = `obra-wb-icon${extraClass ? ` ${extraClass}` : ''}`;
  span.setAttribute('aria-hidden', 'true');
  span.textContent = String.fromCodePoint(codiconGlyphs[name]);
  return span;
}

// Shared scaffolding for the `Workbench/*` stories.
//
// `stage` fills the story viewport; when a story names a theme it sets the same
// `data-obra-theme` attribute the toolbar switcher sets on <html>, so the token
// layer for that subtree is pinned. Stories otherwise follow the toolbar.

import { el, workbench, type WorkbenchOptions } from '../src/workbench/workbench.js';

export type StageTheme = 'light' | 'dark' | 'high-contrast';

export function stage(theme: StageTheme | undefined, node: HTMLElement): HTMLElement {
  const attrs: Record<string, string> = { class: 'obra-wb-stage' };
  if (theme) attrs['data-obra-theme'] = theme;
  return el('div', attrs, [node]);
}

/** The full workbench, filling the story viewport, on the toolbar theme. */
export function full(options: WorkbenchOptions, theme?: StageTheme): HTMLElement {
  return stage(theme, workbench(options));
}

/** One chrome region, on a bordered frame with a label. */
export function region(label: string, node: HTMLElement, frameClass = ''): HTMLElement {
  return el('div', { class: 'obra-wb-region' }, [
    el('div', { class: 'obra-wb-region__label' }, [label]),
    el('div', { class: `obra-wb-region__frame${frameClass ? ` ${frameClass}` : ''}` }, [node]),
  ]);
}

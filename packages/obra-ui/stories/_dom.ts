// Framework-free story helpers.
//
// Stories render the framework-free @obra/ui custom elements directly as DOM
// nodes, so the story layer imports nothing at runtime except the elements
// registered once in `.storybook/preview.ts`. No lit, no framework, and no
// hardcoded colors: every value a story sets comes from an `--obra-*` token.

export type Child = Node | string;
export type StoryTheme = 'light' | 'dark' | 'high-contrast';

/**
 * Create an element with attributes and children. A bare `true` renders an
 * empty attribute (the boolean-attribute convention the components use).
 */
export function el(
  tag: string,
  attrs: Record<string, string | number | boolean> = {},
  children: Child[] = []
): HTMLElement {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    node.setAttribute(name, value === true ? '' : String(value));
  }
  node.append(...children);
  return node;
}

/** Token-spaced horizontal group. */
export function row(...children: Child[]): HTMLElement {
  return el('div', { class: 'obra-story-row' }, children);
}

/**
 * Render `children` on a themed surface so a story demonstrates exactly one
 * token layer (light / dark / high-contrast). The wrapper sets the same
 * `data-obra-theme` attribute the addon-themes switcher sets on <html>, which
 * wins for this subtree by cascade proximity.
 */
export function themed(theme: StoryTheme, ...children: Child[]): HTMLElement {
  return el('div', { 'data-obra-theme': theme, class: 'obra-story-frame' }, [
    el('div', { class: 'obra-story-surface' }, children),
  ]);
}

/**
 * A single-path inline icon using `currentColor`, so it inherits the token
 * color of its context (never a hardcoded fill).
 */
export function svgIcon(path: string, size = 14): SVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const glyph = document.createElementNS(ns, 'path');
  glyph.setAttribute('d', path);
  glyph.setAttribute('fill', 'currentColor');
  svg.appendChild(glyph);
  return svg;
}

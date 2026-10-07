// Keyboard + ARIA helpers shared by composite components (Tabs, Menu, Radio).
// Extracted from the Webview UI Toolkit's *behavior*, reimplemented here.

export type Direction = 'horizontal' | 'vertical' | 'both';

const NEXT: Record<Direction, string[]> = {
  horizontal: ['ArrowRight'],
  vertical: ['ArrowDown'],
  both: ['ArrowRight', 'ArrowDown'],
};
const PREV: Record<Direction, string[]> = {
  horizontal: ['ArrowLeft'],
  vertical: ['ArrowUp'],
  both: ['ArrowLeft', 'ArrowUp'],
};

/**
 * Roving-tabindex arrow navigation across a list of focusable elements.
 * Returns the index to focus, or -1 if the key was not handled.
 */
export function rovingIndex(
  key: string,
  current: number,
  count: number,
  dir: Direction,
  wrap = true
): number {
  if (NEXT[dir].includes(key)) return wrap ? (current + 1) % count : Math.min(current + 1, count - 1);
  if (PREV[dir].includes(key)) return wrap ? (current - 1 + count) % count : Math.max(current - 1, 0);
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  return -1;
}

/** Apply roving tabindex to a NodeList given the active index. */
export function applyRovingTabindex(items: Element[], active: number): void {
  items.forEach((el, i) => {
    if (el instanceof HTMLElement) el.tabIndex = i === active ? 0 : -1;
  });
}

export const Keys = {
  enter: 'Enter',
  space: ' ',
  escape: 'Escape',
  tab: 'Tab',
} as const;

// Shared base styles + focus treatment for every Obra custom element.
// Colors/spacing come only from --obra-* tokens (Principles 4 & 5).
export const BASE_CSS = /* css */ `
  :host {
    box-sizing: border-box;
    font-family: var(--obra-font-family-base);
    font-size: var(--obra-font-body);
    color: var(--obra-text-primary);
  }
  *, *::before, *::after { box-sizing: inherit; }
  :host([hidden]) { display: none; }
`;

// A single, consistent focus ring. Never removed, high-contrast safe.
export const FOCUS_CSS = /* css */ `
  :host(:focus-visible) [part="control"],
  [part="control"]:focus-visible {
    outline: var(--obra-border-width-thick) solid var(--obra-focus-ring);
    outline-offset: 1px;
  }
  @media (forced-colors: active) {
    :host(:focus-visible) [part="control"],
    [part="control"]:focus-visible {
      outline-color: Highlight;
    }
  }
`;

export const DISABLED_CSS = /* css */ `
  :host([disabled]) { opacity: var(--obra-opacity-disabled); pointer-events: none; }
`;

// Motion + press feedback, per the better-ui skill:
// - press scales to 0.96 over 150ms ease-out, disabled never scales
// - hover only on hover-capable pointers; no latched hover on touch
// - named transition properties, never `all`
// - all movement gated behind prefers-reduced-motion
export const MOTION_CSS = /* css */ `
  [part="control"] {
    -webkit-tap-highlight-color: transparent;
    transition-property: background-color, color, border-color, scale;
    transition-duration: 150ms;
    transition-timing-function: ease-out;
  }
  @media (hover: hover) {
    [part="control"]:hover { background-color: var(--obra-surface-hover); }
  }
  @media (prefers-reduced-motion: no-preference) {
    :host(:not([disabled])) [part="control"]:active { scale: 0.96; }
  }
`;

// Spinner/progress rotation must also respect reduced motion.
export const SPIN_CSS = /* css */ `
  @media (prefers-reduced-motion: reduce) {
    [part="spinner"], [part="ring"] { animation-duration: 0s; }
  }
`;

import { ObraElement } from '../foundations/element.js';
import { BASE_CSS, FOCUS_CSS, DISABLED_CSS } from '../foundations/styles.js';

/** Anchor attributes forwarded from the host element to the inner <a>. */
const ANCHOR_ATTRS = ['href', 'target', 'rel', 'download', 'hreflang', 'referrerpolicy', 'type'] as const;

/**
 * <obra-link href="…"> — a navigational link.
 *
 * Behavior extracted from the toolkit's `link` (design/extractions/link.yaml):
 * a link navigates, it never performs an action or a command (use Button for
 * that). Keyboard and screen-reader semantics come from a real <a> in the shadow
 * root, so Enter activates, Tab focuses, and "link" is announced for free.
 *
 * Differences from the toolkit, recorded in the extraction note: the shared
 * FOCUS_CSS ring replaces its 1px focus border, hover is gated behind
 * `@media (hover: hover)`, `rel="noopener noreferrer"` is forced for
 * target="_blank", and `disabled` yields an inert, non-navigable link.
 */
export class ObraLink extends ObraElement {
  static observedAttributes = ['disabled', ...ANCHOR_ATTRS];

  protected override styles(): string {
    return `
      ${BASE_CSS}${FOCUS_CSS}${DISABLED_CSS}
      :host { display: inline-flex; max-width: 100%; }
      [part="control"] {
        display: inline-flex; align-items: center; gap: var(--obra-space-xs);
        max-width: 100%;
        border: var(--obra-border-width-default) solid transparent;
        border-radius: var(--obra-link-radius);
        background: transparent;
        color: var(--obra-link-foreground);
        font: inherit; font-size: var(--obra-link-font-size);
        text-decoration: none; word-break: break-word;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        transition-property: color, background-color, border-color;
        transition-duration: 150ms; transition-timing-function: ease-out;
      }
      :host([disabled]) [part="control"] { cursor: default; }
      /* Hover only on hover-capable pointers, so touch never latches a hover state. */
      @media (hover: hover) {
        :host(:not([disabled])) [part="control"]:hover {
          color: var(--obra-link-foreground-active);
          text-decoration: underline;
        }
      }
      :host(:not([disabled])) [part="control"]:active {
        color: var(--obra-link-foreground-active);
      }
      @media (forced-colors: active) {
        [part="control"] { color: LinkText; }
        :host([disabled]) [part="control"] { color: GrayText; }
      }
    `;
  }

  protected override template(): string {
    return `<a part="control"><slot></slot></a>`;
  }

  private get anchor(): HTMLAnchorElement {
    return this.$('[part="control"]') as HTMLAnchorElement;
  }

  protected override onConnected(): void {
    this.sync();
    this.anchor.addEventListener('click', this.onClick);
  }

  override disconnectedCallback(): void {
    this.anchor?.removeEventListener('click', this.onClick);
  }

  override attributeChangedCallback(): void {
    if (this.isConnected) this.sync();
  }

  /** Forward the anchor attributes and reflect the disabled state. */
  private sync(): void {
    const anchor = this.anchor;
    if (!anchor) return;
    const disabled = this.getBool('disabled');

    for (const name of ANCHOR_ATTRS) {
      const value = this.getAttribute(name);
      if (value === null || (name === 'href' && disabled)) anchor.removeAttribute(name);
      else anchor.setAttribute(name, value);
    }

    // A target="_blank" link without rel is a reverse-tabnabbing hole.
    if (anchor.getAttribute('target') === '_blank' && !anchor.getAttribute('rel')) {
      anchor.setAttribute('rel', 'noopener noreferrer');
    }

    anchor.toggleAttribute('aria-disabled', disabled);
    if (disabled) anchor.setAttribute('tabindex', '-1');
    else anchor.removeAttribute('tabindex');
  }

  private onClick = (e: MouseEvent): void => {
    if (!this.getBool('disabled')) return;
    e.preventDefault();
    e.stopPropagation();
  };
}

export function defineLink(): void {
  if (!customElements.get('obra-link')) customElements.define('obra-link', ObraLink);
}

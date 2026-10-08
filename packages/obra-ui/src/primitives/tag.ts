import { ObraElement } from '../foundations/element.js';
import { BASE_CSS } from '../foundations/styles.js';

/**
 * <obra-tag> — an uppercase text label naming purpose or status.
 *
 * Behavior extracted from the toolkit's `tag` (design/extractions/tag.yaml).
 * A Tag is a *label*: numbers belong in <obra-badge>, and a Tag is neither
 * interactive nor focusable. Unlike the toolkit's FAST Badge subclass it carries
 * no role, so it is read in document order and never interrupts as a live region.
 *
 * Colors come from the badge tokens because VS Code paints both from
 * --vscode-badge-*; the square-ish radius, small uppercase type and optional
 * border are what make it a Tag.
 */
export class ObraTag extends ObraElement {
  protected override styles(): string {
    return `
      ${BASE_CSS}
      :host { display: inline-flex; max-width: 100%; }
      [part="control"] {
        display: inline-flex; align-items: center; justify-content: center;
        max-width: 100%;
        height: var(--obra-tag-height);
        padding: 0 var(--obra-tag-padding-x);
        border: var(--obra-border-width-default) solid var(--obra-tag-border);
        border-radius: var(--obra-tag-radius);
        background: var(--obra-tag-background);
        color: var(--obra-tag-foreground);
        font-size: var(--obra-tag-font-size);
        font-weight: var(--obra-font-weight-medium);
        /* Uppercase small type needs a little tracking to stay legible. */
        text-transform: uppercase; letter-spacing: 0.04em;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      @media (forced-colors: active) {
        [part="control"] {
          background: Canvas; color: CanvasText; border-color: ButtonBorder;
        }
      }
    `;
  }

  protected override template(): string {
    return `<span part="control"><slot></slot></span>`;
  }

  protected override onConnected(): void {
    // Extreme content: the label truncates with an ellipsis, and the full text is
    // exposed as a title so nothing is lost to the truncation.
    const slot = this.$('slot') as HTMLSlotElement | null;
    slot?.addEventListener('slotchange', this.onSlotChange);
    this.onSlotChange();
  }

  override disconnectedCallback(): void {
    (this.$('slot') as HTMLSlotElement | null)?.removeEventListener('slotchange', this.onSlotChange);
  }

  private onSlotChange = (): void => {
    const control = this.$('[part="control"]') as HTMLElement | null;
    if (!control) return;
    const text = this.textContent?.trim() ?? '';
    if (text && control.scrollWidth > control.clientWidth) control.setAttribute('title', text);
    else control.removeAttribute('title');
  };
}

export function defineTag(): void {
  if (!customElements.get('obra-tag')) customElements.define('obra-tag', ObraTag);
}

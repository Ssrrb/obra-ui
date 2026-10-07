import { ObraElement } from '../foundations/element.js';
import { BASE_CSS, FOCUS_CSS } from '../foundations/styles.js';
import { rovingIndex, applyRovingTabindex } from '../foundations/a11y.js';

/**
 * <obra-menu> with <obra-menu-item> children.
 * role=menu, vertical roving tabindex, Escape closes, Enter/Space activates.
 * Opened by the parent via .open(); positioning is the host's responsibility.
 */
export class ObraMenu extends ObraElement {
  static observedAttributes = ['open'];
  protected override styles(): string {
    return `${BASE_CSS}
      :host { display: none; }
      :host([open]) { display: block; }
      [part="control"] {
        min-width: 160px; padding: var(--obra-space-xs) 0;
        background: var(--obra-surface-raised); color: var(--obra-text-primary);
        border: var(--obra-border-width-default) solid var(--obra-border-default);
        border-radius: var(--obra-radius-control);
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      }`;
  }
  protected override template(): string {
    return `<div part="control" role="menu"><slot></slot></div>`;
  }
  protected override onConnected(): void {
    const menu = this.$('[part="control"]') as HTMLElement;
    menu.addEventListener('keydown', (e) => {
      const items = this.items();
      const active = items.indexOf(document.activeElement as HTMLElement);
      if (e.key === 'Escape') { e.preventDefault(); this.close(); return; }
      const next = rovingIndex(e.key, active < 0 ? 0 : active, items.length, 'vertical');
      if (next >= 0) { e.preventDefault(); items[next].focus(); applyRovingTabindex(items, next); }
    });
    menu.addEventListener('click', (e) => {
      const item = (e.target as Element).closest('obra-menu-item') as ObraMenuItem | null;
      if (item) {
        this.dispatchEvent(new CustomEvent('obra-select', { bubbles: true, composed: true, detail: { value: item.getAttribute('value') } }));
        this.close();
      }
    });
  }
  private items(): HTMLElement[] { return [...this.querySelectorAll('obra-menu-item')] as HTMLElement[]; }
  open(): void { this.setAttribute('open', ''); const f = this.items()[0]; f?.focus(); }
  close(): void {
    this.removeAttribute('open');
    this.dispatchEvent(new CustomEvent('obra-close', { bubbles: true, composed: true }));
  }
}
export const defineMenu = () =>
  customElements.get('obra-menu') || customElements.define('obra-menu', ObraMenu);

export class ObraMenuItem extends ObraElement {
  protected override styles(): string {
    return `${BASE_CSS}${FOCUS_CSS}
      :host { display: block; }
      [part="control"] {
        display: flex; align-items: center; gap: var(--obra-space-sm);
        padding: var(--obra-space-xs) var(--obra-space-sm); cursor: pointer; outline: none;
      }
      [part="control"]:hover { background: var(--obra-surface-hover); }`;
  }
  protected override template(): string {
    return `<div part="control" role="menuitem" tabindex="-1"><slot></slot></div>`;
  }
  override focus(): void { (this.$('[part="control"]') as HTMLElement)?.focus(); }
}
export const defineMenuItem = () =>
  customElements.get('obra-menu-item') || customElements.define('obra-menu-item', ObraMenuItem);

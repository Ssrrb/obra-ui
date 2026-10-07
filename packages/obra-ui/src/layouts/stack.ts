import { ObraElement } from '../foundations/element.js';
import { BASE_CSS } from '../foundations/styles.js';

/**
 * <obra-stack gap="sm|md|lg" direction="row|column"> — token-spaced layout
 * primitive. Spacing only ever comes from --obra-space-* (Principle 5).
 */
const GAP: Record<string, string> = {
  none: 'var(--obra-space-0, 0px)',
  xs: 'var(--obra-space-xs)',
  sm: 'var(--obra-space-sm)',
  md: 'var(--obra-space-md)',
  lg: 'var(--obra-space-lg)',
  xl: 'var(--obra-space-xl)',
};

export class ObraStack extends ObraElement {
  static observedAttributes = ['gap', 'direction'];
  protected override styles(): string {
    return `${BASE_CSS}
      :host { display: flex; }
      :host([direction="column"]) { flex-direction: column; }
      :host(:not([direction="column"])) { flex-direction: row; align-items: center; }`;
  }
  protected override template(): string {
    return `<div part="control"><slot></slot></div>`;
  }
  protected override onConnected(): void { this.sync(); }
  override attributeChangedCallback(): void { if (this.isConnected) this.sync(); }
  private sync(): void {
    const gap = GAP[this.getAttribute('gap') ?? 'sm'] ?? GAP.sm;
    (this.$('[part="control"]') as HTMLElement).style.gap = gap;
  }
}
export const defineStack = () =>
  customElements.get('obra-stack') || customElements.define('obra-stack', ObraStack);

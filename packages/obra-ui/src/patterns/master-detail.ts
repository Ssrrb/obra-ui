import { ObraElement } from '../foundations/element.js';
import { BASE_CSS } from '../foundations/styles.js';

/**
 * <obra-master-detail> — two-pane layout: a master list slot and a detail slot.
 * `ratio` sets the master column width. Collapses to a single pane when narrow.
 */
export class ObraMasterDetail extends ObraElement {
  static observedAttributes = ['ratio'];
  protected override styles(): string {
    return `${BASE_CSS}
      :host { display: grid; grid-template-columns: var(--obra-md-master, 30%) 1fr; height: 100%; min-height: 0; }
      [part="master"] { min-width: 0; overflow: auto; overscroll-behavior: contain;
        border-right: var(--obra-border-width-default) solid var(--obra-border-default); }
      [part="detail"] { min-width: 0; overflow: auto; overscroll-behavior: contain; }
      @container (max-width: 480px) { :host { grid-template-columns: 1fr; } }`;
  }
  protected override template(): string {
    return `<div part="master"><slot name="master"></slot></div><div part="detail"><slot></slot></div>`;
  }
  protected override onConnected(): void { this.sync(); }
  override attributeChangedCallback(): void { if (this.isConnected) this.sync(); }
  private sync(): void {
    const ratio = this.getAttribute('ratio');
    if (ratio) this.style.setProperty('--obra-md-master', ratio);
  }
}
export const defineMasterDetail = () =>
  customElements.get('obra-master-detail') || customElements.define('obra-master-detail', ObraMasterDetail);

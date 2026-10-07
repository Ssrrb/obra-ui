import { ObraElement } from '../foundations/element.js';
import { BASE_CSS } from '../foundations/styles.js';

/**
 * Shared state patterns required by Principle 8: every significant UI defines
 * loading, empty, and error. These render consistent, token-driven states with
 * an action slot so a surface can offer retry / primary action.
 */

/** <obra-section-header>Label</obra-section-header> */
export class ObraSectionHeader extends ObraElement {
  protected override styles(): string {
    return `${BASE_CSS}
      :host { display: flex; align-items: center; justify-content: space-between; gap: var(--obra-space-sm); }
      [part="title"] { font-size: var(--obra-font-small); font-weight: var(--obra-font-weight-bold);
        text-transform: uppercase; letter-spacing: 0.04em; color: var(--obra-text-secondary); }`;
  }
  protected override template(): string {
    return `<h2 part="title" role="heading" aria-level="2"><slot></slot></h2><span part="actions"><slot name="actions"></slot></span>`;
  }
}
export const defineSectionHeader = () =>
  customElements.get('obra-section-header') || customElements.define('obra-section-header', ObraSectionHeader);

const STATE_CSS = `${BASE_CSS}
  :host { display: grid; place-items: center; gap: var(--obra-space-sm);
    padding: var(--obra-space-xl); text-align: center; min-height: 120px; }
  [part="title"] { font-size: var(--obra-font-body); font-weight: var(--obra-font-weight-medium); color: var(--obra-text-primary); }
  [part="message"] { font-size: var(--obra-font-small); color: var(--obra-text-secondary); max-width: 40ch; }
  [part="actions"] { display: flex; gap: var(--obra-space-sm); margin-top: var(--obra-space-xs); }`;

/** <obra-empty-state heading="..." message="..."> + action slot */
export class ObraEmptyState extends ObraElement {
  static observedAttributes = ['heading', 'message'];
  protected override styles(): string { return STATE_CSS; }
  protected override template(): string {
    return `<div part="icon" aria-hidden="true"><slot name="icon"></slot></div>
      <div part="title"></div><div part="message"></div>
      <div part="actions"><slot name="actions"></slot></div>`;
  }
  protected override onConnected(): void { this.sync(); }
  override attributeChangedCallback(): void { if (this.isConnected) this.sync(); }
  private sync(): void {
    (this.$('[part="title"]') as HTMLElement).textContent = this.getAttribute('heading') ?? '';
    (this.$('[part="message"]') as HTMLElement).textContent = this.getAttribute('message') ?? '';
  }
}
export const defineEmptyState = () =>
  customElements.get('obra-empty-state') || customElements.define('obra-empty-state', ObraEmptyState);

/** <obra-error-state message="..."> with a retry slot/action. */
export class ObraErrorState extends ObraElement {
  static observedAttributes = ['message'];
  protected override styles(): string {
    return STATE_CSS + ` [part="title"] { color: var(--obra-text-danger); }`;
  }
  protected override template(): string {
    return `<div part="title" role="alert">Something went wrong</div>
      <div part="message"></div>
      <div part="actions"><slot name="actions"></slot></div>`;
  }
  protected override onConnected(): void { this.sync(); }
  override attributeChangedCallback(): void { if (this.isConnected) this.sync(); }
  private sync(): void {
    (this.$('[part="message"]') as HTMLElement).textContent = this.getAttribute('message') ?? '';
  }
}
export const defineErrorState = () =>
  customElements.get('obra-error-state') || customElements.define('obra-error-state', ObraErrorState);

/** <obra-loading-state label="Loading..."> */
export class ObraLoadingState extends ObraElement {
  static observedAttributes = ['label'];
  protected override styles(): string { return STATE_CSS; }
  protected override template(): string {
    return `<obra-spinner part="spinner"></obra-spinner><div part="message" role="status"></div>`;
  }
  protected override onConnected(): void {
    (this.$('[part="message"]') as HTMLElement).textContent = this.getAttribute('label') ?? 'Loading…';
  }
}
export const defineLoadingState = () =>
  customElements.get('obra-loading-state') || customElements.define('obra-loading-state', ObraLoadingState);

import { ObraElement } from '../foundations/element.js';
import { BASE_CSS, FOCUS_CSS, DISABLED_CSS } from '../foundations/styles.js';

/** <obra-icon-button icon="..." label="..."> — square button with an accessible label. */
export class ObraIconButton extends ObraElement {
  static observedAttributes = ['disabled', 'icon', 'label'];

  protected override styles(): string {
    return `${BASE_CSS}${FOCUS_CSS}${DISABLED_CSS}
      [part="control"] {
        display: inline-grid; place-items: center;
        width: var(--obra-button-height); height: var(--obra-button-height);
        border: var(--obra-border-width-default) solid transparent;
        border-radius: var(--obra-button-radius);
        background: transparent; color: var(--obra-text-primary); cursor: pointer;
      }
      [part="control"] {
        transition-property: background-color, scale;
        transition-duration: 150ms; transition-timing-function: ease-out;
        -webkit-tap-highlight-color: transparent;
      }
      @media (hover: hover) {
        [part="control"]:hover { background: var(--obra-surface-hover); }
      }
      @media (prefers-reduced-motion: no-preference) {
        :host(:not([disabled])) [part="control"]:active { scale: 0.96; }
      }
      [part="icon"] { font-size: var(--obra-font-title); line-height: 1; }`;
  }
  protected override template(): string {
    return `<button part="control" type="button"><span part="icon" aria-hidden="true"></span></button>`;
  }
  private get btn(): HTMLButtonElement { return this.$('[part="control"]') as HTMLButtonElement; }
  protected override onConnected(): void { this.sync(); }
  override attributeChangedCallback(): void { if (this.isConnected) this.sync(); }
  private sync(): void {
    const b = this.btn; if (!b) return;
    b.disabled = this.getBool('disabled');
    b.setAttribute('aria-label', this.getAttribute('label') || this.getAttribute('icon') || '');
    (this.$('[part="icon"]') as HTMLElement).textContent = this.getAttribute('icon') || '';
  }
}
export const defineIconButton = () =>
  customElements.get('obra-icon-button') || customElements.define('obra-icon-button', ObraIconButton);

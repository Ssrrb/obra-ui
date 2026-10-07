import { ObraElement } from '../foundations/element.js';
import { BASE_CSS, FOCUS_CSS, DISABLED_CSS } from '../foundations/styles.js';

const BOX_CSS = `${BASE_CSS}${FOCUS_CSS}${DISABLED_CSS}
  :host { display: inline-flex; align-items: center; gap: var(--obra-space-sm); cursor: pointer; }
  [part="box"] {
    width: 14px; height: 14px; flex: none;
    border: var(--obra-border-width-default) solid var(--obra-border-input);
    background: var(--obra-surface-input);
    display: grid; place-items: center; color: var(--obra-text-on-action);
  }
  [part="check"] { opacity: 0; font-size: 11px; line-height: 1; }
  :host([checked]) [part="check"] { opacity: 1; }
  :host([checked]) [part="box"] {
    background: var(--obra-action-primary-background);
    border-color: var(--obra-action-primary-background);
  }`;

/** <obra-checkbox> — role=checkbox, Space toggles, aria-checked reflected. */
export class ObraCheckbox extends ObraElement {
  static observedAttributes = ['checked', 'disabled'];
  protected override styles(): string { return BOX_CSS; }
  protected override template(): string {
    return `<span part="control" role="checkbox" tabindex="0" aria-checked="false">
      <span part="box"><span part="check" aria-hidden="true">✓</span></span>
      <span part="label"><slot></slot></span></span>`;
  }
  private get control(): HTMLElement { return this.$('[part="control"]') as HTMLElement; }
  protected override onConnected(): void {
    this.sync();
    this.control.addEventListener('click', this.toggle);
    this.control.addEventListener('keydown', (e) => {
      if (e.key === ' ') { e.preventDefault(); this.toggle(); }
    });
  }
  override attributeChangedCallback(): void { if (this.isConnected) this.sync(); }
  private sync(): void {
    const c = this.control; if (!c) return;
    c.setAttribute('aria-checked', String(this.getBool('checked')));
    c.tabIndex = this.getBool('disabled') ? -1 : 0;
  }
  private toggle = (): void => {
    if (this.getBool('disabled')) return;
    const next = !this.getBool('checked');
    this.setBool('checked', next);
    this.dispatchEvent(new CustomEvent('obra-change', { bubbles: true, composed: true, detail: { checked: next } }));
  };
  get checked(): boolean { return this.getBool('checked'); }
}
export const defineCheckbox = () =>
  customElements.get('obra-checkbox') || customElements.define('obra-checkbox', ObraCheckbox);

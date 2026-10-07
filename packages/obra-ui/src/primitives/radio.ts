import { ObraElement } from '../foundations/element.js';
import { BASE_CSS, FOCUS_CSS, DISABLED_CSS } from '../foundations/styles.js';
import { rovingIndex, applyRovingTabindex } from '../foundations/a11y.js';

/**
 * <obra-radio-group> with <obra-radio value="..."> children.
 * role=radiogroup + roving tabindex + arrow navigation (behavior extracted
 * from the toolkit radio-group, reimplemented without FAST).
 */
export class ObraRadioGroup extends ObraElement {
  static observedAttributes = ['value', 'disabled'];
  protected override styles(): string {
    return `${BASE_CSS}${DISABLED_CSS}
      :host { display: flex; flex-direction: column; gap: var(--obra-space-xs); }`;
  }
  protected override template(): string {
    return `<div part="control" role="radiogroup"><slot></slot></div>`;
  }
  protected override onConnected(): void {
    const group = this.$('[part="control"]') as HTMLElement;
    group.addEventListener('keydown', (e) => {
      const radios = this.radios();
      const active = radios.findIndex((r) => r.hasAttribute('checked'));
      const next = rovingIndex(e.key, active < 0 ? 0 : active, radios.length, 'vertical');
      if (next >= 0) {
        e.preventDefault();
        this.select(radios[next]);
        radios[next].focus();
      }
    });
    group.addEventListener('click', (e) => {
      const radio = (e.target as Element).closest('obra-radio') as ObraRadio | null;
      if (radio) this.select(radio);
    });
    this.syncTabindex();
  }
  private radios(): ObraRadio[] {
    return [...this.querySelectorAll('obra-radio')] as ObraRadio[];
  }
  private select(radio: ObraRadio): void {
    if (this.getBool('disabled')) return;
    this.radios().forEach((r) => r.removeAttribute('checked'));
    radio.setAttribute('checked', '');
    this.setAttribute('value', radio.getAttribute('value') ?? '');
    this.syncTabindex();
    this.dispatchEvent(new CustomEvent('obra-change', { bubbles: true, composed: true, detail: { value: radio.getAttribute('value') } }));
  }
  private syncTabindex(): void {
    const radios = this.radios();
    let active = radios.findIndex((r) => r.hasAttribute('checked'));
    if (active < 0) active = 0;
    applyRovingTabindex(radios, active);
  }
}
export const defineRadioGroup = () =>
  customElements.get('obra-radio-group') || customElements.define('obra-radio-group', ObraRadioGroup);

/** <obra-radio value="...">Label</obra-radio> — a single option in a group. */
export class ObraRadio extends ObraElement {
  static observedAttributes = ['checked', 'disabled'];
  protected override styles(): string {
    return `${BASE_CSS}${FOCUS_CSS}${DISABLED_CSS}
      :host { display: inline-flex; align-items: center; gap: var(--obra-space-sm); cursor: pointer; }
      [part="dot"] {
        width: 14px; height: 14px; flex: none; border-radius: var(--obra-radius-round);
        border: var(--obra-border-width-default) solid var(--obra-border-input);
        background: var(--obra-surface-input); display: grid; place-items: center;
      }
      [part="inner"] { width: 6px; height: 6px; border-radius: var(--obra-radius-round); background: transparent; }
      :host([checked]) [part="inner"] { background: var(--obra-action-primary-background); }`;
  }
  protected override template(): string {
    return `<span part="control" role="radio" tabindex="-1" aria-checked="false">
      <span part="dot"><span part="inner"></span></span>
      <span part="label"><slot></slot></span></span>`;
  }
  override attributeChangedCallback(): void {
    const c = this.$('[part="control"]') as HTMLElement | null;
    if (c) c.setAttribute('aria-checked', String(this.getBool('checked')));
  }
  protected override onConnected(): void { this.attributeChangedCallback(); }
}
export const defineRadio = () =>
  customElements.get('obra-radio') || customElements.define('obra-radio', ObraRadio);

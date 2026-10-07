import { ObraElement } from '../foundations/element.js';
import { BASE_CSS } from '../foundations/styles.js';

/**
 * <obra-form-field label="..." hint="..." error="..."> <control/> </obra-form-field>
 * Wraps any input primitive with a label, hint, and error message, and wires
 * aria (label + describedby + invalid). The control goes in the default slot.
 */
export class ObraFormField extends ObraElement {
  static observedAttributes = ['label', 'hint', 'error', 'required'];
  private uid = `ff-${Math.random().toString(36).slice(2, 8)}`;
  protected override styles(): string {
    return `${BASE_CSS}
      :host { display: grid; gap: var(--obra-space-1, 4px); }
      [part="label"] { font-size: var(--obra-font-small); color: var(--obra-text-primary); }
      [part="required"] { color: var(--obra-text-danger); }
      [part="hint"] { font-size: var(--obra-font-small); color: var(--obra-text-secondary); }
      [part="error"] { font-size: var(--obra-font-small); color: var(--obra-text-danger); }
      [part="error"]:empty, [part="hint"]:empty { display: none; }`;
  }
  protected override template(): string {
    return `<label part="label" for="${this.uid}"><span part="text"></span><span part="required" aria-hidden="true"></span></label>
      <span part="control"><slot></slot></span>
      <span part="hint" id="${this.uid}-hint"></span>
      <span part="error" id="${this.uid}-error" role="alert"></span>`;
  }
  protected override onConnected(): void {
    this.sync();
    const label = this.$('[part="label"]') as HTMLElement;
    label.onclick = () => {
      const control = this.querySelector('obra-text-field, obra-text-area, obra-select, input, textarea') as HTMLElement | null;
      const native = control?.shadowRoot?.querySelector('input, textarea, select') as HTMLElement | null;
      (native ?? control)?.focus();
    };
  }
  override attributeChangedCallback(): void { if (this.$('[part="text"]')) this.sync(); }
  private sync(): void {
    const hasError = !!this.getAttribute('error');
    (this.$('[part="text"]') as HTMLElement).textContent = this.getAttribute('label') ?? '';
    (this.$('[part="required"]') as HTMLElement).textContent = this.getBool('required') ? ' *' : '';
    (this.$('[part="hint"]') as HTMLElement).textContent = this.getAttribute('hint') ?? '';
    (this.$('[part="error"]') as HTMLElement).textContent = this.getAttribute('error') ?? '';
    const control = this.querySelector('[part="control"], input, textarea, obra-text-field, obra-text-area, obra-select') as HTMLElement | null;
    if (control) {
      control.id = control.id || this.uid;
      control.setAttribute('aria-label', this.getAttribute('label') ?? '');
      control.setAttribute('aria-description', [this.getAttribute('error'), this.getAttribute('hint')].filter(Boolean).join(' '));
      control.toggleAttribute('invalid', hasError);
      control.toggleAttribute('required', this.getBool('required'));
      control.setAttribute('aria-invalid', String(hasError));
      const describedby = [hasError ? `${this.uid}-error` : '', this.getAttribute('hint') ? `${this.uid}-hint` : ''].filter(Boolean).join(' ');
      if (describedby) control.setAttribute('aria-describedby', describedby);
      if (this.getBool('required')) control.setAttribute('aria-required', 'true');
    }
  }
}
export const defineFormField = () =>
  customElements.get('obra-form-field') || customElements.define('obra-form-field', ObraFormField);

/**
 * <obra-property-row label="..." value="..."> — read-only label/value pair used
 * in detail panels (PropertyRow in the plan). Extreme content: value truncates
 * with a title tooltip.
 */
export class ObraPropertyRow extends ObraElement {
  static observedAttributes = ['label', 'value'];
  protected override styles(): string {
    return `${BASE_CSS}
      :host { display: block; }
      [part="control"] { display: grid; grid-template-columns: minmax(8ch, 40%) minmax(0, 1fr); gap: var(--obra-space-sm);
        margin: 0; padding: var(--obra-space-xs) 0; border-bottom: var(--obra-border-width-default) solid var(--obra-border-default); }
      dt, dd { margin: 0; }
      [part="label"] { color: var(--obra-text-secondary); font-size: var(--obra-font-small); }
      [part="value"] { color: var(--obra-text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }`;
  }
  protected override template(): string {
    return `<dl part="control"><dt part="label"></dt><dd part="value"></dd></dl>`;
  }
  protected override onConnected(): void { this.sync(); }
  override attributeChangedCallback(): void { if (this.$('[part="label"]')) this.sync(); }
  private sync(): void {
    const label = this.getAttribute('label') ?? '';
    const value = this.getAttribute('value') ?? '';
    (this.$('[part="label"]') as HTMLElement).textContent = label;
    const v = this.$('[part="value"]') as HTMLElement;
    v.textContent = value; v.title = value;
  }
}
export const definePropertyRow = () =>
  customElements.get('obra-property-row') || customElements.define('obra-property-row', ObraPropertyRow);

/** <obra-toolbar> — horizontal action bar; slots controls, keeps spacing consistent. */
export class ObraToolbar extends ObraElement {
  protected override styles(): string {
    return `${BASE_CSS}
      :host { display: flex; align-items: center; gap: var(--obra-space-sm);
        padding: var(--obra-space-xs) var(--obra-space-sm);
        border-bottom: var(--obra-border-width-default) solid var(--obra-border-default); }
      ::slotted([slot="end"]) { margin-left: auto; }`;
  }
  protected override template(): string {
    return `<div part="control" role="toolbar" aria-orientation="horizontal"><slot></slot><slot name="end"></slot></div>`;
  }
}
export const defineToolbar = () =>
  customElements.get('obra-toolbar') || customElements.define('obra-toolbar', ObraToolbar);

/**
 * <obra-filter-bar> — a toolbar preloaded with a search field + filter slot.
 * Emits obra-filter with the current query on input (debounced by the host).
 */
export class ObraFilterBar extends ObraElement {
  static observedAttributes = ['placeholder'];
  protected override styles(): string {
    return `${BASE_CSS}
      :host { display: flex; align-items: center; gap: var(--obra-space-sm);
        padding: var(--obra-space-xs) var(--obra-space-sm); }
      [part="search"] { flex: 1; min-width: 0; }`;
  }
  protected override template(): string {
    return `<obra-text-field part="search" type="search"><span slot="label"></span></obra-text-field>
      <span part="filters"><slot name="filters"></slot></span>`;
  }
  protected override onConnected(): void {
    const field = this.$('[part="search"]') as HTMLElement & { setAttribute: (k: string, v: string) => void };
    field.setAttribute('placeholder', this.getAttribute('placeholder') ?? 'Filter…');
    field.addEventListener('obra-input', (e) => {
      const detail = (e as CustomEvent<{ value: string }>).detail;
      this.dispatchEvent(new CustomEvent('obra-filter', { bubbles: true, composed: true, detail }));
    });
  }
}
export const defineFilterBar = () =>
  customElements.get('obra-filter-bar') || customElements.define('obra-filter-bar', ObraFilterBar);

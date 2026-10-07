import { ObraElement } from '../foundations/element.js';
import { BASE_CSS, FOCUS_CSS, DISABLED_CSS } from '../foundations/styles.js';

const INPUT_CSS = `${BASE_CSS}${FOCUS_CSS}${DISABLED_CSS}
  :host { display: block; }
  [part="control"] {
    display: flex; align-items: center;
    height: var(--obra-text-field-height);
    background: var(--obra-text-field-background);
    color: var(--obra-text-field-foreground);
    border: var(--obra-border-width-default) solid var(--obra-text-field-border);
    border-radius: var(--obra-text-field-radius);
    padding: 0 var(--obra-text-field-padding-x);
  }
  :host([invalid]) [part="control"] {
    background: var(--obra-text-field-background-error);
    border-color: var(--obra-text-field-border-error);
  }
  input, textarea {
    flex: 1; min-width: 0; border: 0; background: transparent; color: inherit;
    font: inherit; outline: none; padding: 0; resize: none;
  }
  input::placeholder, textarea::placeholder { color: var(--obra-text-secondary); }`;

/** <obra-text-field> — single-line text input with value/placeholder/invalid. */
export class ObraTextField extends ObraElement {
  static observedAttributes = ['value', 'placeholder', 'disabled', 'invalid', 'type'];
  protected override styles(): string { return INPUT_CSS; }
  protected override template(): string {
    return `<span part="control"><input part="input" /></span>`;
  }
  private get input(): HTMLInputElement { return this.$('[part="input"]') as HTMLInputElement; }
  protected override onConnected(): void {
    this.sync();
    this.input.addEventListener('input', () => {
      this.setAttribute('value', this.input.value);
      this.dispatchEvent(new CustomEvent('obra-input', { bubbles: true, composed: true, detail: { value: this.input.value } }));
    });
  }
  override attributeChangedCallback(): void { if (this.isConnected) this.sync(); }
  private sync(): void {
    const i = this.input; if (!i) return;
    i.value = this.getAttribute('value') ?? '';
    i.placeholder = this.getAttribute('placeholder') ?? '';
    i.type = this.getAttribute('type') ?? 'text';
    i.disabled = this.getBool('disabled');
    i.setAttribute('aria-invalid', String(this.getBool('invalid')));
  }
  get value(): string { return this.input?.value ?? this.getAttribute('value') ?? ''; }
}
export const defineTextField = () =>
  customElements.get('obra-text-field') || customElements.define('obra-text-field', ObraTextField);

/** <obra-text-area> — multi-line variant sharing the same tokens/behavior. */
export class ObraTextArea extends ObraElement {
  static observedAttributes = ['value', 'placeholder', 'disabled', 'invalid', 'rows'];
  protected override styles(): string {
    return INPUT_CSS.replace('height: var(--obra-text-field-height);', 'min-height: calc(var(--obra-text-field-height) * 2);')
      .replace('align-items: center;', 'align-items: stretch; padding: var(--obra-space-xs) 0;');
  }
  protected override template(): string {
    return `<span part="control"><textarea part="input" rows="3"></textarea></span>`;
  }
  private get input(): HTMLTextAreaElement { return this.$('[part="input"]') as HTMLTextAreaElement; }
  protected override onConnected(): void { this.sync(); }
  override attributeChangedCallback(): void { if (this.isConnected) this.sync(); }
  private sync(): void {
    const i = this.input; if (!i) return;
    i.value = this.getAttribute('value') ?? '';
    i.placeholder = this.getAttribute('placeholder') ?? '';
    i.disabled = this.getBool('disabled');
    i.rows = Number(this.getAttribute('rows') ?? 3);
  }
  get value(): string { return this.input?.value ?? ''; }
}
export const defineTextArea = () =>
  customElements.get('obra-text-area') || customElements.define('obra-text-area', ObraTextArea);

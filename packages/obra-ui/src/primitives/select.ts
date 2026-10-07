import { ObraElement } from '../foundations/element.js';
import { BASE_CSS, FOCUS_CSS, DISABLED_CSS } from '../foundations/styles.js';

/**
 * <obra-select> with <obra-option value="...">Label</obra-option> children.
 * Uses a native <select> under the hood for correct keyboard/ARIA behavior,
 * themed with tokens (the toolkit mapped dropdown -> --vscode-dropdown-*).
 */
export class ObraSelect extends ObraElement {
  static observedAttributes = ['disabled', 'value', 'aria-label', 'aria-description', 'required'];
  private observer: MutationObserver | null = null;
  protected override styles(): string {
    return `${BASE_CSS}${FOCUS_CSS}${DISABLED_CSS}
      [part="control"] {
        display: flex; align-items: center; height: var(--obra-button-height);
        background: var(--obra-surface-input); color: var(--obra-text-primary);
        border: var(--obra-border-width-default) solid var(--obra-border-input);
        border-radius: var(--obra-text-field-radius); padding: 0 var(--obra-space-xs);
      }
      select { flex: 1; min-width: 0; border: 0; background: transparent; color: inherit; font: inherit; }
      select:focus-visible { outline: var(--obra-border-width-thick) solid var(--obra-focus-ring); }`;
  }
  protected override template(): string {
    return `<span part="control"><select part="select" aria-label="select"><slot></slot></select></span>`;
  }
  private get select(): HTMLSelectElement { return this.$('[part="select"]') as HTMLSelectElement; }
  protected override onConnected(): void {
    // Project light-DOM <obra-option> children into native <option>s.
    const rebuild = () => {
      const sel = this.select; if (!sel) return;
      sel.innerHTML = '';
      for (const opt of this.querySelectorAll('obra-option')) {
        const o = document.createElement('option');
        o.value = opt.getAttribute('value') ?? '';
        o.textContent = opt.textContent ?? '';
        sel.appendChild(o);
      }
      const v = this.getAttribute('value');
      if (v != null) sel.value = v;
      this.sync();
    };
    rebuild();
    this.observer?.disconnect();
    this.observer = new MutationObserver(rebuild);
    this.observer.observe(this, { childList: true, subtree: true, characterData: true });
    this.select.onchange = () => {
      this.setAttribute('value', this.select.value);
      this.dispatchEvent(new CustomEvent('obra-change', { bubbles: true, composed: true, detail: { value: this.select.value } }));
    };
  }
  override disconnectedCallback(): void { this.observer?.disconnect(); }
  override attributeChangedCallback(): void { this.sync(); }
  private sync(): void {
    const select = this.select;
    if (!select) return;
    const value = this.getAttribute('value');
    if (value !== null) select.value = value;
    select.disabled = this.getBool('disabled');
    select.setAttribute('aria-label', this.getAttribute('aria-label') ?? 'Select');
    select.setAttribute('aria-description', this.getAttribute('aria-description') ?? '');
    select.required = this.getBool('required');
  }
  get value(): string { return this.select?.value ?? this.getAttribute('value') ?? ''; }
}
export const defineSelect = () =>
  customElements.get('obra-select') || customElements.define('obra-select', ObraSelect);

/** <obra-option value="...">Label</obra-option> — data child of obra-select. */
export class ObraOption extends HTMLElement {}
export const defineOption = () =>
  customElements.get('obra-option') || customElements.define('obra-option', ObraOption);

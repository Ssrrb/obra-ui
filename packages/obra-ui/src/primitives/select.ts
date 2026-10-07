import { ObraElement } from '../foundations/element.js';
import { BASE_CSS, FOCUS_CSS, DISABLED_CSS } from '../foundations/styles.js';

/**
 * <obra-select> with <obra-option value="...">Label</obra-option> children.
 * Uses a native <select> under the hood for correct keyboard/ARIA behavior,
 * themed with tokens (the toolkit mapped dropdown -> --vscode-dropdown-*).
 */
export class ObraSelect extends ObraElement {
  static observedAttributes = ['disabled', 'value'];
  protected override styles(): string {
    return `${BASE_CSS}${FOCUS_CSS}${DISABLED_CSS}
      [part="control"] {
        display: flex; align-items: center; height: var(--obra-button-height);
        background: var(--obra-surface-input); color: var(--obra-text-primary);
        border: var(--obra-border-width-default) solid var(--obra-border-input);
        border-radius: var(--obra-text-field-radius); padding: 0 var(--obra-space-xs);
      }
      select { flex: 1; border: 0; background: transparent; color: inherit; font: inherit; outline: none; }`;
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
      sel.disabled = this.getBool('disabled');
    };
    rebuild();
    new MutationObserver(rebuild).observe(this, { childList: true, subtree: true, characterData: true });
    this.select.addEventListener('change', () => {
      this.setAttribute('value', this.select.value);
      this.dispatchEvent(new CustomEvent('obra-change', { bubbles: true, composed: true, detail: { value: this.select.value } }));
    });
  }
  get value(): string { return this.select?.value ?? this.getAttribute('value') ?? ''; }
}
export const defineSelect = () =>
  customElements.get('obra-select') || customElements.define('obra-select', ObraSelect);

/** <obra-option value="...">Label</obra-option> — data child of obra-select. */
export class ObraOption extends HTMLElement {}
export const defineOption = () =>
  customElements.get('obra-option') || customElements.define('obra-option', ObraOption);

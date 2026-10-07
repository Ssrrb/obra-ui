import { ObraElement } from '../foundations/element.js';
import { BASE_CSS, FOCUS_CSS, DISABLED_CSS } from '../foundations/styles.js';
import { Keys } from '../foundations/a11y.js';

export type ButtonVariant = 'primary' | 'secondary';

/**
 * <obra-button variant="primary|secondary">
 * Behavior extracted from the toolkit's button: role=button, Space/Enter
 * activation, disabled handling, focus-visible ring. No FAST.
 */
export class ObraButton extends ObraElement {
  static observedAttributes = ['variant', 'disabled', 'loading'];

  protected override styles(): string {
    return `
      ${BASE_CSS}${FOCUS_CSS}${DISABLED_CSS}
      [part="control"] {
        display: inline-flex; align-items: center; gap: var(--obra-space-sm);
        height: var(--obra-button-height);
        padding: 0 var(--obra-button-padding-x);
        border: var(--obra-border-width-default) solid transparent;
        border-radius: var(--obra-button-radius);
        font: inherit; font-weight: var(--obra-font-weight-medium);
        cursor: pointer; user-select: none; white-space: nowrap;
        background: var(--obra-button-primary-background);
        color: var(--obra-button-primary-foreground);
        -webkit-tap-highlight-color: transparent;
        transition-property: background-color, color, scale;
        transition-duration: 150ms; transition-timing-function: ease-out;
      }
      :host([variant="secondary"]) [part="control"] {
        background: var(--obra-button-secondary-background);
        color: var(--obra-button-secondary-foreground);
      }
      @media (hover: hover) {
        [part="control"]:hover { background: var(--obra-button-primary-background-hover); }
        :host([variant="secondary"]) [part="control"]:hover { background: var(--obra-button-secondary-background-hover); }
      }
      @media (prefers-reduced-motion: no-preference) {
        :host(:not([disabled]):not([loading])) [part="control"]:active { scale: 0.96; }
      }
      :host([loading]) [part="control"] { cursor: progress; }
      :host([loading]) [part="label"] { opacity: var(--obra-opacity-disabled); }
      [part="spinner"] { display: none; }
      :host([loading]) [part="spinner"] { display: inline-block; }
      @keyframes obra-spin { to { transform: rotate(360deg); } }
      [part="spinner"] {
        width: 12px; height: 12px; border-radius: var(--obra-radius-round);
        border: 2px solid currentColor; border-top-color: transparent;
        animation: obra-spin 0.7s linear infinite;
      }
      @media (prefers-reduced-motion: reduce) {
        [part="spinner"] { animation-duration: 0s; }
      }
    `;
  }

  protected override template(): string {
    return `<span part="control" role="button" tabindex="0" aria-disabled="false">
      <span part="spinner" aria-hidden="true"></span>
      <span part="label"><slot></slot></span>
    </span>`;
  }

  private get control(): HTMLElement {
    return this.$('[part="control"]') as HTMLElement;
  }

  protected override onConnected(): void {
    this.sync();
    this.control.addEventListener('keydown', this.onKeyDown);
    this.control.addEventListener('click', this.onClick);
  }

  override disconnectedCallback(): void {
    this.control?.removeEventListener('keydown', this.onKeyDown);
    this.control?.removeEventListener('click', this.onClick);
  }

  override attributeChangedCallback(): void {
    if (this.isConnected) this.sync();
  }

  private sync(): void {
    const disabled = this.getBool('disabled');
    const control = this.control;
    if (!control) return;
    control.setAttribute('aria-disabled', String(disabled || this.getBool('loading')));
    control.tabIndex = disabled ? -1 : 0;
  }

  private onClick = (): void => {
    if (this.getBool('disabled') || this.getBool('loading')) return;
    this.dispatchEvent(new CustomEvent('obra-activate', { bubbles: true, composed: true }));
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.getBool('disabled') || this.getBool('loading')) return;
    if (e.key === Keys.enter || e.key === Keys.space) {
      e.preventDefault();
      this.onClick();
    }
  };
}

export function defineButton(): void {
  if (!customElements.get('obra-button')) customElements.define('obra-button', ObraButton);
}

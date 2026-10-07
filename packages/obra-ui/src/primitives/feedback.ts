import { ObraElement } from '../foundations/element.js';
import { BASE_CSS } from '../foundations/styles.js';

/** <obra-divider orientation="horizontal|vertical"> */
export class ObraDivider extends ObraElement {
  static observedAttributes = ['orientation'];
  protected override styles(): string {
    return `${BASE_CSS}
      :host { display: block; }
      :host([orientation="vertical"]) { display: inline-block; height: 100%; }
      [part="control"] { border: 0; margin: 0; background: var(--obra-border-default); }
      :host(:not([orientation="vertical"])) [part="control"] { height: var(--obra-border-width-default); width: 100%; }
      :host([orientation="vertical"]) [part="control"] { width: var(--obra-border-width-default); height: 100%; }`;
  }
  protected override template(): string {
    return `<hr part="control" role="separator" />`;
  }
  protected override onConnected(): void {
    const sep = this.$('[part="control"]') as HTMLElement;
    sep.setAttribute('aria-orientation', this.getAttribute('orientation') ?? 'horizontal');
  }
}
export const defineDivider = () =>
  customElements.get('obra-divider') || customElements.define('obra-divider', ObraDivider);

/** <obra-spinner label="Loading"> — indeterminate activity indicator. */
export class ObraSpinner extends ObraElement {
  protected override styles(): string {
    return `${BASE_CSS}
      :host { display: inline-flex; align-items: center; gap: var(--obra-space-sm); }
      @keyframes obra-spin { to { transform: rotate(360deg); } }
      [part="ring"] {
        width: 16px; height: 16px; border-radius: var(--obra-radius-round);
        border: 2px solid var(--obra-border-default);
        border-top-color: var(--obra-action-primary-background);
        animation: obra-spin 0.7s linear infinite;
      }
      @media (prefers-reduced-motion: reduce) { [part="ring"] { animation-duration: 0s; } }`;
  }
  protected override template(): string {
    return `<span part="ring" role="progressbar" aria-label="loading"></span><span part="label"><slot></slot></span>`;
  }
}
export const defineSpinner = () =>
  customElements.get('obra-spinner') || customElements.define('obra-spinner', ObraSpinner);

/** <obra-progress value="0..100"> — determinate bar; indeterminate when no value. */
export class ObraProgress extends ObraElement {
  static observedAttributes = ['value', 'aria-label', 'aria-valuetext'];
  protected override styles(): string {
    return `${BASE_CSS}
      :host { display: block; width: 100%; }
      [part="track"] { height: 4px; background: var(--obra-surface-hover); border-radius: var(--obra-radius-round); overflow: hidden; }
      [part="bar"] { height: 100%; width: 0%; background: var(--obra-action-primary-background); transition: width 0.15s ease; }`;
  }
  protected override template(): string {
    return `<div part="track" role="progressbar" aria-valuemin="0" aria-valuemax="100"><div part="bar"></div></div>`;
  }
  protected override onConnected(): void { this.sync(); }
  override attributeChangedCallback(): void { if (this.$('[part="bar"]')) this.sync(); }
  private sync(): void {
    const v = Number(this.getAttribute('value') ?? NaN);
    const pct = Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
    (this.$('[part="bar"]') as HTMLElement).style.width = `${pct}%`;
    const track = this.$('[part="track"]');
    track?.setAttribute('aria-valuenow', String(pct));
    track?.setAttribute('aria-label', this.getAttribute('aria-label') ?? 'Progress');
    track?.setAttribute('aria-valuetext', this.getAttribute('aria-valuetext') ?? `${pct}%`);
  }
}
export const defineProgress = () =>
  customElements.get('obra-progress') || customElements.define('obra-progress', ObraProgress);

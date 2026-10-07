import { ObraElement } from '../foundations/element.js';
import { BASE_CSS } from '../foundations/styles.js';

/** <obra-badge> — small count/status pill. Maps to --vscode-badge-*. */
export class ObraBadge extends ObraElement {
  protected override styles(): string {
    return `${BASE_CSS}
      :host { display: inline-flex; }
      [part="control"] {
        display: inline-flex; align-items: center; justify-content: center;
        min-width: 18px; height: 18px; padding: 0 var(--obra-badge-padding-x);
        border-radius: var(--obra-badge-radius);
        background: var(--obra-badge-background); color: var(--obra-badge-foreground);
        font-size: var(--obra-font-small); font-weight: var(--obra-font-weight-medium);
      }`;
  }
  protected override template(): string {
    return `<span part="control" role="status"><slot></slot></span>`;
  }
}
export const defineBadge = () =>
  customElements.get('obra-badge') || customElements.define('obra-badge', ObraBadge);

import { ObraElement } from '../foundations/element.js';
import { BASE_CSS } from '../foundations/styles.js';

/**
 * <obra-tooltip text="..."><target/></obra-tooltip>
 * Shows on hover/focus of the slotted content. role=tooltip on the popup,
 * aria-describedby wired to the trigger. Pure CSS positioning via tokens.
 */
let uid = 0;
export class ObraTooltip extends ObraElement {
  private tipId = `obra-tooltip-${++uid}`;
  protected override styles(): string {
    return `${BASE_CSS}
      :host { display: inline-block; position: relative; }
      [part="bubble"] {
        position: absolute; z-index: 10; left: 50%; bottom: calc(100% + 6px);
        transform: translateX(-50%); white-space: nowrap; pointer-events: none;
        background: var(--obra-surface-raised); color: var(--obra-text-primary);
        border: var(--obra-border-width-default) solid var(--obra-border-default);
        border-radius: var(--obra-radius-control); padding: var(--obra-space-1, 4px) var(--obra-space-sm);
        font-size: var(--obra-font-small); opacity: 0; transition: opacity 0.1s ease;
      }
      :host([open]) [part="bubble"] { opacity: 1; }`;
  }
  protected override template(): string {
    return `<span part="trigger"><slot></slot></span><span part="bubble" role="tooltip" id="${this.tipId}"></span>`;
  }
  protected override onConnected(): void {
    const bubble = this.$('[part="bubble"]') as HTMLElement;
    bubble.textContent = this.getAttribute('text') ?? '';
    const trigger = this.$('[part="trigger"]') as HTMLElement;
    trigger.setAttribute('aria-describedby', this.tipId);
    const open = () => this.setAttribute('open', '');
    const close = () => this.removeAttribute('open');
    trigger.addEventListener('mouseenter', open);
    trigger.addEventListener('mouseleave', close);
    trigger.addEventListener('focusin', open);
    trigger.addEventListener('focusout', close);
  }
}
export const defineTooltip = () =>
  customElements.get('obra-tooltip') || customElements.define('obra-tooltip', ObraTooltip);

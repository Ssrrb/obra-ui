import { ObraElement } from '../foundations/element.js';
import { BASE_CSS, FOCUS_CSS } from '../foundations/styles.js';
import { rovingIndex, applyRovingTabindex } from '../foundations/a11y.js';

/**
 * <obra-tabs> with <obra-tab id="..">Label</obra-tab> + <obra-tab-panel for="..">.
 * role=tablist, horizontal roving tabindex, Arrow/Home/End, activates on select.
 */
export class ObraTabs extends ObraElement {
  static observedAttributes = ['active'];
  protected override styles(): string {
    return `${BASE_CSS}
      :host { display: block; }
      [part="tablist"] { display: flex; gap: var(--obra-space-xs); border-bottom: var(--obra-border-width-default) solid var(--obra-border-default); }`;
  }
  protected override template(): string {
    return `<div part="tablist" role="tablist"><slot name="tab"></slot></div><slot></slot>`;
  }
  protected override onConnected(): void {
    const list = this.$('[part="tablist"]') as HTMLElement;
    list.addEventListener('keydown', (e) => {
      const tabs = this.tabs();
      const active = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
      const next = rovingIndex(e.key, active < 0 ? 0 : active, tabs.length, 'horizontal');
      if (next >= 0) { e.preventDefault(); this.activate(tabs[next]); tabs[next].focus(); }
    });
    list.addEventListener('click', (e) => {
      const tab = (e.target as Element).closest('obra-tab') as ObraTab | null;
      if (tab) this.activate(tab);
    });
    this.syncFromAttr();
  }
  override attributeChangedCallback(_name?: string, oldValue?: string | null, newValue?: string | null): void {
    if (this.isConnected && oldValue !== newValue) this.syncFromAttr();
  }
  private tabs(): ObraTab[] { return [...this.querySelectorAll('obra-tab')] as ObraTab[]; }
  private activate(tab: ObraTab): void {
    const id = tab.getAttribute('id') ?? '';
    if (this.getAttribute('active') !== id) {
      this.setAttribute('active', id);
      return; // attribute callback performs the update once, without recursion
    }
    this.tabs().forEach((t) => {
      const on = t === tab;
      t.setAttribute('role', 'tab');
      t.setAttribute('aria-selected', String(on));
      t.setAttribute('aria-controls', `${t.id}-panel`);
      t.tabIndex = on ? 0 : -1;
      const panel = this.querySelector(`obra-tab-panel[for="${t.getAttribute('id')}"]`);
      if (panel) {
        panel.id = `${t.id}-panel`;
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', t.id);
        (panel as HTMLElement).hidden = !on;
      }
    });
    this.dispatchEvent(new CustomEvent('obra-change', { bubbles: true, composed: true, detail: { active: id } }));
  }
  private syncFromAttr(): void {
    const tabs = this.tabs();
    if (!tabs.length) return;
    const wanted = this.getAttribute('active');
    const target = tabs.find((t) => t.getAttribute('id') === wanted) ?? tabs[0];
    this.activate(target);
    applyRovingTabindex(tabs, tabs.indexOf(target));
  }
}
export const defineTabs = () =>
  customElements.get('obra-tabs') || customElements.define('obra-tabs', ObraTabs);

export class ObraTab extends ObraElement {
  protected override styles(): string {
    return `${BASE_CSS}${FOCUS_CSS}
      :host { display: inline-block; }
      :host(:focus-visible) { outline: var(--obra-border-width-thick) solid var(--obra-focus-ring); }
      [part="control"] {
        display: inline-flex; align-items: center; height: var(--obra-button-height);
        padding: 0 var(--obra-space-sm); cursor: pointer; color: var(--obra-text-secondary);
        border-bottom: 2px solid transparent; margin-bottom: -1px;
      }
      :host([aria-selected="true"]) [part="control"] {
        color: var(--obra-text-primary); border-bottom-color: var(--obra-action-primary-background);
      }`;
  }
  protected override template(): string {
    return `<span part="control"><slot></slot></span>`;
  }
}
export const defineTab = () =>
  customElements.get('obra-tab') || customElements.define('obra-tab', ObraTab);

export class ObraTabPanel extends ObraElement {
  protected override styles(): string {
    return `${BASE_CSS} :host { display: block; padding: var(--obra-space-sm) 0; } :host([hidden]) { display: none; }`;
  }
  protected override template(): string {
    return `<div part="control"><slot></slot></div>`;
  }
}
export const defineTabPanel = () =>
  customElements.get('obra-tab-panel') || customElements.define('obra-tab-panel', ObraTabPanel);

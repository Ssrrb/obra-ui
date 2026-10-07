import { ObraElement } from '../foundations/element.js';
import { BASE_CSS } from '../foundations/styles.js';

/**
 * <obra-confirmation-dialog heading="..." message="..." confirm-label="Cancel?" danger>
 * Accessible modal: role=alertdialog, focus trapped, Escape cancels, Enter
 * confirms. Emits obra-confirm / obra-cancel. Uses the native <dialog> for
 * correct top-layer + backdrop behavior.
 */
export class ObraConfirmationDialog extends ObraElement {
  static observedAttributes = ['heading', 'message', 'confirm-label', 'cancel-label', 'danger', 'open'];
  protected override styles(): string {
    return `${BASE_CSS}
      dialog {
        border: var(--obra-border-width-default) solid var(--obra-border-default);
        border-radius: var(--obra-radius-surface); padding: 0; color: var(--obra-text-primary);
        background: var(--obra-surface-raised); max-width: 420px; width: calc(100% - 2 * var(--obra-space-lg));
      }
      dialog::backdrop { background: rgba(0,0,0,0.4); }
      [part="body"] { display: grid; gap: var(--obra-space-sm); padding: var(--obra-space-lg); }
      [part="heading"] { font-size: var(--obra-font-body); font-weight: var(--obra-font-weight-bold); margin: 0; }
      [part="message"] { font-size: var(--obra-font-small); color: var(--obra-text-secondary); margin: 0; }
      [part="actions"] { display: flex; justify-content: flex-end; gap: var(--obra-space-sm); }`;
  }
  protected override template(): string {
    return `<dialog part="dialog" aria-modal="true" role="alertdialog">
      <div part="body">
        <h2 part="heading"></h2><p part="message"></p>
        <div part="actions">
          <obra-button variant="secondary" part="cancel"></obra-button>
          <obra-button part="confirm"></obra-button>
        </div>
      </div></dialog>`;
  }
  private get dialog(): HTMLDialogElement { return this.$('[part="dialog"]') as HTMLDialogElement; }
  protected override onConnected(): void {
    this.sync();
    this.dialog.addEventListener('cancel', (e) => { e.preventDefault(); this.cancel(); });
    (this.$('[part="confirm"]') as HTMLElement).addEventListener('obra-activate', () => this.confirm());
    (this.$('[part="cancel"]') as HTMLElement).addEventListener('obra-activate', () => this.cancel());
  }
  override attributeChangedCallback(): void { if (this.isConnected) this.sync(); }
  private sync(): void {
    (this.$('[part="heading"]') as HTMLElement).textContent = this.getAttribute('heading') ?? 'Are you sure?';
    (this.$('[part="message"]') as HTMLElement).textContent = this.getAttribute('message') ?? '';
    const confirm = this.$('[part="confirm"]') as HTMLElement;
    confirm.textContent = this.getAttribute('confirm-label') ?? 'Confirm';
    if (this.getBool('danger')) confirm.setAttribute('variant', 'primary');
    (this.$('[part="cancel"]') as HTMLElement).textContent = this.getAttribute('cancel-label') ?? 'Cancel';
    this.dialog.setAttribute('aria-label', this.getAttribute('heading') ?? 'Confirmation');
  }
  open(): void { if (!this.dialog.open) this.dialog.showModal(); this.setAttribute('open', ''); }
  close(): void { if (this.dialog.open) this.dialog.close(); this.removeAttribute('open'); }
  private confirm(): void { this.close(); this.dispatchEvent(new CustomEvent('obra-confirm', { bubbles: true, composed: true })); }
  private cancel(): void { this.close(); this.dispatchEvent(new CustomEvent('obra-cancel', { bubbles: true, composed: true })); }
}
export const defineConfirmationDialog = () =>
  customElements.get('obra-confirmation-dialog') || customElements.define('obra-confirmation-dialog', ObraConfirmationDialog);

/**
 * Minimal base class for Obra custom elements.
 * - attaches a shadow root
 * - injects shared base/focus/disabled styles once per element
 * - provides helpers for boolean reflected attributes
 *
 * Deliberately framework-free: this is our own implementation, not FAST
 * (see design/COMPONENT_RULES.md — we extract behavior, not architecture).
 */
export abstract class ObraElement extends HTMLElement {
  protected root: ShadowRoot;
  private rendered = false;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
  }

  /** Subclasses return their own <style> + markup; base styles are prepended. */
  protected abstract styles(): string;
  protected abstract template(): string;

  protected render(): void {
    this.root.innerHTML = `<style>${this.styles()}</style>${this.template()}`;
    this.rendered = true;
  }

  connectedCallback(): void {
    if (!this.rendered) this.render();
    this.onConnected();
  }

  /** Lifecycle hooks declared here so subclasses can `override` them. */
  attributeChangedCallback(_name?: string, _old?: string | null, _new?: string | null): void {
    /* override in subclass */
  }
  disconnectedCallback(): void {
    /* override in subclass */
  }

  protected onConnected(): void {
    /* override in subclass */
  }

  protected getBool(name: string): boolean {
    return this.hasAttribute(name);
  }

  protected setBool(name: string, on: boolean): void {
    if (on) this.setAttribute(name, '');
    else this.removeAttribute(name);
  }

  protected $(sel: string): Element | null {
    return this.root.querySelector(sel);
  }
}

let injectedBase = false;
/** Inject the generated token layer into a document once (harness/Storybook). */
export function ensureTokens(doc: Document, css: string): void {
  if (injectedBase) return;
  const style = doc.createElement('style');
  style.setAttribute('data-obra-tokens', '');
  style.textContent = css;
  doc.head.appendChild(style);
  injectedBase = true;
}

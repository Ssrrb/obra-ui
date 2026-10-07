/**
 * Harness DOM helper.
 *
 * `@obra/ui` ships components, not a public DOM builder — its `h()` lives in
 * `packages/obra-ui/src/utilities/dom.ts` and is deliberately not exported from
 * the package entry point. Harness modules therefore share this one spelling
 * instead of each re-inventing it.
 *
 * This never builds a visual component: every button, table, state, and layout
 * in a surface is an `obra-*` custom element from `@obra/ui` (Principle 3).
 * `el()` only creates a node, sets attributes, and appends children.
 */
export function el(
  tag: string,
  attrs: Record<string, string> = {},
  ...children: Array<Node | string>
): HTMLElement {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  for (const child of children) node.append(child);
  return node;
}

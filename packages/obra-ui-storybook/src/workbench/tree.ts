// Explorer tree for the workbench replica.
//
// A faithful subset of the VS Code tree: role=tree/treeitem/group, roving
// tabindex, arrow-key navigation, expand/collapse, and the selection treatment
// from the chrome tokens. Preview-only (see README.md).

import { codicon, type IconName } from './icons.js';
import { el } from './workbench.js';

export interface TreeItemSpec {
  id: string;
  label: string;
  icon?: IconName;
  expanded?: boolean;
  selected?: boolean;
  children?: TreeItemSpec[];
}

export interface TreeSpec {
  label: string;
  items: TreeItemSpec[];
}

export function tree(spec: TreeSpec): HTMLElement {
  const root = el('div', { class: 'obra-wb-tree', role: 'tree', 'aria-label': spec.label });
  root.append(...spec.items.map((item) => treeItem(item, 0)));
  wireTree(root);
  return root;
}

function treeItem(spec: TreeItemSpec, level: number): HTMLElement {
  const hasChildren = !!spec.children?.length;
  const node = el('div', {
    role: 'treeitem',
    tabindex: -1,
    'aria-selected': String(!!spec.selected),
  });
  node.dataset.id = spec.id;
  if (hasChildren) node.setAttribute('aria-expanded', String(!!spec.expanded));

  const twisty = el('span', { class: `obra-wb-tree-twisty${hasChildren ? '' : ' obra-wb-tree-twisty--empty'}` });
  if (hasChildren) twisty.append(codicon(spec.expanded ? 'chevronDown' : 'chevronRight'));

  const row = el('div', { class: 'obra-wb-tree-row' }, [
    twisty,
    el('span', { class: 'obra-wb-tree-icon' }, [codicon(spec.icon ?? (hasChildren ? 'folder' : 'file'))]),
    el('span', { class: 'obra-wb-tree-label' }, [spec.label]),
  ]);
  row.style.paddingInlineStart = `calc(var(--obra-space-2) + ${level} * var(--obra-space-3))`;
  node.append(row);

  if (hasChildren) {
    const group = el('div', { role: 'group' });
    group.hidden = !spec.expanded;
    group.append(...spec.children!.map((child) => treeItem(child, level + 1)));
    node.append(group);
  }
  return node;
}

function wireTree(root: HTMLElement): void {
  const all = (): HTMLElement[] => [...root.querySelectorAll<HTMLElement>('[role="treeitem"]')];
  const visible = (): HTMLElement[] =>
    all().filter((node) => !node.parentElement?.closest('[role="group"][hidden]'));

  const first = all()[0];
  if (first) first.tabIndex = 0;

  const focusNode = (node: HTMLElement | undefined): void => {
    if (!node) return;
    for (const other of all()) other.tabIndex = other === node ? 0 : -1;
    node.focus();
  };

  const selectNode = (node: HTMLElement): void => {
    for (const other of all()) other.setAttribute('aria-selected', String(other === node));
    root.dispatchEvent(
      new CustomEvent('obra-tree-select', {
        bubbles: true,
        composed: true,
        detail: { id: node.dataset.id },
      })
    );
  };

  const toggleNode = (node: HTMLElement): void => {
    if (node.getAttribute('aria-expanded') === null) return;
    const expanded = node.getAttribute('aria-expanded') === 'true';
    node.setAttribute('aria-expanded', String(!expanded));
    const group = node.querySelector(':scope > [role="group"]') as HTMLElement | null;
    if (group) group.hidden = expanded;
    const twisty = node.querySelector(':scope > .obra-wb-tree-row > .obra-wb-tree-twisty');
    if (twisty) {
      twisty.textContent = '';
      twisty.append(codicon(expanded ? 'chevronRight' : 'chevronDown'));
    }
  };

  root.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const node = target.closest<HTMLElement>('[role="treeitem"]');
    if (!node) return;
    if (target.closest('.obra-wb-tree-twisty')) {
      toggleNode(node);
      return;
    }
    selectNode(node);
    focusNode(node);
  });

  root.addEventListener('dblclick', (event) => {
    const node = (event.target as HTMLElement).closest<HTMLElement>('[role="treeitem"]');
    if (node) toggleNode(node);
  });

  root.addEventListener('keydown', (event) => {
    const node = (event.target as HTMLElement).closest<HTMLElement>('[role="treeitem"]');
    if (!node) return;
    const list = visible();
    const index = list.indexOf(node);
    switch (event.key) {
      case 'ArrowDown':
        focusNode(list[Math.min(index + 1, list.length - 1)]);
        break;
      case 'ArrowUp':
        focusNode(list[Math.max(index - 1, 0)]);
        break;
      case 'Home':
        focusNode(list[0]);
        break;
      case 'End':
        focusNode(list[list.length - 1]);
        break;
      case 'ArrowRight':
        if (node.getAttribute('aria-expanded') === 'false') toggleNode(node);
        else if (node.getAttribute('aria-expanded') === 'true') {
          const child = node.querySelector<HTMLElement>(':scope > [role="group"] > [role="treeitem"]');
          focusNode(child ?? undefined);
        }
        break;
      case 'ArrowLeft': {
        if (node.getAttribute('aria-expanded') === 'true') toggleNode(node);
        else {
          const parent = node.parentElement?.closest<HTMLElement>('[role="treeitem"]');
          focusNode(parent ?? undefined);
        }
        break;
      }
      case 'Enter':
      case ' ':
        selectNode(node);
        break;
      default:
        return;
    }
    event.preventDefault();
  });
}

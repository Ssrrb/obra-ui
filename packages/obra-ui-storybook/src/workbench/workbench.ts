// VS Code workbench replica — the testing interface for Obra Studio UI & UX.
//
// This module builds the workbench chrome (title bar, activity bar, primary
// side bar, editor group, bottom panel, auxiliary bar, status bar) out of
// framework-free DOM. Colors, spacing and metrics resolve to `--obra-*` tokens
// only; the chrome-specific tokens live under `chrome.*` and `workbench.*` in
// `design/tokens/` (see design/README.md).
//
// Preview-only: this is NOT a product component and never ships in a webview.
// Product surfaces compose `@obra/ui` inside these regions.

import { codicon, type IconName } from './icons.js';

export type Child = Node | string;

/** Create an element with attributes and children. */
export function el(
  tag: string,
  attrs: Record<string, string | number | boolean> = {},
  children: Child[] = []
): HTMLElement {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === false || value === null || value === undefined) continue;
    node.setAttribute(name, value === true ? '' : String(value));
  }
  node.append(...children);
  return node;
}

export interface ActivityItem {
  id: string;
  label: string;
  icon: IconName;
}

/** Company-level activity bar, from the company preview. */
export const COMPANY_ACTIVITY: ActivityItem[] = [
  { id: 'projects', label: 'Proyectos', icon: 'project' },
  { id: 'inbox', label: 'Bandeja', icon: 'inbox' },
  { id: 'cashflow', label: 'Flujo de caja', icon: 'graph' },
  { id: 'accounts', label: 'Cuentas', icon: 'organization' },
];

/** Project-level activity bar: the stock VS Code order plus Chat. */
export const PROJECT_ACTIVITY: ActivityItem[] = [
  { id: 'explorer', label: 'Explorador', icon: 'files' },
  { id: 'search', label: 'Buscar', icon: 'search' },
  { id: 'source-control', label: 'Control de código fuente', icon: 'sourceControl' },
  { id: 'debug', label: 'Ejecutar y depurar', icon: 'debugAlt' },
  { id: 'extensions', label: 'Extensiones', icon: 'extensions' },
  { id: 'chat', label: 'Chat', icon: 'commentDiscussion' },
];

export const ACTIVITY_FOOTER: ActivityItem[] = [
  { id: 'account', label: 'Cuenta', icon: 'account' },
  { id: 'settings', label: 'Ajustes', icon: 'settingsGear' },
];

export function iconButton(icon: IconName, label: string, className = 'obra-wb-iconbtn'): HTMLButtonElement {
  return el('button', { type: 'button', class: className, 'aria-label': label }, [codicon(icon)]) as HTMLButtonElement;
}

// --- Title bar ---------------------------------------------------------------

export interface TitleBarOptions {
  searchPlaceholder?: string;
  windowControls?: boolean;
  navigation?: boolean;
}

export function titleBar(options: TitleBarOptions = {}): HTMLElement {
  const { searchPlaceholder = 'Buscar en Obra Studio', windowControls = true, navigation = true } = options;

  const left = el('div', { class: 'obra-wb-titlebar__left' });
  if (windowControls) {
    left.append(
      el('div', { class: 'obra-wb-window-controls', 'aria-hidden': 'true' }, [
        el('span', { class: 'obra-wb-window-dot obra-wb-window-dot--close' }),
        el('span', { class: 'obra-wb-window-dot obra-wb-window-dot--minimize' }),
        el('span', { class: 'obra-wb-window-dot obra-wb-window-dot--zoom' }),
      ])
    );
  }
  if (navigation) {
    left.append(iconButton('arrowLeft', 'Atrás'), iconButton('arrowRight', 'Adelante'));
  }

  const center = el('div', { class: 'obra-wb-titlebar__center' }, [
    el('button', { type: 'button', class: 'obra-wb-command' }, [
      codicon('search'),
      el('span', { class: 'obra-wb-command__label' }, [searchPlaceholder]),
    ]),
  ]);

  const right = el('div', { class: 'obra-wb-titlebar__right' }, [
    iconButton('layoutSidebarLeft', 'Alternar barra lateral primaria'),
    iconButton('layoutPanel', 'Alternar panel'),
    iconButton('layoutSidebarRight', 'Alternar barra lateral secundaria'),
  ]);

  return el('header', { class: 'obra-wb-titlebar' }, [left, center, right]);
}

// --- Activity bar ------------------------------------------------------------

export interface ActivityBarOptions {
  items?: ActivityItem[];
  active?: string;
  footer?: ActivityItem[];
  labels?: boolean;
}

export function activityBar(options: ActivityBarOptions = {}): HTMLElement {
  const items = options.items ?? COMPANY_ACTIVITY;
  const { active = items[0]?.id, footer = ACTIVITY_FOOTER, labels = false } = options;

  const bar = el('nav', {
    class: `obra-wb-activitybar${labels ? ' obra-wb-activitybar--labeled' : ''}`,
    'aria-label': 'Barra de actividad',
  });
  for (const item of items) bar.append(activityBarItem(item, item.id === active, labels));
  bar.append(el('div', { class: 'obra-wb-activitybar__spacer' }));
  for (const item of footer) bar.append(activityBarItem(item, false, labels));

  bar.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('.obra-wb-activity');
    if (!button) return;
    for (const other of bar.querySelectorAll<HTMLElement>('.obra-wb-activity')) {
      other.setAttribute('aria-pressed', String(other === button));
    }
    bar.dispatchEvent(
      new CustomEvent('obra-activity-change', {
        bubbles: true,
        composed: true,
        detail: { id: button.dataset.id },
      })
    );
  });

  return bar;
}

function activityBarItem(item: ActivityItem, active: boolean, labels: boolean): HTMLElement {
  const attrs: Record<string, string | boolean> = {
    type: 'button',
    class: 'obra-wb-activity',
    'aria-pressed': String(active),
  };
  if (!labels) attrs.title = item.label;
  const button = el('button', attrs, [
    codicon(item.icon),
    el('span', { class: 'obra-wb-activity__label' }, [item.label]),
  ]);
  button.dataset.id = item.id;
  return button;
}

// --- Primary side bar --------------------------------------------------------

export interface SideBarOptions {
  title?: string;
  actions?: boolean;
  children?: Child[];
}

export function sideBarRegion(options: SideBarOptions = {}): HTMLElement {
  const { title = 'Explorador', actions = true, children = [] } = options;
  const header = el('div', { class: 'obra-wb-sidebar__header' }, [
    el('h2', { class: 'obra-wb-sidebar__title' }, [title]),
  ]);
  if (actions) {
    header.append(
      el('div', { class: 'obra-wb-sidebar__actions' }, [
        iconButton('ellipsis', `Acciones de ${title}`, 'obra-wb-iconbtn obra-wb-iconbtn--sm'),
      ])
    );
  }
  return el('aside', { class: 'obra-wb-sidebar', 'aria-label': title }, [
    header,
    el('div', { class: 'obra-wb-sidebar__content' }, children),
  ]);
}

// --- Editor group ------------------------------------------------------------

export interface WorkbenchTab {
  id: string;
  label: string;
  icon?: IconName;
  content?: Child;
}

export interface EditorGroupOptions {
  tabs?: WorkbenchTab[];
  active?: string;
  breadcrumbs?: string[];
  content?: Child;
  ariaLabel?: string;
}

export function editorGroup(options: EditorGroupOptions = {}): HTMLElement {
  const tabs = options.tabs ?? [];
  const active = options.active ?? tabs[0]?.id ?? '';
  const group = el('section', {
    class: 'obra-wb-editor',
    'data-obra-tabs-scope': '',
    'aria-label': options.ariaLabel ?? 'Editor',
  });

  if (tabs.length) group.append(tabBar(tabs, active, { label: 'Editores abiertos', closable: true }));
  if (options.breadcrumbs?.length) group.append(breadcrumbs(options.breadcrumbs));

  const body = el('div', { class: 'obra-wb-editor__content' });
  if (tabs.length) {
    for (const tab of tabs) {
      const panel = el('div', {
        class: 'obra-wb-editor__panel',
        id: `obra-wb-panel-${tab.id}`,
      });
      panel.hidden = tab.id !== active;
      panel.append(tab.content ?? '');
      body.append(panel);
    }
  } else {
    body.append(options.content ?? '');
  }
  group.append(body);
  return group;
}

export function breadcrumbs(crumbs: string[]): HTMLElement {
  const nav = el('nav', { class: 'obra-wb-breadcrumbs', 'aria-label': 'Ruta de navegación' });
  crumbs.forEach((crumb, index) => {
    if (index > 0) nav.append(el('span', { class: 'obra-wb-breadcrumbs__sep', 'aria-hidden': 'true' }, ['›']));
    nav.append(el('button', { type: 'button', class: 'obra-wb-crumb' }, [crumb]));
  });
  return nav;
}

// --- Bottom panel ------------------------------------------------------------

export interface PanelOptions {
  tabs?: WorkbenchTab[];
  active?: string;
  ariaLabel?: string;
}

export function panelRegion(options: PanelOptions = {}): HTMLElement {
  const tabs = options.tabs ?? [
    { id: 'problems', label: 'Problemas' },
    { id: 'output', label: 'Salida' },
    { id: 'terminal', label: 'Terminal' },
    { id: 'debug', label: 'Consola de depuración' },
  ];
  const active = options.active ?? tabs[0]?.id ?? '';
  const region = el('section', {
    class: 'obra-wb-panel',
    'data-obra-tabs-scope': '',
    'aria-label': options.ariaLabel ?? 'Panel inferior',
  });

  const header = el('div', { class: 'obra-wb-panel__header' }, [
    tabBar(tabs, active, { label: options.ariaLabel ?? 'Vistas del panel', variant: 'panel' }),
    el('div', { class: 'obra-wb-panel__actions' }, [
      iconButton('chevronDown', 'Ocultar panel', 'obra-wb-iconbtn obra-wb-iconbtn--sm'),
    ]),
  ]);

  const body = el('div', { class: 'obra-wb-panel__content' });
  for (const tab of tabs) {
    const panel = el('div', {
      class: 'obra-wb-panel__panel',
      role: 'tabpanel',
      id: `obra-wb-panel-${tab.id}`,
      'aria-labelledby': `obra-wb-tab-${tab.id}`,
    });
    panel.hidden = tab.id !== active;
    panel.append(tab.content ?? '');
    body.append(panel);
  }

  region.append(header, body);
  return region;
}

// --- Status bar --------------------------------------------------------------

export function statusItem(
  label: string,
  icon?: IconName,
  suffixIcon?: IconName,
  ariaLabel?: string
): HTMLButtonElement {
  const children: Child[] = [];
  if (icon) children.push(codicon(icon));
  if (label) children.push(el('span', { class: 'obra-wb-statusitem__label' }, [label]));
  if (suffixIcon) children.push(codicon(suffixIcon));
  const button = el('button', { type: 'button', class: 'obra-wb-statusitem' }, children) as HTMLButtonElement;
  if (ariaLabel) button.setAttribute('aria-label', ariaLabel);
  return button;
}

export interface StatusBarOptions {
  left?: Child[];
  right?: Child[];
}

export function statusBar(options: StatusBarOptions = {}): HTMLElement {
  return el('footer', { class: 'obra-wb-statusbar' }, [
    el('div', { class: 'obra-wb-statusbar__group' }, options.left ?? []),
    el('div', { class: 'obra-wb-statusbar__group' }, options.right ?? []),
  ]);
}

// --- Tab list wiring ---------------------------------------------------------

interface TabBarOptions {
  label: string;
  variant?: 'editor' | 'panel';
  closable?: boolean;
}

function tabBar(tabs: WorkbenchTab[], active: string, options: TabBarOptions): HTMLElement {
  const { label, variant = 'editor', closable = false } = options;
  const isPanel = variant === 'panel';
  const bar = el('div', {
    class: isPanel ? 'obra-wb-panel__tabs' : 'obra-wb-tabs',
    role: isPanel ? 'tablist' : 'group',
    'aria-label': label,
  });

  for (const tab of tabs) {
    const selected = tab.id === active;
    const attrs: Record<string, string | number | boolean> = {
      type: 'button',
      class: isPanel ? 'obra-wb-panel__tab' : 'obra-wb-tab',
      id: `obra-wb-tab-${tab.id}`,
      'aria-controls': `obra-wb-panel-${tab.id}`,
      tabindex: selected ? 0 : -1,
    };
    // Panel tabs are a real tablist. Editor tabs carry a close action, and a
    // focusable child inside role=tab is invalid, so they are toggle buttons in
    // a labelled group instead (axe aria-required-children / nested-interactive).
    if (isPanel) {
      attrs.role = 'tab';
      attrs['aria-selected'] = String(selected);
    } else {
      attrs['aria-pressed'] = String(selected);
    }
    const button = el('button', attrs);
    button.dataset.obraTab = tab.id;
    if (tab.icon) button.append(codicon(tab.icon));
    button.append(el('span', { class: 'obra-wb-tab__label' }, [tab.label]));

    if (closable) {
      const group = el('div', {
        class: 'obra-wb-tabgroup',
        'data-active': selected ? 'true' : 'false',
      });
      group.dataset.id = tab.id;
      group.append(button, iconButton('close', `Cerrar ${tab.label}`, 'obra-wb-tab__close'));
      bar.append(group);
    } else {
      bar.append(button);
    }
  }

  wireTabs(bar);
  return bar;
}

function wireTabs(bar: HTMLElement): void {
  const tabs = (): HTMLElement[] => [...bar.querySelectorAll<HTMLElement>('[data-obra-tab]')];
  const scope = (): HTMLElement | null => bar.closest<HTMLElement>('[data-obra-tabs-scope]');

  const setSelected = (tab: HTMLElement, on: boolean): void => {
    if (tab.getAttribute('role') === 'tab') tab.setAttribute('aria-selected', String(on));
    else tab.setAttribute('aria-pressed', String(on));
    tab.tabIndex = on ? 0 : -1;
    tab.closest('.obra-wb-tabgroup')?.setAttribute('data-active', String(on));
    const panel = scope()?.querySelector<HTMLElement>(`#${CSS.escape(tab.getAttribute('aria-controls') ?? '')}`);
    if (panel) panel.hidden = !on;
  };

  const activate = (tab: HTMLElement, focus = false): void => {
    for (const other of tabs()) setSelected(other, other === tab);
    if (focus) tab.focus();
    bar.dispatchEvent(
      new CustomEvent('obra-tab-change', {
        bubbles: true,
        composed: true,
        detail: { id: tab.dataset.obraTab },
      })
    );
  };

  const close = (group: HTMLElement | null): void => {
    if (!group) return;
    const tab = group.querySelector<HTMLElement>('[data-obra-tab]');
    if (!tab) return;
    const panel = scope()?.querySelector<HTMLElement>(`#${CSS.escape(tab.getAttribute('aria-controls') ?? '')}`);
    const wasActive = tab.getAttribute('aria-pressed') === 'true' || tab.getAttribute('aria-selected') === 'true';
    const siblings = [...bar.querySelectorAll<HTMLElement>('.obra-wb-tabgroup')];
    const index = siblings.indexOf(group);
    const id = tab.dataset.obraTab;
    group.remove();
    panel?.remove();
    bar.dispatchEvent(new CustomEvent('obra-tab-close', { bubbles: true, composed: true, detail: { id } }));
    if (wasActive) {
      const next = tabs()[Math.min(index, tabs().length - 1)];
      if (next) activate(next, true);
    }
  };

  bar.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.closest('.obra-wb-tab__close')) {
      close(target.closest('.obra-wb-tabgroup'));
      return;
    }
    const tab = target.closest<HTMLElement>('[data-obra-tab]');
    if (tab) activate(tab);
  });

  bar.addEventListener('keydown', (event) => {
    const tab = (event.target as HTMLElement).closest<HTMLElement>('[data-obra-tab]');
    if (!tab) return;
    const list = tabs();
    const index = list.indexOf(tab);
    let next = -1;
    if (event.key === 'ArrowRight') next = Math.min(index + 1, list.length - 1);
    else if (event.key === 'ArrowLeft') next = Math.max(index - 1, 0);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = list.length - 1;
    else if (event.key === 'Enter' || event.key === ' ') {
      activate(tab);
      event.preventDefault();
      return;
    } else return;
    event.preventDefault();
    if (next >= 0) activate(list[next], true);
  });
}

// --- Whole workbench ---------------------------------------------------------

export interface WorkbenchOptions {
  searchPlaceholder?: string;
  windowControls?: boolean;
  navigation?: boolean;
  activity?: ActivityItem[];
  activeActivity?: string;
  activityLabels?: boolean;
  activityFooter?: ActivityItem[];
  sidebarTitle?: string;
  sidebar?: Child | null;
  tabs?: WorkbenchTab[];
  activeTab?: string;
  breadcrumbs?: string[];
  editor?: Child;
  auxiliaryTitle?: string;
  auxiliary?: Child | null;
  panel?: PanelOptions | null;
  statusLeft?: Child[];
  statusRight?: Child[];
}

export function workbench(options: WorkbenchOptions = {}): HTMLElement {
  const {
    searchPlaceholder,
    windowControls,
    navigation,
    activity = COMPANY_ACTIVITY,
    activeActivity = activity[0]?.id,
    activityLabels = false,
    activityFooter,
    sidebarTitle,
    sidebar,
    tabs = [],
    activeTab,
    breadcrumbs: crumbs,
    editor,
    auxiliaryTitle = 'Chat',
    auxiliary,
    panel,
    statusLeft,
    statusRight,
  } = options;

  const root = el('div', { class: 'obra-wb' });
  root.append(titleBar({ searchPlaceholder, windowControls, navigation }));

  const body = el('div', { class: 'obra-wb-body' });
  body.append(activityBar({ items: activity, active: activeActivity, labels: activityLabels, footer: activityFooter }));

  if (sidebar !== null) {
    body.append(sideBarRegion({ title: sidebarTitle, children: sidebar ? [sidebar] : [] }));
  }

  const main = el('div', { class: 'obra-wb-main' }, [
    editorGroup({ tabs, active: activeTab, breadcrumbs: crumbs, content: editor }),
  ]);
  if (panel) main.append(panelRegion(panel));
  body.append(main);

  if (auxiliary) {
    body.append(
      el('aside', { class: 'obra-wb-aux', 'aria-label': auxiliaryTitle }, [
        el('div', { class: 'obra-wb-aux__header' }, [
          el('h2', { class: 'obra-wb-aux__title' }, [auxiliaryTitle]),
          el('div', { class: 'obra-wb-aux__actions' }, [
            iconButton('add', `Nuevo en ${auxiliaryTitle}`, 'obra-wb-iconbtn obra-wb-iconbtn--sm'),
            iconButton('ellipsis', `Acciones de ${auxiliaryTitle}`, 'obra-wb-iconbtn obra-wb-iconbtn--sm'),
          ]),
        ]),
        el('div', { class: 'obra-wb-aux__content' }, [auxiliary]),
      ])
    );
  }

  root.append(body);
  root.append(statusBar({ left: statusLeft, right: statusRight }));
  return root;
}

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { posix } from 'node:path';
import { test } from 'node:test';
const require = createRequire(import.meta.url);
const reference = require('../src/sample.cjs');
function host(folders, files = {}, extensions = []) {
  const commands = new Map(), trees = new Map(), views = new Map(), events = [], calls = [], contents = new Map();
  let enabled = true;
  const disposable = () => ({ dispose() { this.disposed = true; } });
  const api = {
    env: { language: 'es' },
    EventEmitter: class { event = () => disposable(); fire() {} dispose() { this.disposed = true; } },
    TreeItem: class { constructor(label, collapsibleState) { Object.assign(this, { label, collapsibleState }); } },
    TreeItemCollapsibleState: { None: 0, Expanded: 2 }, ThemeIcon: Object.assign(class { constructor(id) { this.id = id; } }, { Folder: { id: 'folder' }, File: { id: 'file' } }),
    Uri: { from: v => v, file: path => ({ path }), joinPath: (uri, ...parts) => ({ path: posix.join(uri.path, ...parts) }) },
    RelativePattern: class { constructor(base, pattern) { Object.assign(this, { base, pattern }); } }, FileType: { File: 1, Directory: 2 },
    extensions: { all: extensions, onDidChange: () => disposable() },
    commands: { registerCommand: (id, fn) => { commands.set(id, fn); return disposable(); }, executeCommand: async (...args) => { calls.push(args); if (args[0] === 'ctrl.obra.organizations') { return [{ id: 'org_1' }, { id: 'org_2' }]; } } },
    window: { createTreeView: (id, options) => { trees.set(id, options.treeDataProvider); const view = { ...disposable(), onDidChangeVisibility: () => disposable() }; views.set(id, view); return view; }, withProgress: (options, task) => task(), showTextDocument: async doc => { calls.push(['document', doc]); } },
    workspace: { workspaceFolders: folders,
      findFiles: async () => Object.keys(files).filter(path => path.endsWith('/obra.json')).map(path => ({ path })),
      fs: { readDirectory: async uri => [...new Set(Object.keys(files).filter(path => path.startsWith(uri.path + '/')).map(path => path.slice(uri.path.length + 1).split('/')[0]))].map(name => [name, 2]), readFile: async uri => { if (!(uri.path in files)) { throw new Error('missing'); } return new TextEncoder().encode(JSON.stringify(files[uri.path])); } },
      createFileSystemWatcher: () => ({ onDidCreate: disposable, onDidChange: disposable, onDidDelete: disposable, dispose() { this.disposed = true; } }),
      onDidChangeWorkspaceFolders: () => disposable(), getConfiguration: () => ({ get: () => enabled }), onDidChangeConfiguration: fn => { events.push(fn); return disposable(); }, registerTextDocumentContentProvider: (scheme, provider) => { contents.set(scheme, provider); return disposable(); }, openTextDocument: async uri => ({ uri, text: contents.get(uri.scheme).provideTextDocumentContent(uri) }) },
  };
  const context = { subscriptions: [], globalState: { value: false, get() { return this.value; }, async update(key, value) { this.value = value; } } };
  const module = { exports: {} };
  vm.runInNewContext(readFileSync(new URL('../src/extension.cjs', import.meta.url), 'utf8'), { module, TextDecoder, process: { env: { CTRL_CREATE_DOCUMENTS: '/docs' } }, require: name => name === 'vscode' ? api : ['os', 'path'].includes(name) ? require(name) : require('../src/' + name.replace('./', '')) });
  return { context, commands, trees, views, calls, activate: () => module.exports.activate(context), toggle: async value => { enabled = value; await events.at(-1)({ affectsConfiguration: () => true }); } };
}
test('empty startup, exact sample hierarchy/icons, read-only scheme, toggles and disposal', async () => {
  const h = host(['fixture']); await h.activate();
  assert.equal(h.calls.some(c => c[0].endsWith('.focus')), false);
  for (const tree of h.trees.values()) assert.equal(tree.getChildren().length, 0);
  await h.commands.get('obra.showSample')();
  const tree = h.trees.get('obra.explorer.tree');
  assert.deepEqual(tree.getChildren(), reference);
  assert.equal(tree.getTreeItem(reference[0]).iconPath.id, 'root-folder');
  assert.equal(tree.getTreeItem(reference[0].children[0]).iconPath.id, 'table');
  assert.deepEqual(reference[0].children.map(node => tree.getTreeItem(node).iconPath.id), ['table', 'tools', 'folder', 'package', 'law', 'checklist', 'credit-card', 'graph-line', 'database', 'person', 'organization', 'attach']);
  await h.commands.get('obra.openSample')('budget');
  const doc = h.calls.find(c => c[0] === 'document')[1];
  assert.equal(doc.uri.scheme, 'obra-sample'); assert.match(doc.text, /solo lectura/);
  await h.toggle(false); assert.equal(tree.getChildren().length, 0);
  await h.commands.get('obra.showSample')(); assert.equal(tree.getChildren().length, 0);
  await h.toggle(true); assert.equal(tree.getChildren().length, 0);
  await h.commands.get('obra.showSample')(); await h.commands.get('obra.exitPreview')(); assert.equal(tree.getChildren().length, 0);
  for (const d of h.context.subscriptions) d.dispose();
  assert.equal(h.context.subscriptions.slice(0, -1).every(d => d.disposed), true);
});
test('empty-window onboarding opens projects once and reload clears sample', async () => {
  const h = host(); await h.activate(); await h.commands.get('obra.showSample')(); await h.activate();
  assert.equal(h.calls.filter(c => c[0] === 'obra.projects.tree.focus').length, 1);
  assert.equal(h.trees.get('obra.explorer.tree').getChildren().length, 0);
});
test('obras list switches to the erp/ecms modules of the chosen obra and back', async () => {
  const workspace = { schemaVersion: 1, clerkOrgId: 'org_1', companyId: 'c1', workspaceId: 'w1' };
  const obra = { schemaVersion: 1, obraId: 'o1', name: 'Torre Sur', companyId: 'c1', workspaceId: 'w1', modules: { effective: [
    { code: 'erp.catalogs', engine: 'erp', name: 'Catálogos' }, { code: 'ecms.budgets', engine: 'ecms', name: 'Presupuestos' }] } };
  const budgets = { packageJSON: { contributes: { commands: [{ command: 'ctrl.open.ecms.budgets' }] } } };
  const h = host(['fixture'], { '/ws/.ctrl/workspace.json': workspace, '/ws/obras/o1/.ctrl/obra.json': obra, '/ws/obras/o2/.ctrl/obra.json': { ...obra, obraId: 'o2', companyId: 'other' } }, [budgets]);
  await h.activate();
  const plain = value => JSON.parse(JSON.stringify(value));
  const tree = h.trees.get('obra.projects.tree');
  const [only] = tree.getChildren();
  assert.deepEqual(plain(tree.getTreeItem(only).command), { command: 'obra.selectObra', title: 'Torre Sur', arguments: ['org_1/o1'] });
  await h.commands.get('obra.selectObra')('org_1/o1');
  assert.equal(h.views.get('obra.projects.tree').title, 'Torre Sur');
  const folders = tree.getChildren();
  assert.deepEqual(plain(folders.map(f => tree.getTreeItem(f).label)), ['erp', 'ecms']);
  const [catalogs] = tree.getChildren(folders[0]), [budget] = tree.getChildren(folders[1]);
  assert.deepEqual([tree.getTreeItem(catalogs).command, tree.getTreeItem(catalogs).description], [undefined, 'Próximamente']);
  assert.deepEqual(plain(tree.getTreeItem(budget).command), { command: 'ctrl.open.ecms.budgets', title: 'Presupuestos', arguments: [{ orgId: 'org_1', obraId: 'o1' }] });
  await h.commands.get('obra.showObras')();
  assert.equal(h.views.get('obra.projects.tree').title, 'Obras');
  assert.deepEqual(plain(tree.getChildren().map(o => o.name)), ['Torre Sur']);
});
test('obras of the default root appear without an open folder and refresh pulls them', async () => {
  const workspace = { schemaVersion: 1, clerkOrgId: 'org_1', companyId: 'c1', workspaceId: 'w1' };
  const obra = { schemaVersion: 1, obraId: 'o1', name: 'Puente', companyId: 'c1', workspaceId: 'w1', modules: { effective: [] } };
  const target = '/docs/Ctrl/Empresa/Puente';
  const h = host(undefined, { '/docs/Ctrl/.ctrl/locations.json': { version: 1, locations: [{ orgId: 'org_1', target }] }, [`${target}/.ctrl/workspace.json`]: workspace, [`${target}/obras/o1/.ctrl/obra.json`]: obra });
  await h.activate();
  const tree = h.trees.get('obra.projects.tree');
  assert.deepEqual(JSON.parse(JSON.stringify(tree.getChildren().map(o => o.key))), ['org_1/o1']);
  await h.commands.get('obra.refreshObras')();
  assert.deepEqual(JSON.parse(JSON.stringify(h.calls.filter(c => c[0] === 'obra-auth.runWorkspaceCli'))), [['obra-auth.runWorkspaceCli', { kind: 'pull', org: 'org_1' }], ['obra-auth.runWorkspaceCli', { kind: 'pull', org: 'org_2' }]]);
});

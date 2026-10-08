import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { test } from 'node:test';
const require = createRequire(import.meta.url);
const reference = require('../src/sample.cjs');
function host(folders) {
  const commands = new Map(), trees = new Map(), events = [], calls = [], contents = new Map();
  let enabled = true;
  const disposable = () => ({ dispose() { this.disposed = true; } });
  const api = {
    env: { language: 'es' },
    EventEmitter: class { event = () => disposable(); fire() {} dispose() { this.disposed = true; } },
    TreeItem: class { constructor(label, collapsibleState) { Object.assign(this, { label, collapsibleState }); } },
    TreeItemCollapsibleState: { None: 0, Expanded: 2 }, ThemeIcon: class { constructor(id) { this.id = id; } },
    Uri: { from: v => v },
    commands: { registerCommand: (id, fn) => { commands.set(id, fn); return disposable(); }, executeCommand: async (...args) => calls.push(args) },
    window: { createTreeView: (id, options) => { trees.set(id, options.treeDataProvider); return disposable(); }, showTextDocument: async doc => { calls.push(['document', doc]); } },
    workspace: { workspaceFolders: folders, getConfiguration: () => ({ get: () => enabled }), onDidChangeConfiguration: fn => { events.push(fn); return disposable(); }, registerTextDocumentContentProvider: (scheme, provider) => { contents.set(scheme, provider); return disposable(); }, openTextDocument: async uri => ({ uri, text: contents.get(uri.scheme).provideTextDocumentContent(uri) }) },
  };
  const context = { subscriptions: [], globalState: { value: false, get() { return this.value; }, async update(key, value) { this.value = value; } } };
  const module = { exports: {} };
  vm.runInNewContext(readFileSync(new URL('../src/extension.cjs', import.meta.url), 'utf8'), { module, require: name => name === 'vscode' ? api : require('../src/' + name.replace('./', '')) });
  return { context, commands, trees, calls, activate: () => module.exports.activate(context), toggle: async value => { enabled = value; await events.at(-1)({ affectsConfiguration: () => true }); } };
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

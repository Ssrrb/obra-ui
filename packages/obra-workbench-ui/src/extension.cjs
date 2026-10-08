/*---------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root.
 *--------------------------------------------------------------------------------------------*/
const vscode = require('vscode');
const sample = require('./sample.cjs');
const spanish = require('./package.nls.es.json');
const english = require('./package.nls.en.json');
const copy = vscode.env.language.startsWith('en') ? english : spanish;
const icons = { rootFolder: 'root-folder', creditCard: 'credit-card', graphLine: 'graph-line' };
const leaves = new Map();
function index(nodes) {
	for (const node of nodes) {
		if (node.children) { index(node.children); } else { leaves.set(node.id, node); }
	}
}
index(sample);

async function activate(context) {
	let preview = false;
	let enabled = vscode.workspace.getConfiguration('obra.sidebar').get('enabled', true);
	const providers = [];
	const refresh = async value => {
		preview = value && enabled;
		await vscode.commands.executeCommand('setContext', 'obra.preview', preview);
		for (const provider of providers) { provider.emitter.fire(undefined); }
	};
	for (const key of ['projects', 'inbox', 'cashflow', 'accounts', 'explorer']) {
		const emitter = new vscode.EventEmitter();
		context.subscriptions.push(emitter);
		const provider = {
			emitter,
			onDidChangeTreeData: emitter.event,
			getChildren: node => enabled && preview && ['projects', 'explorer'].includes(key) ? (node ? node.children || [] : sample) : [],
			getTreeItem: node => {
				const item = new vscode.TreeItem(node.label, node.children ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.None);
				item.id = node.id;
				if (node.icon) { item.iconPath = new vscode.ThemeIcon(icons[node.icon] || node.icon); }
				item.tooltip = `${node.label} — ${copy.sample}`;
				if (node.id === 'obra') { item.description = copy.sample; }
				if (!node.children) { item.command = { command: 'obra.openSample', title: node.label, arguments: [node.id] }; }
				return item;
			},
		};
		providers.push(provider);
		context.subscriptions.push(vscode.window.createTreeView(`obra.${key}.tree`, { treeDataProvider: provider, showCollapseAll: true }));
	}
	context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('obra-sample', {
		provideTextDocumentContent: uri => {
			const node = leaves.get(uri.query);
			return `${copy.sample}\n${node ? node.label : ''}\n\n${copy.previewText}\n`;
		},
	}));
	context.subscriptions.push(vscode.commands.registerCommand('obra.openSample', async id => {
		if (!enabled || !preview || !leaves.has(id)) { return; }
		const node = leaves.get(id);
		const uri = vscode.Uri.from({ scheme: 'obra-sample', path: `/${node.label}.txt`, query: id });
		await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(uri), { preview: true });
	}));
	context.subscriptions.push(vscode.commands.registerCommand('obra.showSample', async () => {
		if (!enabled) { return; }
		await refresh(true);
		await vscode.commands.executeCommand('obra.explorer.tree.focus');
	}));
	context.subscriptions.push(vscode.commands.registerCommand('obra.exitPreview', () => refresh(false)));
	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async event => {
		if (!event.affectsConfiguration('obra.sidebar.enabled')) { return; }
		enabled = vscode.workspace.getConfiguration('obra.sidebar').get('enabled', true);
		await refresh(false);
	}));
	context.subscriptions.push({ dispose: () => { preview = false; } });
	await refresh(false);
	// A persisted one-time onboarding marker; sample state is never persisted.
	if (enabled && !vscode.workspace.workspaceFolders && !context.globalState.get('obra.initialViewOpened')) {
		await context.globalState.update('obra.initialViewOpened', true);
		await vscode.commands.executeCommand('obra.projects.tree.focus');
	}
}
module.exports = { activate };

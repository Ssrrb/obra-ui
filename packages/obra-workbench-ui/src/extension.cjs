/*---------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root.
 *--------------------------------------------------------------------------------------------*/
const os = require('os');
const path = require('path');
const vscode = require('vscode');
const sample = require('./sample.cjs');
// Spanish is the official language, as in the default package.nls.json the view titles use.
const copy = require('./package.nls.es.json');
const icons = { rootFolder: 'root-folder', creditCard: 'credit-card', graphLine: 'graph-line' };
const leaves = new Map();
function index(nodes) {
	for (const node of nodes) {
		if (node.children) { index(node.children); } else { leaves.set(node.id, node); }
	}
}
index(sample);
const engines = ['erp', 'ecms'];

async function readJson(uri) {
	try { return JSON.parse(new TextDecoder().decode(await vscode.workspace.fs.readFile(uri))); } catch { return undefined; }
}
// Default home of the obras, the same rule as create-ctrl `documentsRoot`.
function obrasRoot() {
	return vscode.Uri.file(path.join(process.env.CTRL_CREATE_DOCUMENTS || path.join(os.homedir(), 'Documents'), 'Ctrl'));
}
async function rootManifests() {
	const index = await readJson(vscode.Uri.joinPath(obrasRoot(), '.ctrl', 'locations.json'));
	const manifests = [];
	for (const target of (Array.isArray(index?.locations) ? index.locations : []).map(item => item?.target).filter(target => typeof target === 'string')) {
		const folder = vscode.Uri.joinPath(vscode.Uri.file(target), 'obras');
		let entries = [];
		try { entries = await vscode.workspace.fs.readDirectory(folder); } catch { /* Not materialized yet. */ }
		for (const [name, type] of entries) {
			if (type === vscode.FileType.Directory) { manifests.push(vscode.Uri.joinPath(folder, name, '.ctrl', 'obra.json')); }
		}
	}
	return manifests;
}
// Same create-ctrl folder contract and checks as obra-budgets/src/obraContext.ts.
async function findObras() {
	const obras = new Map();
	for (const uri of [...await rootManifests(), ...await vscode.workspace.findFiles('**/.ctrl/obra.json', '**/node_modules/**', 200)]) {
		const obra = await readJson(uri);
		const workspace = await readJson(vscode.Uri.joinPath(uri, '..', '..', '..', '..', '.ctrl', 'workspace.json'));
		if (obra?.schemaVersion !== 1 || workspace?.schemaVersion !== 1 || typeof obra.obraId !== 'string' || typeof workspace.clerkOrgId !== 'string') { continue; }
		if (obra.companyId !== workspace.companyId || obra.workspaceId !== workspace.workspaceId) { continue; }
		const modules = (obra.modules?.effective ?? []).filter(module => typeof module?.code === 'string' && engines.includes(module.engine));
		const key = `${workspace.clerkOrgId}/${obra.obraId}`;
		obras.set(key, { key, orgId: workspace.clerkOrgId, obraId: obra.obraId, name: typeof obra.name === 'string' ? obra.name : obra.obraId, modules });
	}
	return [...obras.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'));
}
// A module opens through the command `ctrl.open.<code>` that its extension contributes.
function moduleCommands() {
	const ids = new Set();
	for (const extension of vscode.extensions.all) {
		for (const command of extension.packageJSON?.contributes?.commands ?? []) {
			if (command.command?.startsWith('ctrl.open.')) { ids.add(command.command); }
		}
	}
	return ids;
}

async function activate(context) {
	let preview = false;
	let enabled = vscode.workspace.getConfiguration('obra.sidebar').get('enabled', true);
	const providers = [];
	const refresh = async value => {
		preview = value && enabled;
		await vscode.commands.executeCommand('setContext', 'obra.preview', preview);
		for (const provider of providers) { provider.emitter.fire(undefined); }
	};
	for (const key of ['inbox', 'cashflow', 'accounts', 'explorer']) {
		const emitter = new vscode.EventEmitter();
		context.subscriptions.push(emitter);
		const provider = {
			emitter,
			onDidChangeTreeData: emitter.event,
			getChildren: node => enabled && preview && key === 'explorer' ? (node ? node.children || [] : sample) : [],
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
	// One view with two states: the list of obras, or the modules of the open obra.
	let obras = [];
	let active;
	const emitter = new vscode.EventEmitter();
	context.subscriptions.push(emitter);
	const obraItem = obra => {
		const item = new vscode.TreeItem(obra.name, vscode.TreeItemCollapsibleState.None);
		item.id = obra.key;
		item.iconPath = new vscode.ThemeIcon('project');
		item.command = { command: 'obra.selectObra', title: obra.name, arguments: [obra.key] };
		return item;
	};
	const moduleItem = node => {
		if (!node.code) {
			const folder = new vscode.TreeItem(node.engine, vscode.TreeItemCollapsibleState.Expanded);
			folder.id = `${active.key}/${node.engine}`;
			folder.iconPath = vscode.ThemeIcon.Folder;
			return folder;
		}
		const item = new vscode.TreeItem(node.name || node.code, vscode.TreeItemCollapsibleState.None);
		item.id = `${active.key}/${node.code}`;
		item.iconPath = vscode.ThemeIcon.File;
		item.tooltip = node.code;
		const command = `ctrl.open.${node.code}`;
		if (moduleCommands().has(command)) {
			item.command = { command, title: item.label, arguments: [{ orgId: active.orgId, obraId: active.obraId }] };
		} else {
			item.description = copy.moduleSoon;
		}
		return item;
	};
	const obrasView = vscode.window.createTreeView('obra.projects.tree', {
		treeDataProvider: {
			onDidChangeTreeData: emitter.event,
			getChildren: node => {
				if (!enabled) { return []; }
				if (!active) { return node ? [] : obras; }
				if (!node) { return engines.filter(engine => active.modules.some(module => module.engine === engine)).map(engine => ({ engine })); }
				return node.code ? [] : active.modules.filter(module => module.engine === node.engine);
			},
			getTreeItem: node => active ? moduleItem(node) : obraItem(node),
		},
	});
	context.subscriptions.push(obrasView);
	const show = async obra => {
		active = obra;
		obrasView.title = active ? active.name : copy.projects;
		await vscode.commands.executeCommand('setContext', 'obra.activeObra', active?.key ?? '');
		emitter.fire(undefined);
	};
	const reloadObras = async () => {
		obras = enabled ? await findObras() : [];
		await show(obras.find(obra => obra.key === active?.key));
	};
	for (const pattern of ['**/.ctrl/{obra,workspace}.json', new vscode.RelativePattern(obrasRoot(), '**/.ctrl/{obra,workspace,locations}.json')]) {
		const watcher = vscode.workspace.createFileSystemWatcher(pattern);
		context.subscriptions.push(watcher, watcher.onDidCreate(reloadObras), watcher.onDidChange(reloadObras), watcher.onDidDelete(reloadObras));
	}
	// Brings the obras of the company (created on the web or by other members) into the default root.
	let pulling;
	const pullObras = () => pulling ??= (async () => {
		let orgs = obras.map(obra => obra.orgId);
		try { orgs = (await vscode.commands.executeCommand('ctrl.obra.organizations')).map(org => org.id); } catch { /* Offline: pull the companies already on disk. */ }
		for (const org of new Set(orgs)) {
			try { await vscode.commands.executeCommand('obra-auth.runWorkspaceCli', { kind: 'pull', org }); } catch { /* Offline or signed out: the local list stays. */ }
		}
		await reloadObras();
	})().finally(() => { pulling = undefined; });
	context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(reloadObras), vscode.extensions.onDidChange(() => emitter.fire(undefined)));
	context.subscriptions.push(vscode.commands.registerCommand('obra.selectObra', async key => {
		// A just-created obra can be on disk before the file watcher reloads the list.
		if (!obras.some(obra => obra.key === key)) { obras = enabled ? await findObras() : []; }
		await show(obras.find(obra => obra.key === key) ?? active);
	}));
	context.subscriptions.push(vscode.commands.registerCommand('obra.showObras', () => show(undefined)));
	context.subscriptions.push(vscode.commands.registerCommand('obra.refreshObras', () => vscode.window.withProgress({ location: { viewId: 'obra.projects.tree' } }, pullObras)));
	let pulledOnce = false;
	context.subscriptions.push(obrasView.onDidChangeVisibility(event => {
		if (event.visible && enabled && !pulledOnce) { pulledOnce = true; void vscode.commands.executeCommand('obra.refreshObras'); }
	}));
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
		await reloadObras();
	}));
	context.subscriptions.push({ dispose: () => { preview = false; } });
	await refresh(false);
	await reloadObras();
	// A persisted one-time onboarding marker; sample state is never persisted.
	if (enabled && !vscode.workspace.workspaceFolders && !context.globalState.get('obra.initialViewOpened')) {
		await context.globalState.update('obra.initialViewOpened', true);
		await vscode.commands.executeCommand('obra.projects.tree.focus');
	}
}
module.exports = { activate };

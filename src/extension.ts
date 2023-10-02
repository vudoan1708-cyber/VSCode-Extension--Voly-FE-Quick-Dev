// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import fs from 'fs';
import path from 'path';

// Classes
import Terminal from './terminal';
import ExpressApp from './server';

// Constant
import { DEV_BUILD_FOLDER, DISABLE_KEYWORD } from './constants';

// this method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	const extension = new FrontendQuickDevExtension(context);

	const disposable1 = vscode.commands.registerCommand('volyfequickdev.enable', () => {
		extension.toggleExtensionState(true);
	});
	const disposable2 = vscode.commands.registerCommand('volyfequickdev.disable', () => {
		extension.toggleExtensionState(false);
	});

	vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
		await extension.run(document);
	});

	vscode.window.showInformationMessage('volyfequickdev is now running...');

	context.subscriptions.push(disposable1, disposable2);
}

// this method is called when your extension is deactivated
export function deactivate() {}

class FrontendQuickDevExtension {
	private _context: vscode.ExtensionContext;

	constructor(context: vscode.ExtensionContext) {
		this._context = context;

		// Instantiate an express app
		const expressApp = new ExpressApp();
		expressApp.initialiseRoutes();
		expressApp.serveStatic();
	}

	private _isEnabled() {
		return !!this._context.globalState.get('volyfequickdev_enabled', true);
	}

	public async run(document: vscode.TextDocument) {
		if (document.languageId !== 'svelte') {
			console.warn('Not a svelte file');
			return;
		}

		if (!this._isEnabled()) {
			console.warn('Extension is not enabled');
			return;
		}

		// Check if single file disable
		if (document.getText().includes(DISABLE_KEYWORD)) {
			console.warn(`volyfequickdev has been disabled on ${document.fileName}`);
			return;
		}

		vscode.window.showInformationMessage('Instantiating and building relevant component(s)...');

		// Instantiate a custom terminal
		const terminal = new Terminal('volyfequickdev terminal');
		terminal.show();
		terminal.sendText(`npm run instantiation-scripts-gen --component=${document.fileName}`);
		terminal.sendText('npm run build-dev');
		await terminal.close();

		vscode.window.showInformationMessage('Build completed. Locating built file(s) and making copies to extension local workspace...');

		// remove existing file and folder before generating
		fs.rmSync(path.join(__dirname, '..', DEV_BUILD_FOLDER), { recursive: true, force: true });

		// Locate the root directory
		const fileName = vscode.window.activeTextEditor?.document.fileName;
		const root = vscode.workspace.workspaceFolders
			?.map((folder) => folder.uri.fsPath)
			?.find((fsPath) => fileName?.startsWith(fsPath));

		const devBuildsFolder = vscode.Uri.file(`${root}/build`);

		await vscode.workspace.fs.copy(devBuildsFolder, vscode.Uri.file(path.join(__dirname, '..', DEV_BUILD_FOLDER)), { overwrite: true });
		vscode.window.showInformationMessage('The built file(s) are now fetchable via the /dev-builds endpoint...');
	}

	public toggleExtensionState(value: boolean) {
		this._context.globalState.update('volyfequickdev_enabled', value);
	}
}

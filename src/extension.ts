// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import fetch from 'node-fetch';

import express, { Application } from 'express';
import http from 'http';

// Classes
import { Router } from './router';

// this method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	vscode.window.showInformationMessage('volyfequickdev is now running...');

	const extension = new FrontendQuickDevExtension(context);

	vscode.commands.registerCommand('volyfequickdev.enable', () => {
		extension.toggleExtensionState(true);
	});
	vscode.commands.registerCommand('volyfequickdev.disable', () => {
		extension.toggleExtensionState(false);
	});

	vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
		await extension.run(document);
	});
}

// this method is called when your extension is deactivated
export function deactivate() {}

class FrontendQuickDevExtension {
	private _context: vscode.ExtensionContext;
	private _serverApp: http.Server<any>;
	private _serverPort: number = 8090;

	constructor(context: vscode.ExtensionContext) {
		this._context = context;

		// Instantiate an express app
		const app: Application = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
		this._serverApp = http.createServer(app);
		this._serverApp.listen(this._serverPort, () => {
			console.log(`Server is running on port ${this._serverPort}`);
		});

		const router: Router = new Router(app);
		router.initialise();
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

		vscode.window.showInformationMessage('Instantiating and building relevant component(s)...');
		vscode.window.activeTerminal?.sendText(`npm run instantiation-scripts-gen --component=${document.fileName}`);
		vscode.window.activeTerminal?.sendText('npm run build-dev');

		const response = await fetch('https://test2.voly.co.uk/');
		const text = await response.text();
		// const panel = vscode.window.createWebviewPanel('volyfequickdev', 'Web', vscode.ViewColumn.One, {
		// 	enableScripts: true
		// });
		// panel.webview.html = text;
	}

	public toggleExtensionState(value: boolean) {
		this._context.globalState.update('volyfequickdev_enabled', value);
	}
}

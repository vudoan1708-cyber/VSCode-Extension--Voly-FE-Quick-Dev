// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import 'dotenv/config';

import fs from 'fs';
import path from 'path';

// Classes
import TerminalFactory from './terminalFactory';
import ExpressApp from './server';
import User from './user';
import RelayHybridConnectionFactory from './azure-relay/relayHybridConnectionFactory';

import { FolderView, ShareLocalView } from './ui';

import UICommands from './uiCommands';

// Constant
import { DEV_BUILD_FOLDER, DISABLE_KEYWORD, EXCLUDED_LIST } from './constants';

// Find the root directory from the current workspace
const activeFileName = vscode.window.activeTextEditor?.document.fileName;
let rootDirectory: string | undefined = vscode.workspace.workspaceFolders
	?.map((folder) => folder.uri.fsPath)
	?.find((fsPath) => activeFileName?.startsWith(fsPath));

// Find the dev-builds folder from within the extension workspace
const pathToDevBuildsFolder = path.join(__dirname, '..', DEV_BUILD_FOLDER);

export async function activate(context: vscode.ExtensionContext) {
	// Azure relay hybrid connection
	const hybridConnector = new RelayHybridConnectionFactory();
	const extension = new FrontendQuickDevExtension(context, new TerminalFactory());
	// User
	const user = new User();
	// UIs
	const folderViewProvider = new FolderView(path.dirname(__dirname));
	const connectionViewProvider = new ShareLocalView();

	const folderTreeView = vscode.window.createTreeView('volyfequickdev-devbuilds-explorer', {
		treeDataProvider: folderViewProvider,
		canSelectMany: true,
	});
	const connectionTreeView = vscode.window.createTreeView('volyfequickdev-sharelocal', {
		treeDataProvider: connectionViewProvider,
	});

	// Disposables
	const disposable1 = vscode.commands.registerCommand('volyfequickdev.enable', () => {
		extension.toggleExtensionState(true);
		vscode.window.showInformationMessage('[volyfequickdev] has been re-activated');
	});
	const disposable2 = vscode.commands.registerCommand('volyfequickdev.disable', () => {
		extension.toggleExtensionState(false);
		vscode.window.showWarningMessage('[volyfequickdev] has been deactivated');
	});
	const disposable3 = UICommands.toRefreshEntry(folderViewProvider);
	const disposable4 = UICommands.toWatchDevBuildsFolderChangeAndUpdate(rootDirectory as string, pathToDevBuildsFolder);
	const disposable5 = UICommands.toRemoveDevBuildsFolder(pathToDevBuildsFolder);
	const [ disposable6, disposable7 ] = UICommands.toRemoveEntries(pathToDevBuildsFolder, folderTreeView);
	const disposable8 = UICommands.toConnectWithAnotherLocal(rootDirectory as string, user.role, connectionViewProvider, hybridConnector);
	const disposable9 = UICommands.toShareLocal(pathToDevBuildsFolder, hybridConnector);
	const disposable10 = UICommands.toRefreshSharedConnection(connectionViewProvider);

	const disposable11 = vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
		await extension.run(document);
	});

	await UICommands.toDecideViewToDisplayBasedOnUserRole(user.role);

	vscode.window.showInformationMessage('[volyfequickdev] The extension is now running...');

	context.subscriptions.push(
		disposable1,
		disposable2,
		disposable3,
		disposable4,
		disposable5,
		disposable6,
		disposable7,
		disposable8,
		disposable9,
		disposable10,
		disposable11,
	);
}

// this method is called when your extension is deactivated
export function deactivate() {
	// remove existing build folder from the working workspace before VSCode is shutdown
	if (!rootDirectory) {
		return;
	}
	if (!fs.existsSync(`${rootDirectory}/build`)) {
		return;
	}
	fs.rmSync(`${rootDirectory}/build`, { recursive: true, force: true });
}

class FrontendQuickDevExtension {
	private _context: vscode.ExtensionContext;
	private _terminalFactoryInstance: TerminalFactory;
	private _expressApp: ExpressApp;

	constructor(
		context: vscode.ExtensionContext,
		terminalFactory: TerminalFactory,
	) {
		this._context = context;
		this._terminalFactoryInstance = terminalFactory;

		// Instantiate an express app
		this._expressApp = new ExpressApp();
		this._expressApp.initialiseRoutes();
		this._expressApp.serveStatic();
	}

	private _isEnabled() {
		return !!this._context.globalState.get('volyfequickdev_enabled', true);
	}

	public async run(document: vscode.TextDocument) {
		if (document.languageId !== 'svelte' || document.fileName.includes('stories')) {
			console.warn('Not a valid svelte component file');
			return;
		}

		if (!this._isEnabled()) {
			console.warn('Extension is not enabled');
			return;
		}

		const savedFileName = path.basename(document.fileName);

		// Check if single file disable
		if (document.getText().includes(DISABLE_KEYWORD)) {
			console.warn(`[volyfequickdev] has been disabled on ${savedFileName}`);
			return;
		}

		// Check for the exclude list
		if (EXCLUDED_LIST.includes(path.basename(rootDirectory || ''))) {
			console.warn(`[volyfequickdev] ${path.basename(rootDirectory || '')} is not a target for the extension to run on`);
			return;
		}

		vscode.window.showInformationMessage('Instantiating and building relevant component(s)...');

		// Instantiate a custom terminal
		const terminal = this._terminalFactoryInstance.createTerminal(`volyfequickdev terminal: ${savedFileName}`);
		terminal.sendText(`npm run instantiation-scripts-gen --component=${document.fileName}`);
		terminal.sendText('npm run build-dev');
		const status = await this._terminalFactoryInstance.terminate(terminal);

		// If user forcibly close the terminal or if the reason for closing a terminal is not naturally by the shell process
		if (status.code === undefined || status.reason !== 2) {
			return;
		}

		vscode.window.showInformationMessage('Build completed. Locating built file(s) and making copies of them to the extension\'s local workspace...');

		// Locate the build folder
		const localBuildsFolder = vscode.Uri.file(`${rootDirectory}/build`);

		try {
			await vscode.workspace.fs.copy(localBuildsFolder, vscode.Uri.file(pathToDevBuildsFolder), { overwrite: true });
			vscode.commands.executeCommand('volyfequickdev.folder-explorer.refresh-entry');
			vscode.window.showInformationMessage('The built file(s) are now fetchable via the /dev-builds endpoint...');
		} catch (err) {
			console.error(err);
			// TODO: Need to prompt user to perform the copying again
		}
	}

	public toggleExtensionState(value: boolean) {
		this._context.globalState.update('volyfequickdev_enabled', value);
	}
}

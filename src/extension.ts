// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import 'dotenv/config';

import fs from 'fs';
import path from 'path';

// Classes
import TerminalFactory from './terminalFactory';
import KoaApp from './server';
import User from './user';
import NgrokFactory from './ngrok/ngrokFactory';
// import RelayHybridConnectionFactory from './azure-relay/relayHybridConnectionFactory';

import { FolderView, ShareLocalView, SettingView } from './ui';

import UICommands from './uiCommands';

// Helpers
import { DEV_BUILD_FOLDER, DISABLE_KEYWORD, INCLUSTION_LIST } from './constants';
import { findInstantiables, traceSourcesOfImport } from './helpers';

// Types
import { Instantiable } from './types';

// Find the root directory from the current workspace
const activeFileName = vscode.window.activeTextEditor?.document.fileName;
let rootDirectory: string | undefined = vscode.workspace.workspaceFolders
	?.map((folder) => folder.uri.fsPath)
	?.find((fsPath) => activeFileName?.startsWith(fsPath));

// Find the dev-builds folder from within the extension workspace
const pathToDevBuildsFolder = path.join(__dirname, '..', DEV_BUILD_FOLDER);

export async function activate(context: vscode.ExtensionContext) {
	if (!rootDirectory) {
		vscode.window.showErrorMessage(`[volyfequickdev] Cannot find root directory. Possibly due to no active document found on VSCode.
		Please select any file in the interested workspace and reload VSCode so that the extension can work properly`);
		return;
	}
	// Azure relay hybrid connection
	// const hybridConnector = new RelayHybridConnectionFactory();
	// Ngrok to expose local development to the world (for quick collaborative testing)
	const ngrokInstance = new NgrokFactory();
	// Server
	const server = new KoaApp(rootDirectory); 
	const extension = new FrontendQuickDevExtension(context, server, new TerminalFactory());
	// User
	const user = new User();
	// UIs
	const folderViewProvider = new FolderView(path.dirname(__dirname));
	const sharedLocalViewProvider = new ShareLocalView();
	const settingViewProvider = new SettingView(context, server);

	const folderTreeView = vscode.window.createTreeView('volyfequickdev-devbuilds-explorer', {
		treeDataProvider: folderViewProvider,
		canSelectMany: true,
	});
	const sharedLocalTreeView = vscode.window.createTreeView('volyfequickdev-sharelocal', {
		treeDataProvider: sharedLocalViewProvider,
	});
	const settingTreeView = vscode.window.createTreeView('volyfequickdev-settings', {
		treeDataProvider: settingViewProvider,
		manageCheckboxStateManually: true,
	});

	// Disposables
	const disposable1 = UICommands.toActivateExtension(context);
	const disposable2 = UICommands.toDeactivateExtension(context);
	const disposable3 = UICommands.toRefreshFileEntry(folderViewProvider);
	/* eslint-disable @typescript-eslint/naming-convention */
	const [ disposable4_1, disposable4_2 ] = UICommands.toWatchDevBuildsFolderChangeAndUpdate(rootDirectory as string, pathToDevBuildsFolder);
	const disposable5 = UICommands.toRemoveDevBuildsFolder(pathToDevBuildsFolder);
	const [ disposable6, disposable7 ] = UICommands.toRemoveFileEntries(pathToDevBuildsFolder, folderTreeView);
	// Shareable Local
	// const disposable8 = UICommands.toConnectWithAnotherLocal(rootDirectory as string, user.role, sharedLocalViewProvider, hybridConnector);
	// const disposable9 = UICommands.toShareLocal(pathToDevBuildsFolder, hybridConnector);
	const disposable8 = UICommands.toRefreshAddressView(sharedLocalViewProvider);
	const disposable9 = UICommands.toExposeLocalToTheWorld(sharedLocalViewProvider, ngrokInstance);
	const [ disposable9_1, disposable9_2 ] = UICommands.toRemoveAddressEntries(sharedLocalViewProvider, sharedLocalTreeView, ngrokInstance);
	// Settings
	const disposable10 = UICommands.toCloseExtensionServer(server);
	const disposable11 = UICommands.toRestartExtensionServer(server);
	const disposable12 = UICommands.toSwitchToHttp(server);
	const disposable13 = UICommands.toSwitchToHttps(server);
	const disposable14 = UICommands.toRefreshSettingView(settingViewProvider);

	const disposable15 = vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
		await extension.run(document);
	});

	// await UICommands.toDecideViewToDisplayBasedOnUserRole(user.role);

	vscode.window.showInformationMessage('[volyfequickdev] The extension is now running...');

	context.subscriptions.push(
		disposable1,
		disposable2,
		disposable3,
		disposable4_1,
		disposable4_2,
		disposable5,
		disposable6,
		disposable7,
		disposable8,
		disposable9,
		disposable9_1,
		disposable9_2,
		// disposable9,
		disposable10,
		disposable11,
		disposable12,
		disposable13,
		disposable14,
		disposable15,
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
	private _koaApp: KoaApp;

	constructor(
		context: vscode.ExtensionContext,
		server: KoaApp,
		terminalFactory: TerminalFactory,
	) {
		this._context = context;
		this._terminalFactoryInstance = terminalFactory;

		// Instantiate an express app
		this._koaApp = server;
		this._koaApp.initialiseRoutes();
		this._koaApp.serveStatic();
	}

	private _isEnabled() {
		return !!this._context.globalState.get('volyfequickdev_activated', true);
	}

	public async run(document: vscode.TextDocument) {
		if (!this._isEnabled()) {
			console.warn('[volyfequickdev] Extension is not enabled');
			return;
		}

		if (document.languageId !== 'svelte' || document.fileName.includes('stories')) {
			console.warn('[volyfequickdev] Not a valid svelte component file');
			return;
		}

		const savedFileName = path.basename(document.fileName);

		// Check if there is a disable keyword in the active file
		if (document.getText().includes(DISABLE_KEYWORD)) {
			console.warn(`[volyfequickdev] has been disabled on ${savedFileName}`);
			return;
		}

		// If repo name is not in the inclusion list
		if (!INCLUSTION_LIST.includes(path.basename(rootDirectory || ''))) {
			console.warn(`[volyfequickdev] ${path.basename(rootDirectory || '')} is not a target for the extension to run on`);
			return;
		}

		const instantiables = findInstantiables(
			document.fileName,
			{
				stopTillNotFound: 'src',
				savedFilePathExist: this._terminalFactoryInstance.activePathsExist(document.fileName),
				terminatedTerminalPaths: this._terminalFactoryInstance.findTerminatedPaths(),
			})
			.filter((i) => i.fullPath && i.fileName);
		// Sources of import
		const sources = traceSourcesOfImport(
			document.fileName,
			{
				stopTillNotFound: 'src',
				activeTerminalIds: this._terminalFactoryInstance.hashActiveIds(),
			}
		);

		let selectedApproach: Instantiable[];

		if (sources.length === 0 && instantiables.length > 0) {
			selectedApproach = [ ...instantiables ];
		} else {
			selectedApproach = [ ...sources ];
		}
		const instantiablePath = selectedApproach.map((i) => i.fullPath).join(',');
		const instantiableDataComponent = selectedApproach.map((i) => i.fileName).join(',');
		// Instantiate a custom terminal
		const terminal = this._terminalFactoryInstance.createTerminal(
			`volyfequickdev terminal: ${savedFileName}`,
			instantiableDataComponent,
			instantiablePath,
			document.fileName,
		);
		if (!terminal) {
			return;
		}

		terminal.sendText(`npm run instantiation-scripts-gen --component="${instantiablePath}" --keepOldScripts`);
		terminal.sendText(`npm run build-dev --configDevBuilds="${instantiableDataComponent}"`);
		const status = await this._terminalFactoryInstance.terminate(terminal);

		// If user forcibly close the terminal or if the reason for closing a terminal is not naturally by the shell process
		if (status.code === undefined || status.reason !== 2) {
			return;
		}

		vscode.window.showInformationMessage('Build completed. Locating built file(s) and making copies of them to the extension\'s local workspace...');

		// Relocate the root directory - useful when a dev is working in a multiworkspace window, or if there is no active document when VSCode extension got initialised
		rootDirectory = vscode.workspace.workspaceFolders
			?.map((folder) => folder.uri.fsPath)
			?.find((fsPath) => document.fileName.startsWith(fsPath));
		// Locate the build folder
		const localBuildsFolder = vscode.Uri.file(`${rootDirectory}/build`);

		try {
			await vscode.workspace.fs.copy(localBuildsFolder, vscode.Uri.file(pathToDevBuildsFolder), { overwrite: true });
			vscode.commands.executeCommand('volyfequickdev.folder-explorer.refresh-entry');
			vscode.window.showInformationMessage('The built file(s) are now fetchable via the /dev-builds endpoint...');
		} catch (err) {
			console.error(err);
			// TODO: Need to prompt user to perform the copying again
			vscode.window.showErrorMessage('Files could not be synced up to the extension workspace. Please retry');
		}
	}
}

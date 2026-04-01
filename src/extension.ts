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
import TunnelFactory from './tunnel/tunnelFactory';
// import RelayHybridConnectionFactory from './azure-relay/relayHybridConnectionFactory';

import { FolderView, ShareLocalView, SettingView } from './ui';

import UICommands from './uiCommands';

// Helpers
import { DEV_BUILD_FOLDER, DISABLE_KEYWORD, INCLUSTION_LIST } from './constants';
import { findInstantiables, traceSourcesOfImport } from './helpers';

// Types
import { Instantiable } from './types';

// Find the root directory from the current workspace
const activeFileName = vscode.window.activeTextEditor?.document?.fileName;
const workspaceDirectory: string | undefined = vscode.workspace.workspaceFolders
	?.map((folder) => folder.uri.fsPath)
	?.find((fsPath) => activeFileName?.startsWith(fsPath)) ?? '';
let rootDirectory = workspaceDirectory.endsWith('voly-ui')
	? path.join(workspaceDirectory)
	: path.join(workspaceDirectory, '..', '..');

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
	// LocalTunnel to expose local development to the world (for quick collaborative testing)
	const tunnelFactory = new TunnelFactory();
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
	const disposable8 = UICommands.toExposeLocalToTheWorld(sharedLocalViewProvider, tunnelFactory);
	const disposable9 = UICommands.toRefreshAddressView(sharedLocalViewProvider);
	const disposable10 = UICommands.toCopyAddressURL(sharedLocalTreeView);
	const [ disposable11, disposable12 ] = UICommands.toRemoveAddressEntries(sharedLocalViewProvider, sharedLocalTreeView, tunnelFactory);
	// Settings
	const disposable13 = UICommands.toCloseExtensionServer(server);
	const disposable14 = UICommands.toRestartExtensionServer(server);
	const disposable15 = UICommands.toSwitchToHttp(server);
	const disposable16 = UICommands.toSwitchToHttps(server);
	const disposable17 = UICommands.toRefreshSettingView(settingViewProvider);

	const disposable18 = vscode.workspace.onDidSaveTextDocument(async (document: vscode.TextDocument) => {
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
		disposable10,
		disposable11,
		disposable12,
		disposable13,
		disposable14,
		disposable15,
		disposable16,
		disposable17,
		disposable18,
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
	private _allowedLanguages: Array<string>;

	constructor(
		context: vscode.ExtensionContext,
		server: KoaApp,
		terminalFactory: TerminalFactory,
	) {
		this._context = context;
		this._terminalFactoryInstance = terminalFactory;

		// Instantiate a server app
		this._koaApp = server;
		this._koaApp.initialiseRoutes();
		this._koaApp.serveStatic();

		this._allowedLanguages = [ 'svelte', 'javascriptreact' ];
	}

	private _isEnabled() {
		return !!this._context.globalState.get('volyfequickdev_activated', true);
	}

	private _isThemeFile(document: vscode.TextDocument) {
		return document.languageId === 'json' && document.fileName.includes('voly-ui/libs/vfm-ui-themes') && document.fileName.endsWith('config.json');
	}

	private _isFileAllowed(document: vscode.TextDocument) {
		return this._allowedLanguages.includes(document.languageId) || this._isThemeFile(document);
	}

	private _traceBuildableComponents(fileName: string): Instantiable[] {
		let files: Instantiable[];

		const instantiables = findInstantiables(
			fileName,
			{
				stopTillNotFound: 'src',
				savedFilePathExist: this._terminalFactoryInstance.activePathsExist(fileName),
				terminatedTerminalPaths: this._terminalFactoryInstance.findTerminatedPaths(),
			})
			.filter((i) => i.fullPath && i.fileName);

		if (instantiables.length === 1) {
			files = [ ...instantiables ];
		} else {
			// Sources of import
			const sources = traceSourcesOfImport(
				fileName,
				{
					stopTillNotFound: 'src',
					activeTerminalIds: this._terminalFactoryInstance.hashActiveIds(),
				}
			);
	
			if (sources.length === 0 && instantiables.length > 0) {
				files = [ ...instantiables ];
			} else {
				files = [ ...sources ];
			}
		}

		return files;
	}

	public async run(document: vscode.TextDocument) {
		if (!this._isEnabled()) {
			console.warn('[volyfequickdev] Extension is not enabled');
			return;
		}
		if (!this._isFileAllowed(document) || document.fileName.includes('stories')) {
			console.warn(`[volyfequickdev] Extension can only run on ${this._allowedLanguages.join(' and ')} files or .json for themes`);
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

		let selectedApproach: Instantiable[];

		selectedApproach = this._isThemeFile(document) ? [{ fullPath: document.fileName, fileName: savedFileName }] : this._traceBuildableComponents(document.fileName);
		const instantiablePath = selectedApproach.map((i) => i.fullPath).join(',');
		const instantiableDataComponent = selectedApproach.map((i) => i.fileName).join(',');
		// Instantiate a custom terminal
		const terminal = this._terminalFactoryInstance.createTerminal(
			this._isThemeFile(document) ? `volyfequickdev terminal: ${document.fileName}` : `volyfequickdev terminal: ${savedFileName}`,
			this._isThemeFile(document) ? instantiablePath : instantiableDataComponent,
			instantiablePath,
			document.fileName,
		);
		if (!terminal) {
			return;
		}

		switch (true) {
			case this._isThemeFile(document):
				const parentFolder = path.dirname(path.resolve(instantiablePath));
				terminal.sendText(`npm run build-theme-dev --configDevBuilds="${parentFolder}" --configDevPort="${this._koaApp.selectedPort}" -- --release-environment=dev-builds`);
				break;
			default:
				terminal.sendText(`npm run instantiation-scripts-gen --component="${instantiablePath}" --keepOldScripts`);
				terminal.sendText(`npm run build-dev --configDevBuilds="${instantiableDataComponent}"`);
				break;
		}
		const status = await this._terminalFactoryInstance.terminate(terminal);

		// If user forcibly close the terminal or if the reason for closing a terminal is not naturally by the shell process
		if (status.code === undefined || status.reason !== 2) {
			return;
		}

		vscode.window.showInformationMessage('Build completed. Locating built file(s) and making copies of them to the extension\'s local workspace...');

		// Relocate the root directory - useful when a dev is working in a multiworkspace window, or if there is no active document when VSCode extension got initialised
		rootDirectory = vscode.workspace.workspaceFolders
			?.map((folder) => folder.uri.fsPath)
			?.find((fsPath) => document.fileName.startsWith(fsPath)) ?? '';
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

import * as vscode from 'vscode';

import fs from 'fs';
import path from 'path';

import FolderView, { BuiltFile } from './ui/folderView';
import ShareLocalView, { ExposedAddress } from './ui/shareLocalView';

import TunnelFactory from './tunnel/tunnelFactory';
// import RelayHybridConnectionFactory from './azure-relay/relayHybridConnectionFactory';

// Classes
// import User from './user';
import KoaApp from './server';
import SettingView from './ui/settings';

export default class UICommands {
  public static toRefreshFileEntry(folderViewProvider: FolderView): vscode.Disposable {
		return vscode.commands.registerCommand('volyfequickdev.folder-explorer.refresh-entry', () => {
      folderViewProvider.refresh();
    });
  }

  public static toWatchDevBuildsFolderChangeAndUpdate(
    rootDirectoryFromTheOtherSide: string,
    pathToDevBuildsFolder: string
  ): vscode.Disposable[] {
    const localBuildsFolder = vscode.Uri.file(path.join(rootDirectoryFromTheOtherSide, 'build'));
    const fileWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(localBuildsFolder, '*.{js, css}')
    );
    const copyFiles = async (uri: vscode.Uri) => {
      await vscode.workspace.fs.copy(localBuildsFolder, vscode.Uri.file(pathToDevBuildsFolder), { overwrite: true });
			await vscode.commands.executeCommand('volyfequickdev.folder-explorer.refresh-entry');
      vscode.window.showInformationMessage(`[volyfequickdev] ${path.basename(uri.path)} is available via the /dev-builds endpoint`);
    };

    const disposable = fileWatcher.onDidCreate(async (uri) => {
      copyFiles(uri);
    });
    const disposable1 = fileWatcher.onDidChange(async (uri) => {
      copyFiles(uri);
    });
    return [ disposable, disposable1 ];
  }

  public static toRemoveDevBuildsFolder(pathToDevBuildsFolder: string): vscode.Disposable {
    return vscode.commands.registerCommand('volyfequickdev.folder-explorer.remove-dev-builds-folder', async () => {
      fs.rmSync(pathToDevBuildsFolder, { recursive: true, force: true });
      await vscode.commands.executeCommand('volyfequickdev.folder-explorer.refresh-entry');
      vscode.window.showInformationMessage('[volyfequickdev] The folder has been removed');
    });
  }

  public static toRemoveFileEntries(
    pathToDevBuildsFolder: string,
    treeView: vscode.TreeView<BuiltFile>
  ): vscode.Disposable[] {
    let multiSelectedTreeItems: Readonly<BuiltFile[]>	= [];
    const disposable = treeView.onDidChangeSelection((e) => {
      multiSelectedTreeItems = e.selection;
    });
    const disposable1 = vscode.commands.registerCommand('volyfequickdev.folder-explorer.remove-entry', async (node: BuiltFile) => {
      // If number of selected items equals the total number of files in the dev-builds folder, then remove all
      if (multiSelectedTreeItems.length === fs.readdirSync(pathToDevBuildsFolder).length) {
        await vscode.commands.executeCommand('volyfequickdev.folder-explorer.remove-dev-builds-folder');
      } else if (multiSelectedTreeItems.length > 1) {
        multiSelectedTreeItems.forEach((file) => {
          fs.rmSync(file.fullPath, { force: true });
        });
        vscode.window.showInformationMessage(`[volyfequickdev] ${multiSelectedTreeItems.length} items have been removed`);
      } else {
        fs.rmSync(node.fullPath, { force: true });
        vscode.window.showInformationMessage(`[volyfequickdev] ${node.label} has been removed`);
      }
      vscode.commands.executeCommand('volyfequickdev.folder-explorer.refresh-entry');
    });

    return [ disposable, disposable1 ];
  }

  /* Shareable Local */
  public static toCopyAddressURL(
    treeView: vscode.TreeView<ExposedAddress>,
  ): vscode.Disposable {
    return vscode.commands.registerCommand('volyfequickdev.share-local.copy-entry', async (node: ExposedAddress) => {
      await vscode.env.clipboard.writeText(node.address);
    });
  }
  public static toRefreshAddressView(sharedLocalViewProvider: ShareLocalView): vscode.Disposable {
		return vscode.commands.registerCommand('volyfequickdev.share-local.refresh-view', () => {
      sharedLocalViewProvider.refresh();
    });
  }
  public static toRemoveAddressEntries(
    sharedLocalViewProvider: ShareLocalView,
    treeView: vscode.TreeView<ExposedAddress>,
    tunn: TunnelFactory,
  ): vscode.Disposable[] {
    let multiSelectedTreeItems: Readonly<ExposedAddress[]>	= [];
    const disposable = treeView.onDidChangeSelection((e) => {
      multiSelectedTreeItems = e.selection;
    });
    const disposable1 = vscode.commands.registerCommand('volyfequickdev.share-local.remove-entry', async (node: ExposedAddress) => {
      if (multiSelectedTreeItems.length > 1) {
        // disconnect selected tunn url connections
        for (const item of multiSelectedTreeItems) {
          tunn.disconnect(item.address);
          sharedLocalViewProvider.removeAddress(item.address);
        }
        vscode.window.showInformationMessage(`[volyfequickdev] ${multiSelectedTreeItems.length} items have been removed`);
      } else {
        // disconnect tunn url connection
        tunn.disconnect(node.address);
        // remove tree item
        sharedLocalViewProvider.removeAddress(node.address);
        vscode.window.showInformationMessage(`[volyfequickdev] ${node.address} has been removed`);
      }
      vscode.commands.executeCommand('volyfequickdev.share-local.refresh-view');
    });

    return [ disposable, disposable1 ];
  }

  public static toExposeLocalToTheWorld(
    sharedLocalViewProvider: ShareLocalView,
    tunn: TunnelFactory,
  ): vscode.Disposable {
    return vscode.commands.registerCommand('volyfequickdev.share-local.share', async () => {
      // Type in the port number / host and port
      const inputted: string | undefined = await vscode.window.showInputBox({
        placeHolder: 'Enter the method follow by a colon and a port number to forward on localhost',
        prompt: 'localtunnel:8090 or serveo:4222',
        value: 'serveo:8090',
      });

      if (!inputted) {
        vscode.window.showErrorMessage(`[volyfequickdev] Input is not a valid value: ${inputted}`);
        return;
      }

      // If input the colon separator, then return
      if (inputted.indexOf(':') < 0) {
        vscode.window.showErrorMessage(`[volyfequickdev] Input is not accepted (something like localtunnel:8090 or serveo:8090). Value is ${inputted}`);
        return;
      }

      let [ method, port ] = inputted.split(':');
      // If input doesn't include a method (localtunnel or serveo), then return
      if (method !== 'localtunnel' && method !== 'serveo') {
        vscode.window.showErrorMessage('[volyfequickdev] Method is not found. Please only type in either localtunnel or serveo');
        return;
      }
      // If port is not an integer, then return
      if (!Number.isInteger(Number(port))) {
        vscode.window.showErrorMessage('[volyfequickdev] port is not a number');
        return;
      }

      try {
        const response = await tunn.forward({ port: Number(port), method });
        sharedLocalViewProvider.assignAddress(response as string, inputted);
        vscode.window.showInformationMessage(`[volyfequickdev]  Ingress established at: ${response}`);
        vscode.commands.executeCommand('volyfequickdev.share-local.refresh-view');
      } catch (err) {
        vscode.window.showErrorMessage(`[localtunnel] ${err}`);
      }
      });
  };
  // TODO: If a dev decides to expose a different port to one that serves component files. Need to copy files over that port too
  // public static toShareLocal(
  //   pathToDevBuildsFolder: string,
  //   tunn: TunnelFactory,
  // ): vscode.Disposable {
  //   return vscode.commands.registerCommand('volyfequickdev.share-local.share', async () => {
  //     const bufferedFiles: { fileName: string, bits: string }[] = [];
  //     fs.readdirSync(pathToDevBuildsFolder).forEach((fileName) => {
  //       const base64FileContent = fs.readFileSync(path.join(pathToDevBuildsFolder, fileName), { encoding: 'base64' });
  //       bufferedFiles.push({ fileName, bits: base64FileContent });
  //     });
  
  //     const response = hybridConnector.send({ reason: 'fileSend', data: bufferedFiles });
  //     if (response?.status) {
  //       vscode.window.showWarningMessage(`[volyfequickdev] ${response.status}`);
  //     }
  //   });
  // }

  /* Settings */
  public static toCloseExtensionServer(server: KoaApp): vscode.Disposable {
    return vscode.commands.registerCommand('volyfequickdev.settings.close-server', () => {
      if (!server) {
        return;
      }
      server.closeServer() || server.closeSecuredServer();
      vscode.commands.executeCommand('volyfequickdev.settings.refresh-view');
    });
  }
  public static toRestartExtensionServer(server: KoaApp): vscode.Disposable {
    return vscode.commands.registerCommand('volyfequickdev.settings.restart-server', async () => {
      if (!server) {
        return;
      }

      const port: string | undefined = await vscode.window.showInputBox({
        placeHolder: 'Type in a port number. Be advised to use the correct port that the UI-Loader can fetch from',
        value: server.selectedPort?.toString(),
      });

      if (!port) {
        return;
      }
      server.startServer(Number(port));
      vscode.commands.executeCommand('volyfequickdev.settings.refresh-view');
    });
  }

  // Network Protocols settings
  public static toSwitchToHttp(server: KoaApp): vscode.Disposable {
    return vscode.commands.registerCommand('volyfequickdev.settings.http', () => {
      if (!server) {
        return;
      }
      server.startServer(server.selectedPort);
      vscode.commands.executeCommand('volyfequickdev.settings.refresh-view');
    });
  }
  public static toSwitchToHttps(server: KoaApp): vscode.Disposable {
    return vscode.commands.registerCommand('volyfequickdev.settings.https', () => {
      if (!server) {
        return;
      }
      server.startSecuredServer(server.selectedPort);
      vscode.commands.executeCommand('volyfequickdev.settings.refresh-view');
    });
  }

  public static toActivateExtension(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand('volyfequickdev.settings.activate-extension', () => {
      context.globalState.update('volyfequickdev_activated', true);
      vscode.commands.executeCommand('volyfequickdev.settings.refresh-view');
      vscode.window.showInformationMessage('[volyfequickdev] has been re-activated');
    });
  }
  public static toDeactivateExtension(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand('volyfequickdev.settings.deactivate-extension', () => {
      context.globalState.update('volyfequickdev_activated', false);
      vscode.commands.executeCommand('volyfequickdev.settings.refresh-view');
      vscode.window.showWarningMessage('[volyfequickdev] has been deactivated');
    });
  }

  public static toRefreshSettingView(settingViewProvider: SettingView): vscode.Disposable {
    return vscode.commands.registerCommand('volyfequickdev.settings.refresh-view', () => {
      settingViewProvider.refresh();
    });
  }
}

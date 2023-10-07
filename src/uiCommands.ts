import * as vscode from 'vscode';

import fs from 'fs';
import path from 'path';

import FolderView, { BuiltFile } from './ui/folderView';
import RelayHybridConnectionFactory from './azure-relay/relayHybridConnectionFactory';

// Classes
import User from './user';

export default class UICommands {
  public static toRefreshEntry(folderViewProvider: FolderView): vscode.Disposable {
		return vscode.commands.registerCommand('volyfequickdev.folder-explorer.refresh-entry', () => {
      folderViewProvider.refresh();
    });
  }

  public static toRemoveDevBuildsFolder(pathToDevBuildsFolder: string): vscode.Disposable {
    return vscode.commands.registerCommand('volyfequickdev.folder-explorer.remove-dev-builds-folder', () => {
      fs.rmSync(pathToDevBuildsFolder, { recursive: true, force: true });
      vscode.commands.executeCommand('volyfequickdev.folder-explorer.refresh-entry');
      vscode.window.showInformationMessage('The folder has been removed');
    });
  }

  public static toRemoveEntries(
    pathToDevBuildsFolder: string,
    treeView: vscode.TreeView<BuiltFile>
  ): vscode.Disposable[] {
    let multiSelectedTreeItems: Readonly<BuiltFile[]>	= [];
    const disposable = treeView.onDidChangeSelection((e) => {
      multiSelectedTreeItems = e.selection;
    });
    const disposable1 = vscode.commands.registerCommand('volyfequickdev.folder-explorer.remove-entry', (node: BuiltFile) => {
      // If number of selected items equals the total number of files in the dev-builds folder, then remove all
      if (multiSelectedTreeItems.length === fs.readdirSync(pathToDevBuildsFolder).length) {
        vscode.commands.executeCommand('volyfequickdev.folder-explorer.remove-dev-builds-folder');
      } else if (multiSelectedTreeItems.length > 1) {
        multiSelectedTreeItems.forEach((file) => {
          fs.rmSync(file.fullPath, { force: true });
        });
        vscode.window.showInformationMessage(`${multiSelectedTreeItems.length} items have been removed`);
      } else {
        fs.rmSync(node.fullPath, { force: true });
        vscode.window.showInformationMessage(`${node.label} has been removed`);
      }
      vscode.commands.executeCommand('volyfequickdev.folder-explorer.refresh-entry');
    });

    return [ disposable, disposable1 ];
  }

  public static async toDecideViewToDisplayBasedOnUserRole(userRole: User['role']) {
    switch (userRole) {
      case 'frontend':
        await vscode.commands.executeCommand('setContext', 'volyfequickdev-sharelocal.senderIsFrontend', true);
        break;
      case 'backend':
        await vscode.commands.executeCommand('setContext', 'volyfequickdev-sharelocal.senderIsFrontend', false);
        break;
      default:
        console.error("User doesn't have one of the specified roles");
        break;
    }
  }

  public static toConnectWithAnotherLocal(
    rootDirectory: string,
    userRole: User['role'],
    hybridConnector: RelayHybridConnectionFactory): vscode.Disposable {
    return vscode.commands.registerCommand('volyfequickdev.share-local.connect', async () => {
      const placeHolder = {
        frontend: 'Type in a connection password to share your local with others',
        backend: 'Type in the connection password that is shared from a frontend developer',
      };
      const inputted: string | undefined = await vscode.window.showInputBox({
        placeHolder: placeHolder[userRole],
      });
      console.warn('inputted', inputted);

      if (!inputted) {
        return;
      }
      hybridConnector.createInstance(userRole, inputted, rootDirectory);
    });
  }

  public static toShareLocal(
    pathToDevBuildsFolder: string,
    hybridConnector: RelayHybridConnectionFactory
  ): vscode.Disposable {
    return vscode.commands.registerCommand('volyfequickdev.share-local.share', async () => {
      const bufferedFiles: { fileName: string, bits: string }[] = [];
      fs.readdirSync(pathToDevBuildsFolder).forEach((fileName) => {
        const base64FileContent = fs.readFileSync(path.join(pathToDevBuildsFolder, fileName), { encoding: 'base64' });
        bufferedFiles.push({ fileName, bits: base64FileContent });
      });
      console.log(bufferedFiles);
  
      const response = hybridConnector.send({ reason: 'fileSend', data: bufferedFiles });
      if (response?.status) {
        vscode.window.showWarningMessage(response.status);
      }
    });
  }
}

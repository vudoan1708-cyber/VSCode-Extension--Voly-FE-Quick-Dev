import * as vscode from 'vscode';

import path from 'path';
import fs from 'fs';

import { DEV_BUILD_FOLDER } from '../constants';

// Reference: https://github.com/microsoft/vscode-extension-samples/blob/main/tree-view-sample/src/nodeDependencies.ts
export default class FolderView implements vscode.TreeDataProvider<BuiltFile> {
  private _workspaceRoot: string;
  private _onDidChangeTreeData: vscode.EventEmitter<BuiltFile | undefined | void> = new vscode.EventEmitter<BuiltFile | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<BuiltFile | undefined | void> = this._onDidChangeTreeData.event;

  constructor(root: string) {
    this._workspaceRoot = root;
  }

  private _pathExists(p: string): boolean {
		try {
			fs.accessSync(p);
		} catch {
			return false;
		}

		return true;
	}
  private _getEntries(fullPathToFolder: string): BuiltFile[] {
    if (this._pathExists(fullPathToFolder) && this._workspaceRoot) {
      return fs.readdirSync(fullPathToFolder).map((file) => {
        const filePath = path.join(fullPathToFolder, file);
        const isDirectory = fs.statSync(filePath).isDirectory();
        return new BuiltFile(
          file,
          filePath,
          isDirectory ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None
        );
      });
    }

    return [];
  }

  refresh(): void {
		this._onDidChangeTreeData.fire();
	}

  getTreeItem(element: BuiltFile): vscode.TreeItem {
		return element;
	}

  getChildren(element?: BuiltFile): Thenable<BuiltFile[]> {
    if (!this._workspaceRoot) {
			vscode.window.showWarningMessage('Empty workspace');
			return Promise.resolve([]);
		}

    if (element) {
      return Promise.resolve(this._getEntries(element.fullPath));
    }

    const devBuildsFolder = path.join(this._workspaceRoot, DEV_BUILD_FOLDER);
    if (this._pathExists(devBuildsFolder)) {
      return Promise.resolve(this._getEntries(devBuildsFolder));
    }
    vscode.window.showInformationMessage('Workspace has no dev-builds folder');
    return Promise.resolve([]);
  }
}

export class BuiltFile extends vscode.TreeItem {
  constructor(
		public readonly label: string,
		public readonly fullPath: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly command?: vscode.Command
	) {
    super(label, collapsibleState);

    this.tooltip = this.fullPath;
  }

  // This is to ensure theme icon is applied correctly
  resourceUri = vscode.Uri.file(this.fullPath);

	contextValue = 'devBuildsFolder';
}

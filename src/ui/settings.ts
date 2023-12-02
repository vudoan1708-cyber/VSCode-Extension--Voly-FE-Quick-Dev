import * as vscode from 'vscode';
import KoaApp from '../server';

type ServerSetting = {
  id: string;
  label: string;
  value: any;
  formatting: RegExp | string;
  rawValue: any;
};

export default class SettingView implements vscode.TreeDataProvider<SettingItem> {
  private _extensionContext: vscode.ExtensionContext;
  private _server: KoaApp;
  private _allItems: ServerSetting[];
  private _onDidChangeTreeData: vscode.EventEmitter<SettingItem | undefined | void> = new vscode.EventEmitter<SettingItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<SettingItem | undefined | void> = this._onDidChangeTreeData.event;

  constructor(context: vscode.ExtensionContext, server: KoaApp) {
    this._extensionContext = context;
    this._server = server;
  }

  private _getSettingItems(): SettingItem[] {
    const serverListeningState = this._server.checkListeningState() || this._server.checkSecuredListeningState();
    const extensionActivationState = !!this._extensionContext.globalState.get('volyfequickdev_activated', true);
    this._allItems = [
      {
        id: 'serverStat',
        label: 'Server status',
        value: serverListeningState ? '✅' : '❌',
        rawValue: serverListeningState,
        formatting: '\t\t\t',
      },
      {
        id: 'protocolSwitch',
        label: 'Network Protocol',
        value: this._server.checkSecuredListeningState() ? 'HTTPS' : 'HTTP',
        rawValue: this._server.checkSecuredListeningState() ? 'https' : 'http',
        formatting: '\t\t',
      },
      {
        id: 'port',
        label: 'Active port',
        value: this._server.selectedPort,
        rawValue: this._server.selectedPort,
        formatting: '\t\t\t',
      },
      {
        id: 'extensionStat',
        label: 'Extension status',
        value: extensionActivationState ? '✅' : '❌',
        rawValue: extensionActivationState,
        formatting: '\t\t',
      },
    ];
    return this._allItems.map((i) => (
      new SettingItem(i.id, i.rawValue, `${i.label}:${i.formatting}${i.value}`, vscode.TreeItemCollapsibleState.None)
    ));
  }

  refresh(): void {
		this._onDidChangeTreeData.fire();
	}

  getTreeItem(element: SettingItem): vscode.TreeItem {
		return element;
	}

  getChildren(): Thenable<SettingItem[]> {
    return Promise.resolve(this._getSettingItems());
  }
}

export class SettingItem extends vscode.TreeItem {
  constructor(
		public readonly id: string,
		public readonly rawValue: any,
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
	) {
    super(label, collapsibleState);
    this.tooltip = '';

    if (id === 'extensionStat') {
      this.contextValue = `${this.id}.activation-status.${this.rawValue}`;
      return;
    }
    // Network protocol
    if (id === 'protocolSwitch') {
      this.contextValue = `${this.id}.${this.rawValue}`;
      return;
    }
    this.contextValue = this.id;
  }
}

import * as vscode from 'vscode';

export default class ShareLocalView implements vscode.TreeDataProvider<ExposedAddress> {
  private _address: string;
  private _tunneledFromPort: string | number;
  private _allAddresses: ExposedAddress[] = [];
  private _onDidChangeTreeData: vscode.EventEmitter<ExposedAddress | undefined | void> = new vscode.EventEmitter<ExposedAddress | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<ExposedAddress | undefined | void> = this._onDidChangeTreeData.event;

  constructor() {}

  private _getExposedAddresses(): ExposedAddress[] {
    if (!this._address) {
      return [];
    }
    this._allAddresses.push(new ExposedAddress(
      this._address,
      `Exposed URL: ${this._address} tunneled from ${this._tunneledFromPort}`,
      vscode.TreeItemCollapsibleState.None,
    ));
    return this._allAddresses;
  }

  public getAddress(addr: string) {
    return this._allAddresses.find((a) => a.address === addr);
  }

  public assignAddress(addr: string, port: string | number) {
    this._address = addr;
    this._tunneledFromPort = port;
  }

  public removeAddress(addr: string) {
    this._allAddresses = this._allAddresses.filter((a) => a.address !== addr);
    return addr;
  }

  refresh(): void {
		this._onDidChangeTreeData.fire();
	}

  getTreeItem(element: ExposedAddress): vscode.TreeItem {
		return element;
	}

  getChildren(): Thenable<ExposedAddress[]> {
    return Promise.resolve(this._getExposedAddresses());
  }
}

export class ExposedAddress extends vscode.TreeItem {
  constructor(
		public readonly address: string,
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
	) {
    super(label, collapsibleState);

    this.tooltip = 'This address is currently shared with the world';
  }

	contextValue = 'shareableLocal';
}

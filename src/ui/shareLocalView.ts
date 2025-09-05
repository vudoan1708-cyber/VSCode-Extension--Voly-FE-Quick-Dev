import * as vscode from 'vscode';

type AllAddressesType = { addr: string, port: string | number };

export default class ShareLocalView implements vscode.TreeDataProvider<ExposedAddress> {
  private _address: string;
  private _tunneledFromPort: string | number;
  private _allAddresses: AllAddressesType[] = [];
  private _onDidChangeTreeData: vscode.EventEmitter<ExposedAddress | undefined | void> = new vscode.EventEmitter<ExposedAddress | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<ExposedAddress | undefined | void> = this._onDidChangeTreeData.event;

  constructor() {}

  private _getExposedAddresses(): ExposedAddress[] {
    if (!this._address) {
      return [];
    }
    return this._allAddresses.map((item, idx) => new ExposedAddress(
      item.addr,
      `${idx + 1}. ${item.addr} tunneled from ${item.port}`,
      vscode.TreeItemCollapsibleState.None,
    ));
  }

  public getAddress(addr: string) {
    return this._allAddresses.find((item) => item.addr === addr);
  }

  public assignAddress(addr: string, port: string | number) {
    this._address = addr;
    this._tunneledFromPort = port;
    // Append to the factory array
    this._allAddresses.push({ addr: this._address, port: this._tunneledFromPort });
  }

  public removeAddress(addr: string) {
    this._allAddresses = this._allAddresses.filter((item) => item.addr !== addr);
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

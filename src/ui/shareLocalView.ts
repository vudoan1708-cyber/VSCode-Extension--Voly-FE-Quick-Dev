import * as vscode from 'vscode';

export default class ShareLocalView implements vscode.TreeDataProvider<ConnectedIndividual> {
  private _connectedSessionId: string;
  private _onDidChangeTreeData: vscode.EventEmitter<ConnectedIndividual | undefined | void> = new vscode.EventEmitter<ConnectedIndividual | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<ConnectedIndividual | undefined | void> = this._onDidChangeTreeData.event;

  constructor() {}

  private _getConnectedIndividual(): ConnectedIndividual[] {
    if (!this._connectedSessionId) {
      return [];
    }
    return [
      new ConnectedIndividual(
        this._connectedSessionId,
        `Connection session ID: ${this._connectedSessionId}`,
        vscode.TreeItemCollapsibleState.None,
      ),
    ];
  }

  public assignSessionId(sessionId: string) {
    this._connectedSessionId = sessionId;
  }

  public removeSessionId() {
    this._connectedSessionId = '';
  }

  refresh(): void {
		this._onDidChangeTreeData.fire();
	}

  getTreeItem(element: ConnectedIndividual): vscode.TreeItem {
		return element;
	}

  getChildren(): Thenable<ConnectedIndividual[]> {
    return Promise.resolve(this._getConnectedIndividual());
  }
}

export class ConnectedIndividual extends vscode.TreeItem {
  constructor(
		public readonly sessionId: string,
		public readonly label: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
	) {
    super(label, collapsibleState);

    this.tooltip = 'You have been connected with another individual with this session ID';
  }

	contextValue = 'shareableLocal';
}

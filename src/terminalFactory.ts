import * as vscode from 'vscode';

import Terminal from './terminal';

export default class TerminalFactory {
  private _activeTerminals: Array<{ instance: Terminal, id: string }> = [];

  constructor() {}

  public createTerminal(
    name: string,
    uniqueFileName: string,
    shellPath?: string,
    shellArgs?: string,
    location?: vscode.TerminalLocation
  ): Terminal | void {
    if (!uniqueFileName) {
      console.log('File name not defined. Possibly due to saving the same file name');
      return;
    }
    // Check for duplicate terminal name or id
    const found = this._activeTerminals.find((terminal: { instance: Terminal, id: string }) => (
      terminal.instance.name.includes(name) || terminal.id.includes(uniqueFileName)
    ));

    if (found) {
      console.log('Terminal containing certain file IDs has been activated');
      return;
    }

    let createdTerminal: Terminal;
    createdTerminal = new Terminal(name, shellPath, shellArgs, location);
    createdTerminal.show();
    this._activeTerminals.push({ instance: createdTerminal, id: uniqueFileName });

    return createdTerminal;
  }

  public async terminate(terminal: Terminal): Promise<vscode.TerminalExitStatus> {
    try {
      const exitStatus = await terminal.close();
      this._activeTerminals = this._activeTerminals.filter((t) => t.instance.name !== terminal.name);
      return exitStatus;
    } catch {
      return { code: undefined, reason: 0 };
    }
  }
}

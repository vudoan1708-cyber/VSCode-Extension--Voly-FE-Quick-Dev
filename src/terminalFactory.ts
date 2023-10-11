import * as vscode from 'vscode';

import Terminal from './terminal';

export default class TerminalFactory {
  private _activeTerminals: Array<{ instance: Terminal, id: string }> = [];

  constructor() {}

  public createTerminal(
    name: string,
    uniquePath: string,
    shellPath?: string,
    shellArgs?: string,
    location?: vscode.TerminalLocation
  ): Terminal | void {
    // Check for duplicate terminal name or id
    const found = this._activeTerminals.find((terminal: { instance: Terminal, id: string }) => (
      terminal.instance.name.includes(name) || terminal.id === uniquePath
    ));

    if (found) {
      console.log('Terminal of the same name has been activated');
      return;
    }

    let createdTerminal: Terminal;
    createdTerminal = new Terminal(name, shellPath, shellArgs, location);
    createdTerminal.show();
    this._activeTerminals.push({ instance: createdTerminal, id: uniquePath });

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

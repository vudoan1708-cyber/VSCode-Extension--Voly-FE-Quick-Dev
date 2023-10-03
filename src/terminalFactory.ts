import * as vscode from 'vscode';

import Terminal from './terminal';

export default class TerminalFactory {
  private _activeTerminals: Array<Terminal> = [];

  constructor() {}

  public createTerminal(
    name: string,
    shellPath?: string,
    shellArgs?: string,
    location?: vscode.TerminalLocation
  ): Terminal {
    // Check for duplicate terminal names
    const founds = this._activeTerminals.filter((terminal: Terminal) => terminal.name.includes(name));

    let createdTerminal: Terminal;
    if (founds.length > 0) {
      createdTerminal = new Terminal(`${name}-${founds.length + 1}`, shellPath, shellArgs, location);
    } else {
      createdTerminal = new Terminal(name, shellPath, shellArgs, location);
    }
    createdTerminal.show();
    this._activeTerminals.push(createdTerminal);

    return createdTerminal;
  }

  public async terminate(terminal: Terminal): Promise<vscode.TerminalExitStatus> {
    try {
      this._activeTerminals = this._activeTerminals.filter((t) => t.name !== terminal.name);
      return await terminal.close();
    } catch {
      return { code: undefined, reason: 0 };
    }
  }
}

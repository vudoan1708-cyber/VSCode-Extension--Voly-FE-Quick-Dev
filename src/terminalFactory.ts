import * as vscode from 'vscode';

import Terminal from './terminal';

type TerminalRecord = { instance: Terminal, id: string, uniquePathsPerInstance: string, savedTargetPath: string };

export default class TerminalFactory {
  private _activeTerminals: Array<TerminalRecord> = [];
  private _terminatedTerminals: { [key: TerminalRecord['uniquePathsPerInstance']]: boolean } = {};

  constructor() {}

  public findTerminatedPaths() {
    return this._terminatedTerminals;
  }

  public activePathsExist(absolute: string) {
    return !!this._activeTerminals.find((t) => t.uniquePathsPerInstance.includes(absolute));
  }

  public hashActiveIds() {
    const obj: { [key: string]: boolean } = {};
    for (let i = 0; i < this._activeTerminals.length; i += 1){
      const terminal = this._activeTerminals[i];
      obj[terminal.id] = !!terminal.id;
    }
    return obj;
  }

  public createTerminal(
    name: string,
    uniqueFileName: string,
    uniquePathsPerInstance: string,
    savedTargetPath: string,
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

    this._activeTerminals.push({
      instance: createdTerminal,
      id: uniqueFileName,
      uniquePathsPerInstance,
      savedTargetPath,
    });
    delete this._terminatedTerminals[uniquePathsPerInstance];

    return createdTerminal;
  }

  public async terminate(terminal: Terminal): Promise<vscode.TerminalExitStatus> {
    try {
      const exitStatus = await terminal.close();
      this._activeTerminals = this._activeTerminals.filter((t) => {
        if (t.instance.name === terminal.name) {
          this._terminatedTerminals[t.uniquePathsPerInstance] = true;
        }
        return t.instance.name !== terminal.name;
      });
      return exitStatus;
    } catch {
      return { code: undefined, reason: 0 };
    }
  }
}

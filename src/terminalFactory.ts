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

  public hasActiveForPath(savedTargetPath: string) {
    return !!this._activeTerminals.find((terminal) => terminal.savedTargetPath === savedTargetPath);
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
    canDevOnMultiTerminals: boolean,
    shellPath?: string,
    shellArgs?: string,
    location?: vscode.TerminalLocation
  ): Terminal | void {
    if (!uniqueFileName) {
      console.warn('File name not defined. Possibly due to saving the same file name');
      return;
    }
    // Backstop: dedup on the saved file's full path
    if (this._activeTerminals.find((terminal) => terminal.savedTargetPath === savedTargetPath)) {
      console.warn(`Terminal for ${savedTargetPath} has been activated`);
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

    if (!canDevOnMultiTerminals) {
      this.dispose(this._activeTerminals);
    }
    return createdTerminal;
  }

  public dispose(activeTerminals: TerminalRecord[]): void {
    if (activeTerminals?.length > 1) {
      activeTerminals[0].instance.dispose();
    }
  }

  public async willTerminate(terminal: Terminal): Promise<vscode.TerminalExitStatus> {
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

import * as vscode from 'vscode';

export default class Terminal {
  private _instance: vscode.Terminal;

  constructor(
    name: string,
    shellPath?: string,
    shellArgs?: string,
    location?: vscode.TerminalLocation
  ) {
    this._instance = vscode.window.createTerminal({
      name,
      shellPath,
      shellArgs,
      location: location ? location : vscode.TerminalLocation.Panel,
    });
  }

  public show() {
    this._instance.show();
  }

  public sendText(text: string) {
    this._instance.sendText(text);
  }

  public async close() {
    // Reference: https://stackoverflow.com/questions/55943439/how-to-wait-until-vscode-windows-terminal-operation-is-over
    this.sendText('exit');
    return new Promise((resolve, reject) => {
      const disposeToken = vscode.window.onDidCloseTerminal((closedTerminal) => {
        if (closedTerminal === this._instance) {
          disposeToken.dispose();
          // No forcible close
          if (this._instance.exitStatus !== undefined) {
            resolve(this._instance.exitStatus);
            return;
          }
          reject("Terminal exited with undefined status");
        }
      });
    });
  }
}

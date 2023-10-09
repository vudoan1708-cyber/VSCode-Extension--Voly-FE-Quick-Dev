import * as vscode from 'vscode';

import WebSocket from 'hyco-ws';

import fs from 'fs';
import path from 'path';

import { SendPayload } from '../types';

export default class RelayListener {
  private _wss: WebSocket.HybridConnectionWebSocketServer;
  public connected: boolean = false;

  constructor(
    relayNamespace: string,
    hybridConnectionName: string,
    ruleName: string,
    key: string,
    receivedSessionId: string,
    rootDirFromTheBackendSide: string,
  ) {
    const uri = WebSocket.createRelayListenUri(relayNamespace, hybridConnectionName);
    this._wss = WebSocket.createRelayedServer(
      {
        server: uri,
        token: () => WebSocket.createRelayToken(uri, ruleName, key),
        keepAliveTimeout: 5000,
      },
      (ws) => {
        vscode.window.showInformationMessage('[volyfequickdev] Connection accepted');
        if (!this.connected) {
          this.connected = true;
        }

        ws.onmessage = (event) => {
          console.log('event', event);

          const parsed: SendPayload & { sessionId: string } = JSON.parse(event.data as unknown as string);

          // Session ID matching exercise for sanity check
          if (receivedSessionId === parsed.sessionId) {
            if (parsed.data && parsed.reason === 'fileSend') {
              const pathToNewDevBuildsFolder = path.join(rootDirFromTheBackendSide, 'dev-builds');

              console.log('pathToNewDevBuildsFolder', pathToNewDevBuildsFolder);

              if (!fs.existsSync(pathToNewDevBuildsFolder)) {
                fs.mkdirSync(pathToNewDevBuildsFolder);
              }
              parsed.data.forEach((file: { fileName: string, bits: string }) => {
                fs.writeFileSync(path.join(pathToNewDevBuildsFolder, file.fileName), file.bits, 'base64');
              });
            }
            return;
          }
          vscode.window.showErrorMessage('[volyfequickdev] Please double check the sessionID');
        };
        ws.on('close', () => {
          this.connected = false;
          vscode.window.showErrorMessage('[volyfequickdev] Connection closed');
        });
      }
    );

    vscode.window.showInformationMessage('[volyfequickdev] WebSocket listener is ready. Waiting for connection...');

    this._wss.on('error', (err) => {
      console.error(`WebSocket error: ${err}`);
    });
  }
}

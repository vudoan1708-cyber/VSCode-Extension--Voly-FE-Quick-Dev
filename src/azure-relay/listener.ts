import * as vscode from 'vscode';

import WebSocket from 'hyco-ws';

import fs from 'fs';
import path from 'path';

import { SendPayload } from '../types';

export default class RelayListener {
  private _wss: WebSocket.HybridConnectionWebSocketServer;

  constructor(
    relayNamespace: string,
    hybridConnectionName: string,
    ruleName: string,
    key: string,
    receivedSessionId: string,
    rootDir: string,
  ) {
    const uri = WebSocket.createRelayListenUri(relayNamespace, hybridConnectionName);
    this._wss = WebSocket.createRelayedServer(
      {
        server: uri,
        token: () => WebSocket.createRelayToken(uri, ruleName, key),
        keepAliveTimeout: 5000,
      },
      (ws) => {
        console.log('connection accepted');
        ws.onmessage = (event) => {
          console.log('event', event);

          // Session ID matching exercise
          const parsed: SendPayload & { sessionId: string } = JSON.parse(event.data as unknown as string);
          if (receivedSessionId === parsed.sessionId) {
            if (parsed.data && parsed.reason === 'fileSend') {
              const pathToNewDevBuildsFolder = path.join(rootDir, 'dev-builds');
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
          vscode.window.showErrorMessage('Please double check the sessionID');
        };
        ws.on('close', () => {
          console.log('connection closed');
        });
      }
    );

    console.log('WebSocket listener is ready');

    this._wss.on('error', (err) => {
      console.error(`WebSocket error: ${err}`);
    });
  }
}

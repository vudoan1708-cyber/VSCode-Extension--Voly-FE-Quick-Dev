import * as vscode from 'vscode';

import * as TraditionalWebSocket from 'ws';
import WebSocket from 'hyco-ws';

import { SendPayload } from '../types';

type RedefinedRelayedConnect = (address: string, token: string, fn: (wss: TraditionalWebSocket) => void) => TraditionalWebSocket;

export default class RelaySender {
  private _sender: TraditionalWebSocket;
  private _sessionId: string;

  public connected: boolean;

  constructor(
    relayNamespace: string,
    hybridConnectionName: string,
    ruleName: string,
    key: string,
    sessionId: string
  ) {
    this._sessionId = sessionId;

    // Reference: https://github.com/Azure/azure-relay-node/blob/dev/hyco-ws/examples/simple/sender.js
    const uri = WebSocket.createRelaySendUri(relayNamespace, hybridConnectionName);
    this._sender = (WebSocket.relayedConnect as unknown as RedefinedRelayedConnect)(
      uri,
      WebSocket.createRelayToken(uri, ruleName, key),
      (wss) => {
        vscode.window.showInformationMessage('[volyfequickdev] Started client interval.');
        if (!this.connected) {
          this.connected = true;
        }

        wss.on('close', () => {
          this._sessionId = '';
          this.connected = false;
          vscode.window.showErrorMessage('[volyfequickdev] Stopping client interval');
          process.exit();
        });
      }
    );
    vscode.window.showInformationMessage('[volyfequickdev] WebSocker sender is ready');
  }

  public send(data: SendPayload, cb?: ((err?: Error | undefined) => void) | undefined): void {
    if (!this._sessionId) {
      return;
    }
    // Always include sessionId for sanity check
    this._sender.send(JSON.stringify({ ...data, sessionId: this._sessionId }), cb);
  }
}

import * as TraditionalWebSocket from 'ws';
import WebSocket from 'hyco-ws';

import { SendPayload } from '../types';

type RedefinedRelayedConnect = (address: string, token: string, fn: (wss: TraditionalWebSocket) => void) => TraditionalWebSocket;

export default class RelaySender {
  private _sender: TraditionalWebSocket;
  private _sessionId: string;

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
        console.log('Started client interval.');

        wss.on('close', () => {
          console.log('stopping client interval');
          this._sessionId = '';
          process.exit();
        });
      }
    );
    console.log('WebSocker sender is ready');
  }

  public send(data: SendPayload, cb?: ((err?: Error | undefined) => void) | undefined): void {
    if (!this._sessionId) {
      return;
    }
    // Always include sessionId for sanity check
    this._sender.send(JSON.stringify({ ...data, sessionId: this._sessionId }), cb);
  }
}

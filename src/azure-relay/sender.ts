import * as TraditionalWebSocket from 'ws';
import WebSocket, { relayedConnect } from 'hyco-ws';

import { BufferLike } from '../types';

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

    const uri = WebSocket.createRelaySendUri(relayNamespace, hybridConnectionName);
    this._sender = (WebSocket.relayedConnect as unknown as RedefinedRelayedConnect)(
      uri,
      WebSocket.createRelayToken(uri, ruleName, key),
      (wss) => {
        console.log('Started client interval.');

        this.send(JSON.stringify({ sessionId: this._sessionId }), (err) => {
          console.error('Session initiation error:', err);
        });
        wss.on('close', () => {
          console.log('stopping client interval');
          this._sessionId = '';
          process.exit();
        });
      }
    );
    console.log('WebSocker sender is ready');
  }

  public send(data: BufferLike, cb?: ((err?: Error | undefined) => void) | undefined): void {
    this._sender.send(data, cb);
  }
}

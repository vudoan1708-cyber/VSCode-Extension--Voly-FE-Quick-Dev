import * as TraditionalWebSocket from 'ws';
import WebSocket, { relayedConnect } from 'hyco-ws';

import { BufferLike } from '../types';

type UpdatedRelayedConnect = (address: string, token: string, fn: (wss: TraditionalWebSocket) => void) => TraditionalWebSocket;

export default class RelaySender {
  private _sender: TraditionalWebSocket;

  constructor(relayNamespace: string, hybridConnectionName: string, ruleName: string, key: string) {
    const uri = WebSocket.createRelaySendUri(relayNamespace, hybridConnectionName);
    this._sender = (WebSocket.relayedConnect as unknown as UpdatedRelayedConnect)(
      uri,
      WebSocket.createRelayToken(uri, ruleName, key),
      (wss) => {
        console.log('Started client interval.');
        wss.on('close', () => {
          console.log('stopping client interval');
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

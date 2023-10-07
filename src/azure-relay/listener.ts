import WebSocket from 'hyco-ws';

export default class RelayListener {
  private _wss: WebSocket.HybridConnectionWebSocketServer;
  private _receivedSessionId: string;

  constructor(relayNamespace: string, hybridConnectionName: string, ruleName: string, key: string) {
    const uri = WebSocket.createRelayListenUri(relayNamespace, hybridConnectionName);
    this._wss = WebSocket.createRelayedServer(
      {
        server: uri,
        token: () => WebSocket.createRelayToken(uri, ruleName, key),
      },
      (ws) => {
        console.log('connection accepted');
        ws.onmessage = (event) => {
          console.log('event', event);

          try {
            // Session initiation
            if (!this._receivedSessionId) {
              const parsed = JSON.parse(event.data as unknown as string);
              this._receivedSessionId = parsed.sessionId;
              console.log('parsed', parsed);
              return;
            }
            throw 'Err';
          } catch (err) {
            // Files sent
            console.error(err);
            console.log('Must be from the throw statement above or it is to send file');
          }
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

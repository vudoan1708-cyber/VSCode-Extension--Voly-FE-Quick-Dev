import WebSocket from 'hyco-ws';

export default class RelayListener {
  private _wss: WebSocket.HybridConnectionWebSocketServer;

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

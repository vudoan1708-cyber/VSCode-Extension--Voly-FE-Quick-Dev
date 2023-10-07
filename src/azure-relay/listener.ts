import WebSocket from 'hyco-ws';

export default class RelayListener {
  private _wss: WebSocket.HybridConnectionWebSocketServer;
  private _handShakeSuccessful: boolean;

  constructor(
    relayNamespace: string,
    hybridConnectionName: string,
    ruleName: string,
    key: string,
    receivedSessionId: string,
  ) {
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
            const parsed = JSON.parse(event.data as unknown as string);
            console.log('parsed', parsed);
            if (receivedSessionId === parsed.sessionId) {
              this._handShakeSuccessful = true;
            }
          } catch (err) {
            // Files sent
            if (this._handShakeSuccessful) {
              // Do things here
            }
            console.error(err);
            console.log('Must be from the throw statement above or it is to send file');
          }
        };
        ws.on('close', () => {
          console.log('connection closed');
          this._handShakeSuccessful = false;
        });
      }
    );

    console.log('WebSocket listener is ready');

    this._wss.on('error', (err) => {
      console.error(`WebSocket error: ${err}`);
    });
  }
}

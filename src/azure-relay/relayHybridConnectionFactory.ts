import RelayListener from './listener';
import RelaySender from './sender';

// Type
import { SendPayload } from '../types';

/**
 * @deprecated Azure relay is longer in use, please use Ngrok instead
*/
export default class RelayHybridConnectionFactory {
  private _listener: RelayListener;
  private _sender: RelaySender;

  constructor() {}

  public createInstance(
    which: 'frontend' | 'backend',
    sessionId: string,
    rootDirectoryFromTheBackendSide: string
  ): void {
    const products = {
      frontend: (_sessionId_: string) => {
        this._sender = new RelaySender(
          process.env.AZURE_RELAY_NAMESPACE as string,
          process.env.AZURE_RELAY_HYBRID_CONNECTION_NAME as string,
          process.env.AZURE_RELAY_SAS_PRIMARY_CONNECTION_STRING as string,
          process.env.AZURE_RELAY_SAS_PRIMARY_KEY as string,
          _sessionId_,
        );
        return this._sender;
      },
      backend: (_sessionId_: string, rootDirectory: string) => {
        this._listener = new RelayListener(
          process.env.AZURE_RELAY_NAMESPACE as string,
          process.env.AZURE_RELAY_HYBRID_CONNECTION_NAME as string,
          process.env.AZURE_RELAY_SAS_PRIMARY_CONNECTION_STRING as string,
          process.env.AZURE_RELAY_SAS_PRIMARY_KEY as string,
          _sessionId_,
          rootDirectory,
        );
        return this._listener;
      },
    };
    products[which](sessionId, rootDirectoryFromTheBackendSide);
  }

  public hasEstablishedConnection() {
    return this._listener?.connected || this._sender?.connected;
  }

  public resetConnection() {
    if (this._listener) {
      this._listener.connected = false;
      this._listener.close();
    }
    if (this._sender) {
      this._sender.connected = false;
      this._sender.close();
    }
  }

  public send(data: SendPayload, cb?: ((err?: Error | undefined) => void) | undefined): { status: string } | void {
    if (!this._sender) {
      return { status: 'Sender not available at the moment. Please wait and try again' };
    }
    this._sender.send(data, cb);
  }
}

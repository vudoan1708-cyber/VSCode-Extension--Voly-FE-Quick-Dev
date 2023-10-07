import 'dotenv/config';

import RelayListener from './listener';
import RelaySender from './sender';

// Type
import { BufferLike } from '../types';

export default class RelayHybridConnectionFactory {
  private _listener: RelayListener;
  private _sender: RelaySender;

  constructor() {}

  public createInstance(which: 'frontend' | 'backend', sessionId: string): void {
    const products = {
      frontend: (sessionId: string) => {
        this._sender = new RelaySender(
          process.env.AZURE_RELAY_NAMESPACE as string,
          process.env.AZURE_RELAY_HYBRID_CONNECTION_NAME as string,
          process.env.AZURE_RELAY_SAS_PRIMARY_CONNECTION_STRING as string,
          process.env.AZURE_RELAY_SAS_PRIMARY_KEY as string,
          sessionId,
        );
        return this._sender;
      },
      backend: () => {
        this._listener = new RelayListener(
          process.env.AZURE_RELAY_NAMESPACE as string,
          process.env.AZURE_RELAY_HYBRID_CONNECTION_NAME as string,
          process.env.AZURE_RELAY_SAS_PRIMARY_CONNECTION_STRING as string,
          process.env.AZURE_RELAY_SAS_PRIMARY_KEY as string,
        );
        return this._listener;
      },
    };
    products[which](sessionId);
  }

  public send(data: BufferLike, cb?: ((err?: Error | undefined) => void) | undefined): { status: string } | void {
    if (!this._sender) {
      return { status: 'Sender not available at the moment. Please wait and try again' };
    }
    this._sender.send(data, cb);
  }
}

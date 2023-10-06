import 'dotenv/config';

import RelayListener from './listener';
import RelaySender from './sender';

// Type
import { BufferLike } from '../types';

export default class RelayHybridConnectionFactory {
  private _listener: RelayListener;
  private _sender: RelaySender;

  constructor() {}

  public createInstance(which: 'frontend' | 'backend'): void {
    const products = {
      frontend: () => {
        this._sender = new RelaySender(
          process.env.AZURE_RELAY_NAMESPACE as string,
          process.env.AZURE_RELAY_HYBRID_CONNECTION_NAME as string,
          process.env.AZURE_RELAY_SAS_PRIMARY_CONNECTION_STRING as string,
          process.env.AZURE_RELAY_SAS_PRIMARY_KEY as string,
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
    products[which]();
  }

  public send(data: BufferLike, cb?: ((err?: Error | undefined) => void) | undefined): void {
    if (!this._sender) {
      return;
    }
    this._sender.send(data, cb);
  }
}

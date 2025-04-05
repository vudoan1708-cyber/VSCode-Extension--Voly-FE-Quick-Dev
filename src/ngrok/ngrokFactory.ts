import ngrok from '@ngrok/ngrok';

export default class NgrokFactory {
  private _listeners: Array<ngrok.Listener> = [];

  constructor() {}

  async forwardWithAddr(addr: number | string) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const listener = await ngrok.forward({ authtoken_from_env: true, addr });
    // add to the factory
    this._listeners.push(listener);
    // return ngrok url
    return listener.url();
  }

  async disconnect(url: string | null) {
    await ngrok.disconnect(url);
    this._listeners = this._listeners.filter((l) => l.url() !== url);
  }
  
  async disconnectAll() {
    await ngrok.disconnect();
    this._listeners = [];
  }
}

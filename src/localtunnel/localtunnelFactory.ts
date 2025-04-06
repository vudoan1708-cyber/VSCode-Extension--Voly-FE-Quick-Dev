import localtunnel from 'localtunnel';

export default class LocalTunnelFactory {
  private _tunnels: Array<localtunnel.Tunnel> = [];
  private _currentTunnel: localtunnel.Tunnel;

  constructor() {}

  async forwardWithPort(port: number) {
    this._currentTunnel = await localtunnel({ port });
    // add to the factory
    this._tunnels.push(this._currentTunnel);
    // return tunnel url
    return this._currentTunnel.url;
  }

  disconnect(url: string | null) {
    this._currentTunnel.close();
    this._tunnels = this._tunnels.filter((t) => t.url !== url);
  }
}

import localtunnel from 'localtunnel';

export default class LocalTunnel {
  private _currentTunnel: localtunnel.Tunnel;

  public url: string;

  constructor() {}

  public async forwardWithPort(port: number) {
    this._currentTunnel = await localtunnel({ port });
    this.url = this._currentTunnel.url;
    // return tunnel url
    return this.url;
  }

  public close() {
    this._currentTunnel.close();
  }
}

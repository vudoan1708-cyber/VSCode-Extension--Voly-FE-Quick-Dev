import LocalTunnel from './localTunnel';
import ServeoTunnel from './serveoTunnel';

export default class TunnelFactory {
  private _tunnelingMethod: 'localtunnel' | 'serveo';
  private _tunnels: Array<LocalTunnel | ServeoTunnel> = [];

  constructor() {}

  async forward({ port, method = 'serveo' }: { port: number, method: 'localtunnel' | 'serveo' }): Promise<string> {
    // Assign selected tunneling method
    this._tunnelingMethod = method;

    let currentTunnel: LocalTunnel | ServeoTunnel;

    if (this._tunnelingMethod === 'localtunnel') {
      currentTunnel = new LocalTunnel();
      // forward it to a designated port
      const url = await currentTunnel.forwardWithPort(port);
      // add to the factory
      this._tunnels.push(currentTunnel);
      // return tunnel url
      return url;
    }
    if (this._tunnelingMethod === 'serveo') {
      currentTunnel = new ServeoTunnel();
      try {
        const url = await currentTunnel.startSSHReverseTunnel(port);
        // add to the factory
        this._tunnels.push(currentTunnel);
        // return tunnel url
        return url;
      } catch (e) {
        console.error(`Failed to initiate Serveo Tunnel. Fallback to LocalTunnel...`);
        return this.forward({ port, method: 'localtunnel' });
      }
    }
    return 'Tunneling method not found.';
  }

  disconnect(url: string | null) {
    if (this._tunnelingMethod === 'localtunnel') {
      (this._tunnels.find((t) => t.url === url) as LocalTunnel).close();
    }
    if (this._tunnelingMethod === 'serveo') {
      (this._tunnels.find((t) => t.url === url) as ServeoTunnel).stopSSHReverseTunnel();
    }
    this._tunnels = this._tunnels.filter((t) => t.url !== url);
  }
}

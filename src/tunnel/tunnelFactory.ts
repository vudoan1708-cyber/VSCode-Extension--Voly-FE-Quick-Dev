import LocalTunnel from './localTunnel';
import ServeoTunnel from './serveoTunnel';

export default class TunnelFactory {
  private _tunnels: {
    [x: LocalTunnel['url'] | ServeoTunnel['url']]: {
      tunnelInstance: LocalTunnel | ServeoTunnel,
      tunnellingMethod: 'localtunnel' | 'serveo',
    }
  } = {};

  constructor() {}

  async forward({ port, method = 'serveo' }: { port: number, method: 'localtunnel' | 'serveo' }): Promise<string> {
    let currentTunnel: LocalTunnel | ServeoTunnel;

    if (method === 'localtunnel') {
      currentTunnel = new LocalTunnel();
      // forward it to a designated port
      const url = await currentTunnel.forwardWithPort(port);
      // add to the factory
      this._tunnels[url] = {
        tunnelInstance: currentTunnel,
        tunnellingMethod: method,
      };
      // return tunnel url
      return url;
    }
    if (method === 'serveo') {
      currentTunnel = new ServeoTunnel();
      try {
        const url = await currentTunnel.startSSHReverseTunnel(port);
        // add to the factory
        this._tunnels[url] = {
          tunnelInstance: currentTunnel,
          tunnellingMethod: method,
        };
        // return tunnel url
        return url;
      } catch (e) {
        console.error(`Failed to initiate Serveo Tunnel. ${e}`);
        console.info('Fallback to LocalTunnel...');
        return this.forward({ port, method: 'localtunnel' });
      }
    }
    return 'Tunneling method not found.';
  }

  disconnect(url: string) {
    const { [url]: _tunnel, ...rest } = this._tunnels;
    if (_tunnel.tunnellingMethod === 'localtunnel') {
      (_tunnel.tunnelInstance as LocalTunnel).close();
    }
    if (_tunnel.tunnellingMethod === 'serveo') {
      (_tunnel.tunnelInstance as ServeoTunnel).stopSSHReverseTunnel();
    }
    this._tunnels = { ...rest };
  }
}

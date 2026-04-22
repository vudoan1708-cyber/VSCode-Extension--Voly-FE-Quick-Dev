import { ServerResponse } from 'http';

export default class SSE {
  public clients = new Set<ServerResponse>();

  constructor() {}

  addClient(response: ServerResponse) {
    this.clients.add(response);

    response.on('close', () => {
      this.clients.delete(response);
    });
  }

  sendEvent(eventName: string, data: any) {
    const message =
    `event: ${eventName}\n` +
    `data: ${JSON.stringify(data)}\n\n`;

    for (const res of this.clients) {
      res.write(message);
    }
  }
}

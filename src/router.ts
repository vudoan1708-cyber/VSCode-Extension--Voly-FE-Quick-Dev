import { Application, Request, Response } from 'express';

export class Router {
  private _expressApp: Application;

  constructor(app: Application) {
    this._expressApp = app;
  }

  public initialise() {
    this._expressApp.get('/', (req: Request, res: Response) => {
      res.json({
        message: 'Hello World!!!',
      });
    });
  }
}

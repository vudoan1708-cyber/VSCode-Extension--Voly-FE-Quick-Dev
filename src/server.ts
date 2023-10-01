import express, { Application, Request, Response } from 'express';
import cors from 'cors';

import http from 'http';
import path from 'path';

// Constant
import { DEV_BUILD_JSON } from './constants';

export default class ExpressApp {
  private _instance: Application;
  private _serverApp: http.Server<any>;
	private _serverPort: number = 8090;
  private _whitelist = [ 'https://test2.voly.co.uk', 'localhost' ];
  private _corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      if (this._whitelist.indexOf(origin || '') > -1 || !origin) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
  };
  

  constructor() {
    this._instance = express();
    this._instance.use(express.json());
    this._instance.use(express.urlencoded({ extended: true }));
    this._instance.use(cors(this._corsOptions));

    this._serverApp = http.createServer(this._instance);
		this._serverApp.listen(this._serverPort, () => {
			console.log(`Server is running on port ${this._serverPort}`);
		});
  }

  public initialiseRoutes() {
    this._instance.get('/', (req: Request, res: Response) => {
      res.json({
        message: 'Hello World from volyfequickdev',
      });
    });
    this._instance.get('/dev-builds', (req: Request, res: Response) => {
      try {
        res.sendFile(path.join(__dirname, '..', DEV_BUILD_JSON));
      } catch (ex) {
        res.json(ex);
      }
    });
  }
}
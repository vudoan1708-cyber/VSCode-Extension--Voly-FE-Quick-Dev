import * as vscode from 'vscode';

import express, { Application, Request, Response } from 'express';
import cors from 'cors';

import http from 'http';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

// Classes
import RelayHybridConnectionFactory from './azure-relay/relayHybridConnectionFactory';

// Constant
import { DEV_BUILD_FOLDER, SENDERS } from './constants';

export default class ExpressApp {
  private _instance: Application;
  private _serverApp: http.Server<any>;
	private _serverPort: number = 8090;
  private _whitelist = [ 'https://test2.voly.co.uk', 'http://localhost' ];
  private _corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      if (this._whitelist.indexOf(origin || '') > -1 || !origin) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
  };

  public hybridConnector: RelayHybridConnectionFactory;

  constructor() {
    this._instance = express();
    this._instance.use(express.json());
    this._instance.use(express.urlencoded({ extended: true }));
    this._instance.use((_, res, next) => {
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
      next();
    });
    this._instance.use(cors(this._corsOptions));

    this._serverApp = http.createServer(this._instance);
		this._serverApp.listen(this._serverPort, () => {
			console.log(`Server is running on port ${this._serverPort}`);
		});
    // TODO: Add an error handler to the port service in case of port clashes

    // Azure relay hybrid connection
    this.hybridConnector = new RelayHybridConnectionFactory();

    const devEmail = execSync('git config user.email', { encoding: 'utf-8' }).trim();
    this.hybridConnector.createInstance(
      SENDERS.find((sender) => sender === devEmail) ? 'frontend' : 'backend'
    );
  }

  public serveStatic() {
    this._instance.use('/dev-builds', express.static(path.join(__dirname, '..', DEV_BUILD_FOLDER)));
  }

  public initialiseRoutes() {
    this._instance.get('/', (req: Request, res: Response) => {
      res.json({
        message: 'Hello World from volyfequickdev',
      });
    });
    this._instance.get('/dev-builds', (req: Request, res: Response) => {
      try {
        const dir = fs.readdirSync(path.join(__dirname, '..', DEV_BUILD_FOLDER));

        if (dir.length > 0) {
          res.json(dir.filter((file) => path.extname(file) !== '.map'));
          return;
        }
        res.json([]);
      } catch (ex) {
        console.error(ex);
        res.json([]);
      }
    });
  }
}

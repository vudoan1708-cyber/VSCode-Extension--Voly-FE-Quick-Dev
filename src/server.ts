import * as vscode from 'vscode';

import Koa, { Request } from 'koa';
import Router from 'koa-router';

import json from 'koa-json';
import cors from 'koa-cors';
import serve from 'koa-static';
import mount from 'koa-mount';

import { getPort, setBasePort, setHighestPort } from 'portfinder';

import http from 'http';
import path from 'path';
import fs from 'fs';

// Constant
import { DEV_BUILD_FOLDER } from './constants';

export default class KoaApp {
  private _instance: Koa;
  private _router: Router;
  private _serverApp: http.Server<any>;
	private _serverPortOptions: number[] = [ 8090, 9000 ];
  private _whitelist = [ 'https://test2.voly.co.uk', 'http://localhost', 'voly.docker' ];
  private _corsOptions: cors.Options = {
    origin: (request: Request) => {
      if (this._whitelist.indexOf(request.headers.origin || '') > -1 || !request.headers.origin) {
        return request.headers.origin || '';
      }
      return '';
    },
    methods: 'GET',
    credentials: true,
  };

  public selectedPort: number;

  constructor(requestedPort?: number) {
    this._instance = new Koa();
    this._router = new Router();

    this._instance.use(json());
    this._instance.use(cors(this._corsOptions));
    this._instance.use(this._router.routes());

    // Set portfinder in case of user opening multiple instances of VSCode
    setBasePort(requestedPort || this._serverPortOptions[0]);
    setHighestPort(this._serverPortOptions[1]);

    this._serverApp = http.createServer(this._instance.callback());
    getPort((err, port) => {
      if (err) {
        vscode.window.showErrorMessage(`[volyfequickdev] ${err.message}`);
        process.exit();
      }
      this.startServer(port);
    });
  }

  public checkListeningState() {
    return this._serverApp.listening;
  }

  public startServer(port: number) {
    this.selectedPort = port || this.selectedPort;
    this._serverApp.listen(this.selectedPort, async () => {
      await vscode.commands.executeCommand('setContext', 'volyfequickdev-settings.serverIsOn', true);
      vscode.window.showInformationMessage(`[volyfequickdev] Server is running on port ${port}`);
    });
  }

  public closeServer() {
    if (!this.checkListeningState()) {
      console.warn('Server is no longer listening');
      return;
    }
    this._serverApp.close(async (err) => {
      if (err) {
        vscode.window.showErrorMessage(`[volyfequickdev] ${err.message}`);
        process.exit();
      }
      await vscode.commands.executeCommand('setContext', 'volyfequickdev-settings.serverIsOn', false);
    });
  }

  public serveStatic() {
    this._instance.use(mount('/dev-builds', serve(path.join(__dirname, '..', DEV_BUILD_FOLDER))));
  }

  public initialiseRoutes() {
    this._router.get('/', (context: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>, next: Koa.Next) => {
      context.body = {
        message: 'Hello World from volyfequickdev',
      };
      next();
    });
    this._router.get('/dev-builds', (context: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>, next: Koa.Next) => {
      try {
        const dir = fs.readdirSync(path.join(__dirname, '..', DEV_BUILD_FOLDER));

        if (dir.length > 0) {
          context.body = dir.filter((file) => path.extname(file) !== '.map');
          return;
        }
        context.body = [];
      } catch (ex) {
        console.error(ex);
        context.body = [];
      }
      next();
    });
  }
}

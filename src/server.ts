import * as vscode from 'vscode';

import ip from 'ip';

import Koa, { Request } from 'koa';
import Router from 'koa-router';

import json from 'koa-json';
import cors from 'koa-cors';
import serve from 'koa-static';
import mount from 'koa-mount';

import { getPort, setBasePort, setHighestPort } from 'portfinder';

// Reference to create ssl certificates for https: https://stackoverflow.com/questions/10175812/how-to-generate-a-self-signed-ssl-certificate-using-openssl
import https from 'https';
import http from 'http';
import path from 'path';
import fs from 'fs';

// Constant
import { DEV_BUILD_FOLDER } from './constants';

export default class KoaApp {
  private _instance: Koa;
  private _router: Router;
  private _serverApp: http.Server<any>;
  private _securedServerApp: https.Server<any>;
	private _serverPortOptions: number[] = [ 8090, 9999 ];
  private _whitelist = [ 'https://test2.voly.co.uk', 'http://localhost', 'http://voly.docker' ];
  private _corsOptions: cors.Options = {
    origin: (request: Request) => {
      if (this._whitelist.indexOf(request.headers.origin || '') > -1 || !request.headers.origin) {
        return request.headers.origin || '';
      }
      return '';
    },
    credentials: true,
  };

  public selectedPort: number;

  constructor(rootDirectory: string) {
    this._instance = new Koa();
    this._router = new Router();

    this._instance.use(json());
    this._instance.use(cors(this._corsOptions));
    this._instance.use(this._router.routes());

    // Set portfinder in case of user opening multiple instances of VSCode
    setBasePort(this._serverPortOptions[0]);
    setHighestPort(this._serverPortOptions[1]);

    this._serverApp = http.createServer(this._instance.callback());
    try {
      this._securedServerApp = https.createServer({
        key: fs.readFileSync(path.join(rootDirectory, 'ssl-certs', 'key.pem'), 'utf8').toString(),
        cert: fs.readFileSync(path.join(rootDirectory, 'ssl-certs', 'cert.pem'), 'utf8').toString(),
      }, this._instance.callback());
    } catch (err) {
      vscode.window.showErrorMessage(`[volyfequickdev] ${err}. Cannot create the secured server. Possibly due to invalid / not-found key.pem and cert.pem certificate files`);
    }

    getPort((err, port) => {
      if (err) {
        vscode.window.showErrorMessage(`[volyfequickdev] ${err.message}`);
        process.exit();
      }
      this.startServer(port);
    });
  }

  // non-secure server
  public checkListeningState() {
    return this._serverApp?.listening;
  }

  public startServer(port: number) {
    // Stop the operation if server is already listening on a port
    if (this.checkListeningState()) {
      console.warn('Local server is currently already listening');
      return;
    }
    // Check if the secured server is listening and then close it
    this.closeSecuredServer();
    this.selectedPort = port || this.selectedPort;
    this._serverApp?.listen(this.selectedPort, async () => {
      await vscode.commands.executeCommand('setContext', 'volyfequickdev-settings.serverIsOn', true);
      vscode.window.showInformationMessage(`[volyfequickdev] Server is running on http://localhost:${port}`);
    }) || vscode.window.showErrorMessage('[volyfequickdev] It seems that the local server was failed to be instantiated. Cannot start it as a result');
  }

  public closeServer(): boolean {
    if (!this.checkListeningState()) {
      console.warn('Server is no longer listening');
      return false;
    }
    this._serverApp.close(async (err) => {
      if (err) {
        vscode.window.showErrorMessage(`[volyfequickdev] ${err.message}`);
        process.exit();
      }
      await vscode.commands.executeCommand('setContext', 'volyfequickdev-settings.serverIsOn', false);
    });
    return true;
  }

  // secure server
  public checkSecuredListeningState() {
    return this._securedServerApp?.listening;
  }

  public startSecuredServer(port: number) {
    // Stop the operation if server is already listening on a port
    if (this.checkSecuredListeningState()) {
      console.warn('Secured server is currently already listening');
      return;
    }
    // Check if the localhost server is listening and then close it
    this.closeServer();
    this.selectedPort = port || this.selectedPort;
    this._securedServerApp?.listen(this.selectedPort, async () => {
      await vscode.commands.executeCommand('setContext', 'volyfequickdev-settings.serverIsOn', true);
      vscode.window.showInformationMessage(`[volyfequickdev] Server is running on https://${ip.address()}:${port}`);
    }) || vscode.window.showErrorMessage('[volyfequickdev] It seems that the secured server was failed to be instantiated. Cannot start it as a result');
  }

  public closeSecuredServer(): boolean {
    if (!this.checkSecuredListeningState()) {
      console.warn('Secured server is no longer listening');
      return false;
    }
    this._securedServerApp.close(async (err) => {
      if (err) {
        vscode.window.showErrorMessage(`[volyfequickdev] ${err.message}`);
        process.exit();
      }
      await vscode.commands.executeCommand('setContext', 'volyfequickdev-settings.serverIsOn', false);
    });
    return true;
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

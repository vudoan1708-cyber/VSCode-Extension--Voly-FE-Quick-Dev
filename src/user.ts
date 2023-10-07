import { execSync } from 'child_process';
import { SENDERS } from './constants';

import path from 'path';

export default class User {
  private static _name = execSync('git config user.name', { encoding: 'utf-8' }).trim();
  private static _email = execSync('git config user.email', { encoding: 'utf-8' }).trim();
  // private static _role: 'frontend' | 'backend' = SENDERS.find((sender) => sender === User._email) ? 'frontend' : 'backend';
  // TODO: test - needs removing before commiting to git
  private static _role: 'frontend' | 'backend' = path.basename(process.cwd()).indexOf('ui') > -1 ? 'frontend' : 'backend';

  constructor() {
    console.log('path.basename(process.cwd())', path.basename(process.cwd()));
    console.log('process.cwd()', process.cwd());
    console.log('role', User._role);
  }

  public get name() {
    return User._name;
  }
  public get email() {
    return User._email;
  }
  public get role() {
    return User._role;
  }
}

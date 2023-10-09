import { execSync } from 'child_process';
import { SENDERS } from './constants';

export default class User {
  private static _name = execSync('git config user.name', { encoding: 'utf-8' }).trim();
  private static _email = execSync('git config user.email', { encoding: 'utf-8' }).trim();
  private static _role: 'frontend' | 'backend' = SENDERS.find((sender) => sender === User._email) ? 'frontend' : 'backend';
  private static connectedStatus: boolean;

  constructor() {}

  public get name() {
    return User._name;
  }
  public get email() {
    return User._email;
  }
  public get role() {
    return User._role;
  }
  public get connectedStatus() {
    return User.connectedStatus;
  }
}

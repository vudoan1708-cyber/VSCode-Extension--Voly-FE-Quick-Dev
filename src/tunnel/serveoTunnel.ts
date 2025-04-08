import { spawn, exec, ChildProcessWithoutNullStreams } from 'child_process';
import { platform } from 'os';

export default class ServeoTunnel {
  private _tunnelProcess: ChildProcessWithoutNullStreams;

  public url: string;

  constructor() {}

  private async _checkSSHInstallation(): Promise<string> {
    try {
      // Use 'which ssh' (Unix/Linux/macOS) or 'where ssh' (Windows)
      const command = platform() === 'win32' ? 'where' : 'which';
  
      return new Promise<string>((resolve, reject) => {
        exec(`${command} ssh`, (error, stdout, stderr) => {
          if (error || stderr) {
            reject('SSH is not installed on this system.');
          } else {
            resolve(stdout.trim());  // Return the path of the SSH executable
          }
        });
      });
    } catch (err: any) {
      throw new Error(`Error checking SSH installation: ${err.message}`);
    }
  }

  // Function to extract the Serveo URL after the "Forwarding HTTP traffic from" text
  private _extractServeoURL(data: string): string | null {
    const match = data.match(/Forwarding HTTP traffic from (https?:\/\/[a-zA-Z0-9-]+\.serveo\.net)/);
    
    if (match && match[1]) {
      return match[1];  // Return the URL after "Forwarding HTTP traffic from"
    }

    return null;  // Return null if the URL is not found
  };

  public async startSSHReverseTunnel(port: number): Promise<string> {
    // Check if SSH is installed before proceeding
    await this._checkSSHInstallation();

    return new Promise((resolve, reject) => {
      try {
    
        const command = 'ssh';
        const args: string[] = [ '-o', 'LogLevel=ERROR', '-R', `80:localhost:${port}`, 'serveo.net' ];

        this._tunnelProcess = spawn(command, args);

        /* This is so that everytime Node emits a 'data' event,
          chunks of response will be stringed together to form the final output, as sometimes,
          SSH takes time to respond, or Serveo hasn't sent the output yet...,
          which leads to the Promise getting hanged forever
        */
        let buffer = '';
    
        this._tunnelProcess.stdout.on('data', (data: Buffer) => {
          const output = data.toString();
          console.log(`stdout: ${output}`);

          // This is to string the response from the 'data' event
          buffer += output;
    
          // Try to extract the forwarding URL
          const extractedUrl = this._extractServeoURL(buffer) as string;
          if (extractedUrl) {
            this.url = extractedUrl;
            resolve(this.url); // return the URL when found
          }
        });
    
        this._tunnelProcess.stderr.on('data', (data: Buffer) => {
          console.error(`stderr: ${data.toString()}`);
        });
    
        this._tunnelProcess.on('error', (err) => {
          reject(err);
        });
    
        this._tunnelProcess.on('close', (code) => {
          console.log(`Tunnel closed with code ${code}`);
          if (!this.url) {
            reject(new Error(`Tunnel closed before URL was obtained. Exit code: ${code}`));
          }
        });
      } catch (err: any) {
        console.error('Error while starting SSH tunnel:', err.message);
        if (err instanceof Error) {  // Check if it's an instance of `Error`
          if (err.message === 'SSH is not installed on this system.') {
            console.error('Please install SSH to use this feature.');
            if (platform() === 'win32') {
              console.error('Install SSH by following these instructions: https://docs.microsoft.com/en-us/windows-server/administration/openssh/openssh_install_firstuse');
            } else if (platform() === 'darwin') {
              console.error('Install SSH using Homebrew: brew install openssh');
            } else if (platform() === 'linux') {
              console.error('Install SSH with: sudo apt install openssh-client');
            }
          }
        } else {
          // Handle non-error cases
          console.error('An unknown error occurred:', err);
        }
      }
    });
  }  

  public stopSSHReverseTunnel() {
    if (this._tunnelProcess) {
      console.log('Disconnecting SSH tunnel...');
      this._tunnelProcess.kill();  // This sends SIGTERM to gracefully close the SSH connection
      console.log('SSH tunnel disconnected.');
    } else {
      console.log('No SSH tunnel is active.');
    }
  }
}

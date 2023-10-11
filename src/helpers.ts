import fs from 'fs';
import path from 'path';

type Instantiables = {
  fullPath: string;
  fileName: string;
};

export function findInstantiables(pathToFile: string): Instantiables[] {
  const found: Instantiables[] = [];
  const visited: Record<string, boolean> = {};
  let customPath = pathToFile;

  const filesWalker = (_path_: string) => {
    const check = (absolute: string) => {
      // No need to re-check the visited directories
      if (visited[absolute]) {
        return;
      }
      if (fs.statSync(absolute).isDirectory()) {
        filesWalker(absolute);
        return;
      }
      // Read file content
      const content = fs.readFileSync(absolute, 'utf8');
      const startOfComment = content.indexOf('--START--');
      const endOfComment = content.indexOf('--END--');
      if (startOfComment > -1 && endOfComment > -1) {
        const object = JSON.parse(content.slice(startOfComment + 9, endOfComment));
        found.push({ fullPath: absolute, fileName: `${object.attr['DATA-COMPONENT']}.js` });
      }
    };
  
    if (!fs.statSync(_path_).isDirectory()) {
      check(_path_);
      visited[_path_] = true;
      return;
    }
    const filesInDirectory = fs.readdirSync(_path_);
    filesInDirectory.forEach((file) => {
      const absolute = path.join(_path_, file);
      check(absolute);
    });

    visited[_path_] = true;
  };
  
  while (found.length === 0) {
    filesWalker(customPath);
    if (found.length > 0) {
      break;
    }
    customPath = path.join(customPath, '..');
  }

  return found;
};

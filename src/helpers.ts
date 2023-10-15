import fs from 'fs';
import path from 'path';

import { Instantiable } from './types';

function findInstantiationComment(absolute: string): { dataComponent: string | null } {
  const content = fs.readFileSync(absolute, 'utf8');
  const startOfComment = content.indexOf('--START--');
  const endOfComment = content.indexOf('--END--');

  let object = null;
  if (startOfComment > -1 && endOfComment > -1) {
    try {
      object = JSON.parse(content.slice(startOfComment + 9, endOfComment));
    } catch {
      object = null;
    }
  }
  return { dataComponent: object?.attr['DATA-COMPONENT'] || null };
}

function removeDuplicates(original: Instantiable[]): Instantiable[] {
  const unique: Set<Instantiable['fullPath']> = new Set();
  original.forEach((r) => {
    unique.add(r.fullPath);
  });

  // If the unique set has a different size to the length of results, there must be duplicates
  if (unique.size !== original.length) {
    original = original.filter((r) => {
      const hasValue = unique.has(r.fullPath);
      unique.delete(r.fullPath);
      return hasValue;
    });
  }

  return original;
}

type TraceOptions = {
  stopTillNotFound: string;
  visitedButTerminated?: boolean;
  initialValue?: Instantiable[];
};

const visited: Record<string, boolean> = {};
/**
 * This function will try and find at least 1 instantiable component, starting from the saved file, going up directory levels
 * and it will stop as soon as the condition is satisfied
 * @param pathToFile path to a saved file
 */
export function findInstantiables(pathToFile: string, { stopTillNotFound, visitedButTerminated }: TraceOptions): Instantiable[] {
  // If terminal for that file is terminated, then falsify the visited value
  visited[pathToFile] = !visitedButTerminated;

  const found: Instantiable[] = [];
  let customPath = pathToFile;

  const filesWalker = (_path_: string) => {
    const check = (absolute: string) => {
      if (fs.statSync(absolute).isDirectory()) {
        filesWalker(absolute);
        return;
      }
      // Read file content
      const object = findInstantiationComment(absolute);
      if (!object.dataComponent) {
        return;
      }

      // If path has been visited
      if (visited[customPath]) {
        found.push({ fullPath: '', fileName: '' });
        return;
      }
      // Otherwise
      found.push({ fullPath: absolute, fileName: `${object.dataComponent}.js` });
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

    // If stop sign is no longer found, stop the loop
    if (!customPath.includes(stopTillNotFound)) {
      break;
    }
    customPath = path.join(customPath, '..');
  }

  return found;
};

/**
 * This function will trace the sources of import of the saved component
 *
 * e.g: Saved component is Test.svelte, App.svelte is the only component that imports it - hence, only App.svelte is returned
 * @param pathToSavedFile The path to the saved file
 * @param traceOptions The options include a trace stop sign (a folder name) and all found instantiables (optional)
 */
export function traceSourcesOfImport(
  pathToSavedFile: string, { stopTillNotFound, initialValue = [] }: TraceOptions
): Instantiable[] {
  const dir = path.dirname(pathToSavedFile);
  if (!dir.includes(stopTillNotFound)) {
    return initialValue;
  }

  let foundFilesContainsNoComment: string[] = [];
  const array = fs.readdirSync(dir)
    .filter((file) => (
      !fs.statSync(path.join(dir, file)).isDirectory()
        && path.extname(file) === '.svelte'
        && !file.includes('.stories.svelte')
    ))
    .filter((file) => {
      const content = fs.readFileSync(path.join(dir, file), 'utf-8');
      const regex = new RegExp(`((import).*(${path.basename(pathToSavedFile)}))`);

      return regex.test(content);
    })
    .map((file) => {
      const absolutePath = path.join(dir, file);
      const instantiable = findInstantiationComment(absolutePath);

      if (!instantiable.dataComponent) {
        foundFilesContainsNoComment.push(absolutePath);
      }

      return {
        fullPath: absolutePath,
        fileName: `${instantiable.dataComponent}.js`,
      };
    })
    .filter((result) => !result.fileName.includes('null.js'));

  // If sources of import found but no instantiation comment found, trace from those that import the saved file
  if (foundFilesContainsNoComment.length > 0 && array.length === 0) {
    let results = foundFilesContainsNoComment.map((filePath) => (
      traceSourcesOfImport(filePath, { stopTillNotFound, initialValue: [ ...initialValue, ...array ] })
    ))
    .flat();

    return removeDuplicates(results);
  }
  return traceSourcesOfImport(dir, { stopTillNotFound, initialValue: [ ...initialValue, ...array ] });
}

/**
 * Browser stub for node:fs.
 * This file is used only during Vite web builds via an alias.
 */
export function readFileSync(_path: string): never {
  throw new Error(
    "File system access (readFileSync) is not available in the browser",
  );
}

export function writeFileSync(_path: string, _data: string): never {
  throw new Error(
    "File system access (writeFileSync) is not available in the browser",
  );
}

export function readdirSync(_path: string): never {
  throw new Error(
    "File system access (readdirSync) is not available in the browser",
  );
}

export function statSync(_path: string): never {
  throw new Error(
    "File system access (statSync) is not available in the browser",
  );
}

export function existsSync(_path: string): never {
  throw new Error(
    "File system access (existsSync) is not available in the browser",
  );
}

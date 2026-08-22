/**
 * Browser stub for node:fs.
 * This file is used only during Vite web builds via an alias.
 */
export function readFileSync(_path: string): never {
  throw new Error("File system access is not available in the browser");
}

export function writeFileSync(_path: string, _data: string): never {
  throw new Error("File system access is not available in the browser");
}

/**
 * Adapter for readFileSync that works in both Node.js and browser environments.
 * In Node.js, it delegates to node:fs.readFileSync.
 * In the browser, it throws an error (file system access is not available).
 */
export function readFileSync(path: string): string {
  if (typeof process !== "undefined" && process.versions != null && process.versions.node != null) {
    return require("node:fs").readFileSync(path, "utf-8") as string;
  }
  throw new Error("File system access is not available in the browser");
}

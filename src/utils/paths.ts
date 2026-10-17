import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// The folder holding this package's own package.json (the install, not the user's project).
function findPackageDir(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  while (!fs.existsSync(path.join(dir, "package.json"))) {
    const parent = path.dirname(dir);
    if (parent === dir) return dir;
    dir = parent;
  }
  return dir;
}

const PACKAGE_DIR = findPackageDir();

const isInside = (child: string, parent: string) => {
  const rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
};

/**
 * Turns a user-supplied path into an absolute one.
 * Relative paths are resolved from the workspace root the client reports (`getRoot`), else the process cwd.
 * Anything inside this package's own folder is rejected: documents belong in the user's project.
 */
export async function resolveUserPath(
  input: string,
  getRoot: () => Promise<string | undefined> = async () => undefined,
  packageDir: string = PACKAGE_DIR
): Promise<string> {
  const base = path.isAbsolute(input) ? "" : ((await getRoot()) ?? process.cwd());
  const resolved = path.resolve(base, input);
  if (isInside(resolved, packageDir)) {
    throw new Error(
      `"${resolved}" is inside the starter-doc-mcp folder itself. ` +
        `Give the full path of the user's project folder instead (for example D:\\projects\\my-app\\docs).`
    );
  }
  return resolved;
}

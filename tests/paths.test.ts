import test from "node:test";
import assert from "node:assert/strict";
import * as path from "node:path";
import { resolveUserPath } from "../src/utils/paths.js";

const pkg = path.resolve("/tools/starter-doc-mcp");
const project = path.resolve("/work/freelance");

test("relative paths resolve from the workspace root, not the server folder", async () => {
  const out = await resolveUserPath("docs/blueprint", async () => project, pkg);
  assert.equal(out, path.join(project, "docs", "blueprint"));
});

test("absolute paths are kept as given", async () => {
  const abs = path.resolve("/work/other/docs");
  assert.equal(await resolveUserPath(abs, async () => project, pkg), abs);
});

test("saving inside the starter-doc-mcp folder is rejected, relative or absolute", async () => {
  await assert.rejects(resolveUserPath("docs", async () => pkg, pkg), /inside the starter-doc-mcp folder/);
  await assert.rejects(resolveUserPath(path.join(pkg, "docs"), undefined, pkg), /project folder/);
});

test("a sibling folder with a similar name is not mistaken for the package folder", async () => {
  const sibling = path.resolve("/tools/starter-doc-mcp-notes");
  assert.equal(await resolveUserPath(sibling, undefined, pkg), sibling);
});

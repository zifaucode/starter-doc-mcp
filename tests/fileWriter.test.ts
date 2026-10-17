import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { generateFullBlueprintSuite } from "../src/engine/generator.js";

test("Blueprint Suite writes all 7 .md files to disk", async () => {
  const testOutputDir = path.resolve("./test_output_blueprint");
  
  // Clean up if exists
  await fs.rm(testOutputDir, { recursive: true, force: true });

  const result = await generateFullBlueprintSuite({
    projectName: "Disk Storage Test",
    description: "Testing file persistence on disk",
    templatePreset: "saas-b2b",
    outputDir: testOutputDir
  });

  assert.ok(result.writtenFiles);
  assert.equal(result.writtenFiles.length, 7);

  const filesInDir = await fs.readdir(testOutputDir);
  assert.equal(filesInDir.length, 7);
  assert.ok(filesInDir.includes("00_AGENT_INSTRUCTIONS.md"));
  assert.ok(filesInDir.includes("01_PRD.md"));
  assert.ok(filesInDir.includes("02_SRS.md"));
  assert.ok(filesInDir.includes("03_ERD.md"));
  assert.ok(filesInDir.includes("04_SDD.md"));
  assert.ok(filesInDir.includes("05_DESIGN.md"));
  assert.ok(filesInDir.includes("06_TRACEABILITY_MATRIX.md"));

  // Clean up
  await fs.rm(testOutputDir, { recursive: true, force: true });
});

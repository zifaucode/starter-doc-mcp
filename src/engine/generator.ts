import { BlueprintProject } from "../types/blueprint.js";
import { BLUEPRINT_PRESETS } from "../templates/presets.js";
import { generatePrd } from "../templates/prd.js";
import { generateSrs } from "../templates/srs.js";
import { generateErd } from "../templates/erd.js";
import { generateSdd } from "../templates/sdd.js";
import { generateDesignSpec } from "../templates/design.js";
import { generateTraceabilityMatrix } from "../templates/traceability.js";
import { generateAgentInstructions } from "../templates/agentInstruction.js";
import { writeMarkdownFiles, WrittenFile } from "../utils/fileWriter.js";

export interface BlueprintSuiteResult {
  files: {
    "00_AGENT_INSTRUCTIONS.md": string;
    "01_PRD.md": string;
    "02_SRS.md": string;
    "03_ERD.md": string;
    "04_SDD.md": string;
    "05_DESIGN.md": string;
    "06_TRACEABILITY_MATRIX.md": string;
  };
  writtenFiles?: WrittenFile[];
  summary: {
    projectName: string;
    totalDocuments: number;
    targetDatabase: string;
    featureCount: number;
    tableCount: number;
    endpointCount: number;
    screenCount: number;
  };
}

export async function generateFullBlueprintSuite(
  input: Partial<BlueprintProject>
): Promise<BlueprintSuiteResult> {
  const mergedProject = resolveProjectData(input);

  const prd = generatePrd(mergedProject);
  const srs = generateSrs(mergedProject);
  const erd = generateErd(mergedProject);
  const sdd = generateSdd(mergedProject);
  const design = generateDesignSpec(mergedProject);
  const traceability = generateTraceabilityMatrix(mergedProject);
  const agentInstructions = generateAgentInstructions(mergedProject);

  const fileMap = {
    "00_AGENT_INSTRUCTIONS.md": agentInstructions,
    "01_PRD.md": prd,
    "02_SRS.md": srs,
    "03_ERD.md": erd,
    "04_SDD.md": sdd,
    "05_DESIGN.md": design,
    "06_TRACEABILITY_MATRIX.md": traceability
  };

  let writtenFiles: WrittenFile[] | undefined;
  if (mergedProject.outputDir) {
    writtenFiles = await writeMarkdownFiles(mergedProject.outputDir, fileMap);
  }

  return {
    files: fileMap,
    writtenFiles,
    summary: {
      projectName: mergedProject.projectName,
      totalDocuments: 7,
      targetDatabase: mergedProject.techStack?.database || "PostgreSQL",
      featureCount: mergedProject.keyFeatures.length,
      tableCount: mergedProject.entities?.length || 0,
      endpointCount: mergedProject.apiEndpoints?.length || 0,
      screenCount: mergedProject.uiScreens?.length || 0
    }
  };
}

export function resolveProjectData(input: Partial<BlueprintProject>): BlueprintProject {
  // A preset applies only when asked for by name. Silently borrowing another product's features, tables,
  // and endpoints is worse than a visible gap, which the templates mark as [NOT SUPPLIED].
  const preset = (input.templatePreset && BLUEPRINT_PRESETS[input.templatePreset]) || {};
  const pick = <T>(own: T[] | undefined, fallback: T[] | undefined) => (own && own.length > 0 ? own : fallback);

  return {
    projectName: input.projectName || preset.projectName || "Untitled Project",
    tagline: input.tagline || preset.tagline,
    description: input.description || preset.description || "[NOT SUPPLIED] Describe what the product does.",
    targetAudience: pick(input.targetAudience, preset.targetAudience),
    problemStatement: input.problemStatement || preset.problemStatement,
    outOfScope: pick(input.outOfScope, preset.outOfScope),
    techStack: { ...preset.techStack, ...input.techStack },
    keyFeatures: pick(input.keyFeatures, preset.keyFeatures) || [],
    entities: pick(input.entities, preset.entities),
    apiEndpoints: pick(input.apiEndpoints, preset.apiEndpoints),
    uiScreens: pick(input.uiScreens, preset.uiScreens),
    nfr: { ...preset.nfr, ...input.nfr },
    outputDir: input.outputDir,
    templatePreset: input.templatePreset,
    detail: input.detail
  };
}
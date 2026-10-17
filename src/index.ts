import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { generateFullBlueprintSuite, resolveProjectData } from "./engine/generator.js";
import { generatePrd } from "./templates/prd.js";
import { generateSrs } from "./templates/srs.js";
import { generateErd } from "./templates/erd.js";
import { generateSdd } from "./templates/sdd.js";
import { generateDesignSpec } from "./templates/design.js";
import { auditMarkdownSpec } from "./engine/auditor.js";
import { BLUEPRINT_PRESETS } from "./templates/presets.js";
import { BlueprintProject } from "./types/blueprint.js";

const server = new McpServer({
  name: "starter-doc-mcp",
  version: "1.0.0"
});

// Common Zod schemas
const FeatureSchema = z.object({
  id: z.string().optional().describe("Unique identifier, e.g. PRD-F01"),
  name: z.string().describe("Feature name"),
  description: z.string().describe("Feature description and purpose"),
  priority: z.enum(["Must", "Should", "Could", "Won't"]).optional().default("Must"),
  inputs: z.array(z.string()).optional().describe("Input parameters and types"),
  outputs: z.array(z.string()).optional().describe("Output parameters and responses"),
  businessRules: z.array(z.string()).optional().describe("Invariants and validation rules"),
  gherkinScenarios: z.array(
    z.object({
      scenario: z.string(),
      given: z.string(),
      when: z.string(),
      then: z.string()
    })
  ).optional().describe("BDD acceptance test cases in Given-When-Then format"),
  endpoints: z.array(z.string()).optional().describe("Endpoints that implement this feature, e.g. 'POST /api/v1/invoices'. Used by the traceability matrix."),
  entities: z.array(z.string()).optional().describe("Table names this feature reads or writes. Used by the traceability matrix."),
  screens: z.array(z.string()).optional().describe("UI screen ids (e.g. UI-SCR-01) that expose this feature. Used by the traceability matrix.")
});

const DetailSchema = z.enum(["lite", "full"]).optional().describe("lite: core contract only, no diagrams, glossary, risk tables, or fixtures (about 25% fewer tokens). full (default): everything.");

// Shared by every tool, so a field a template reads is never silently dropped by one tool's narrower schema.
const TechStackSchema = z.object({
  frontend: z.string().optional(),
  backend: z.string().optional(),
  database: z.enum(["PostgreSQL", "MySQL", "SQLite", "MongoDB"]).optional(),
  orm: z.string().optional(),
  auth: z.string().optional(),
  cacheQueue: z.string().optional(),
  infrastructure: z.string().optional(),
  testingFramework: z.string().optional()
});

const NfrSchema = z.object({
  latencyP95Ms: z.number().optional(),
  latencyP99Ms: z.number().optional(),
  maxRps: z.number().optional(),
  uptimeSla: z.string().optional(),
  rpoHours: z.number().optional(),
  rtoHours: z.number().optional(),
  securityStandards: z.array(z.string()).optional()
});

const EntityFieldSchema = z.object({
  name: z.string(),
  type: z.string().describe("SQL type, e.g. UUID, VARCHAR(255), TIMESTAMPTZ"),
  isPrimary: z.boolean().optional(),
  isUnique: z.boolean().optional(),
  isNullable: z.boolean().optional(),
  defaultValue: z.string().optional(),
  references: z.string().optional().describe("Foreign key, e.g. users.id"),
  description: z.string().optional()
});

const EntitySchema = z.object({
  name: z.string(),
  description: z.string(),
  fields: z.array(EntityFieldSchema),
  indexes: z.array(z.string()).optional(),
  cascadeRules: z.string().optional()
});

const ApiEndpointSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  path: z.string(),
  summary: z.string(),
  authRequired: z.boolean(),
  rolesAllowed: z.array(z.string()).optional(),
  rateLimit: z.string().optional(),
  requestBodySchema: z.record(z.any()).optional(),
  responseBodySchema: z.record(z.any()).optional(),
  errorResponses: z.array(
    z.object({
      status: z.number(),
      code: z.string(),
      message: z.string()
    })
  ).optional()
});

const UiScreenSchema = z.object({
  id: z.string().describe("Screen ID, e.g. UI-SCR-01"),
  name: z.string(),
  route: z.string().describe("Web route path, e.g. /dashboard/billing"),
  description: z.string(),
  components: z.array(z.string()),
  states: z.object({
    emptyState: z.string(),
    loadingState: z.string(),
    errorState: z.string(),
    successState: z.string()
  })
});

// 1. MASTER TOOL: generate_full_blueprint
server.tool(
  "generate_full_blueprint",
  "Generates the entire synchronized, anti-hallucination engineering blueprint suite (PRD, SRS, ERD, SDD, DESIGN, Traceability Matrix, and Agent Instructions) as production-grade Markdown files.",
  {
    projectName: z.string().describe("Name of the project or application"),
    description: z.string().describe("Comprehensive description of what the application does"),
    tagline: z.string().optional().describe("Short punchy tagline"),
    templatePreset: z.enum(["saas-b2b", "ecommerce", "ai-agent-platform"]).optional().describe("Industry architecture template to inherit defaults from"),
    targetAudience: z.array(z.string()).optional().describe("Target user personas and operators"),
    problemStatement: z.string().optional().describe("Exact problem space and pain points being solved"),
    outOfScope: z.array(z.string()).optional().describe("Strict out-of-scope boundaries to prevent AI agent scope creep"),
    outputDir: z.string().optional().describe("Directory to save the .md files (e.g. docs/blueprint). Preferred: the reply stays short and you read only the files you need."),
    detail: DetailSchema,
    includeContent: z.boolean().optional().describe("Only when outputDir is omitted: return all 7 documents in the reply (large, about 12k tokens). Default false."),
    techStack: TechStackSchema.optional(),
    keyFeatures: z.array(FeatureSchema).optional(),
    entities: z.array(EntitySchema).optional(),
    apiEndpoints: z.array(ApiEndpointSchema).optional(),
    uiScreens: z.array(UiScreenSchema).optional(),
    nfr: NfrSchema.optional()
  },
  async (args) => {
    try {
      const result = await generateFullBlueprintSuite(args as unknown as Partial<BlueprintProject>);

      let responseText = `# Blueprint Suite Generation Completed Successfully!
## Project: ${result.summary.projectName}
* **Total Artifacts Generated:** ${result.summary.totalDocuments} Markdown documents
* **Database Engine:** ${result.summary.targetDatabase}
* **Features Cataloged:** ${result.summary.featureCount}
* **Database Tables Specified:** ${result.summary.tableCount}
* **API Endpoints Specified:** ${result.summary.endpointCount}
* **UI Screens Specified:** ${result.summary.screenCount}

---
`;

      if (result.writtenFiles && result.writtenFiles.length > 0) {
        responseText += `### Files Written to Disk:\n`;
        for (const file of result.writtenFiles) {
          responseText += `* **[${file.fileName}](file:///${file.filePath.replace(/\\/g, "/")})** (${file.bytes} bytes)\n`;
        }
        responseText += `\n> [!NOTE]\n> The downstream coding agent should read \`00_AGENT_INSTRUCTIONS.md\` first to execute the implementation roadmap.\n`;
      } else if (args.includeContent) {
        responseText += `\n### Generated Documents:\n\n`;
        for (const [filename, content] of Object.entries(result.files)) {
          responseText += `<!-- BEGIN ${filename} -->\n${content}\n<!-- END ${filename} -->\n\n`;
        }
      } else {
        responseText += `\nNothing was saved or returned. Call again with \`outputDir\` to save the files (short reply), or \`includeContent: true\` to receive them here (large).\n`;
      }

      // Short list of what the owner still has to supply: the cheap thing to act on without reading the documents.
      const gaps = Object.entries(result.files).flatMap(([filename, content]) =>
        content.split("\n").filter(l => l.includes("[NOT SUPPLIED]")).map(l => `* ${filename}: ${l.replace(/^[>*\s]+/, "").slice(0, 140)}`)
      );
      if (gaps.length > 0) {
        responseText += `\n### Still to supply (${gaps.length}):\n${gaps.slice(0, 15).join("\n")}\n`;
      }

      return {
        content: [{ type: "text", text: responseText }]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error generating blueprint suite: ${err.message}` }]
      };
    }
  }
);

// 2. TOOL: generate_prd
server.tool(
  "generate_prd",
  "Generates an anti-hallucination Product Requirements Document (PRD.md) with MoSCoW prioritization, strict in-scope/out-of-scope boundaries, and BDD Gherkin acceptance criteria.",
  {
    projectName: z.string().describe("Name of the project"),
    description: z.string().describe("Comprehensive description"),
    tagline: z.string().optional(),
    problemStatement: z.string().optional(),
    targetAudience: z.array(z.string()).optional(),
    outOfScope: z.array(z.string()).optional(),
    keyFeatures: z.array(FeatureSchema).optional(),
    templatePreset: z.enum(["saas-b2b", "ecommerce", "ai-agent-platform"]).optional(),
    detail: DetailSchema,
    outputPath: z.string().optional().describe("Optional file path to write PRD.md (e.g. docs/PRD.md)")
  },
  async (args) => {
    try {
      const project = resolveProjectData(args as unknown as Partial<BlueprintProject>);
      const markdown = generatePrd(project);

      if (args.outputPath) {
        const fullPath = path.resolve(args.outputPath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, markdown, "utf-8");
        return {
          content: [{
            type: "text",
            text: `Successfully wrote PRD to [${path.basename(fullPath)}](file:///${fullPath.replace(/\\/g, "/")}) (${Buffer.byteLength(markdown, "utf-8")} bytes).`
          }]
        };
      }

      return {
        content: [{ type: "text", text: markdown }]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error generating PRD: ${err.message}` }]
      };
    }
  }
);

// 3. TOOL: generate_srs
server.tool(
  "generate_srs",
  "Generates an ISO/IEC/IEEE 29148 compliant Software Requirements Specification (SRS.md) with strict functional inputs/outputs, error conditions, latency SLAs, and OWASP security constraints.",
  {
    projectName: z.string(),
    description: z.string(),
    keyFeatures: z.array(FeatureSchema).optional(),
    templatePreset: z.enum(["saas-b2b", "ecommerce", "ai-agent-platform"]).optional(),
    outOfScope: z.array(z.string()).optional(),
    techStack: TechStackSchema.optional(),
    nfr: NfrSchema.optional(),
    detail: DetailSchema,
    outputPath: z.string().optional().describe("Optional file path to write SRS.md")
  },
  async (args) => {
    try {
      const project = resolveProjectData(args as unknown as Partial<BlueprintProject>);
      const markdown = generateSrs(project);

      if (args.outputPath) {
        const fullPath = path.resolve(args.outputPath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, markdown, "utf-8");
        return {
          content: [{
            type: "text",
            text: `Successfully wrote SRS to [${path.basename(fullPath)}](file:///${fullPath.replace(/\\/g, "/")}) (${Buffer.byteLength(markdown, "utf-8")} bytes).`
          }]
        };
      }

      return {
        content: [{ type: "text", text: markdown }]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error generating SRS: ${err.message}` }]
      };
    }
  }
);

// 4. TOOL: generate_erd
server.tool(
  "generate_erd",
  "Generates an Entity Relationship Diagram (ERD.md) with valid Mermaid diagram, complete data dictionary, index strategies, foreign key cascade behaviors, and production SQL DDL migrations.",
  {
    projectName: z.string(),
    description: z.string().optional().default("Relational data persistence schema"),
    databaseEngine: z.enum(["PostgreSQL", "MySQL", "SQLite", "MongoDB"]).optional().default("PostgreSQL"),
    templatePreset: z.enum(["saas-b2b", "ecommerce", "ai-agent-platform"]).optional(),
    entities: z.array(EntitySchema).optional(),
    detail: DetailSchema,
    outputPath: z.string().optional().describe("Optional file path to write ERD.md")
  },
  async (args) => {
    try {
      const project = resolveProjectData({
        projectName: args.projectName,
        description: args.description,
        templatePreset: args.templatePreset,
        techStack: { database: args.databaseEngine },
        entities: args.entities,
        detail: args.detail
      });
      const markdown = generateErd(project);

      if (args.outputPath) {
        const fullPath = path.resolve(args.outputPath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, markdown, "utf-8");
        return {
          content: [{
            type: "text",
            text: `Successfully wrote ERD to [${path.basename(fullPath)}](file:///${fullPath.replace(/\\/g, "/")}) (${Buffer.byteLength(markdown, "utf-8")} bytes).`
          }]
        };
      }

      return {
        content: [{ type: "text", text: markdown }]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error generating ERD: ${err.message}` }]
      };
    }
  }
);

// 5. TOOL: generate_sdd
server.tool(
  "generate_sdd",
  "Generates a Software Design Document (SDD.md) with C4 diagrams (Mermaid), exhaustive API contracts, sequence diagrams, and Architectural Decision Records (ADRs).",
  {
    projectName: z.string(),
    description: z.string(),
    templatePreset: z.enum(["saas-b2b", "ecommerce", "ai-agent-platform"]).optional(),
    techStack: TechStackSchema.optional(),
    apiEndpoints: z.array(ApiEndpointSchema).optional(),
    detail: DetailSchema,
    outputPath: z.string().optional().describe("Optional file path to write SDD.md")
  },
  async (args) => {
    try {
      const project = resolveProjectData(args as unknown as Partial<BlueprintProject>);
      const markdown = generateSdd(project);

      if (args.outputPath) {
        const fullPath = path.resolve(args.outputPath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, markdown, "utf-8");
        return {
          content: [{
            type: "text",
            text: `Successfully wrote SDD to [${path.basename(fullPath)}](file:///${fullPath.replace(/\\/g, "/")}) (${Buffer.byteLength(markdown, "utf-8")} bytes).`
          }]
        };
      }

      return {
        content: [{ type: "text", text: markdown }]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error generating SDD: ${err.message}` }]
      };
    }
  }
);

// 6. TOOL: generate_design_spec
server.tool(
  "generate_design_spec",
  "Generates a frontend UI/UX Design Specification (DESIGN.md) with 60-30-10 color tokens, typography scale, atomic component hierarchy, and deterministic 5-State screen matrices (Empty, Loading, Error, Partial, Populated), and anti-slop UI/copy rules for implementing agents.",
  {
    projectName: z.string(),
    templatePreset: z.enum(["saas-b2b", "ecommerce", "ai-agent-platform"]).optional(),
    uiScreens: z.array(UiScreenSchema).optional(),
    detail: DetailSchema,
    outputPath: z.string().optional().describe("Optional file path to write DESIGN.md")
  },
  async (args) => {
    try {
      const project = resolveProjectData(args as unknown as Partial<BlueprintProject>);
      const markdown = generateDesignSpec(project);

      if (args.outputPath) {
        const fullPath = path.resolve(args.outputPath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, markdown, "utf-8");
        return {
          content: [{
            type: "text",
            text: `Successfully wrote Design Spec to [${path.basename(fullPath)}](file:///${fullPath.replace(/\\/g, "/")}) (${Buffer.byteLength(markdown, "utf-8")} bytes).`
          }]
        };
      }

      return {
        content: [{ type: "text", text: markdown }]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error generating Design Spec: ${err.message}` }]
      };
    }
  }
);

// 7. TOOL: audit_spec_completeness
server.tool(
  "audit_spec_completeness",
  "Audits a specification document or text against the strict Anti-Hallucination rubric: checks for ambiguous buzzwords, missing error status codes, lack of Gherkin criteria, missing 5-state UI matrices, and returns a 0-100 quality score with surgical fix advice.",
  {
    content: z.string().optional().describe("Markdown content to audit. Either content or filePath must be provided."),
    filePath: z.string().optional().describe("Path to local markdown file to inspect.")
  },
  async ({ content, filePath }) => {
    try {
      let textToAudit = content;
      if (!textToAudit && filePath) {
        textToAudit = await fs.readFile(path.resolve(filePath), "utf-8");
      }

      if (!textToAudit) {
        return {
          isError: true,
          content: [{ type: "text", text: "Error: Either 'content' or 'filePath' must be provided." }]
        };
      }

      const audit = auditMarkdownSpec(textToAudit);

      let report = `# Anti-Hallucination Quality Gate Report
**Score:** \`${audit.score} / 100\`, **Status:** \`${audit.status}\`
**Verdict:** ${audit.antiHallucinationVerdict}  

### Summary Metrics:
* **Critical Blocking Issues:** ${audit.criticalCount}
* **High Severity Issues:** ${audit.highCount}
* **Total Defects Detected:** ${audit.totalIssues}

---

### Strengths & Compliances:
${audit.strengths.length > 0 ? audit.strengths.map(s => `* ${s}`).join("\n") : "* No notable compliances detected."}

---

### Actionable Remediation Items:
${audit.issues.length > 0 ? audit.issues.map((iss, i) => {
  return `#### ${i + 1}. [${iss.severity}] ${iss.category}
* **Defect:** ${iss.description}
* **Remediation:** ${iss.recommendation}
${iss.snippet ? `* **Context:** \`${iss.snippet}\`` : ""}
`;
}).join("\n") : "No defects found by these checks. That does not prove the specification is correct, only that none of the patterns above were present."}
`;

      return {
        content: [{ type: "text", text: report }]
      };
    } catch (err: any) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error during specification audit: ${err.message}` }]
      };
    }
  }
);

// 8. TOOL: list_blueprint_templates
server.tool(
  "list_blueprint_templates",
  "Lists production-grade architecture presets available for rapid bootstrapping (SaaS B2B, E-Commerce, AI Agent Platform).",
  {},
  async () => {
    const list = Object.entries(BLUEPRINT_PRESETS).map(([key, data]) => {
      return `### Template: \`${key}\`
* **Name:** ${data.projectName}
* **Tagline:** ${data.tagline}
* **Description:** ${data.description}
* **Default Database:** ${data.techStack?.database}
* **Included Entities:** ${data.entities?.map(e => e.name).join(", ")}
* **Core Features:** ${data.keyFeatures?.map(f => f.name).join(", ")}
`;
    }).join("\n---\n");

    return {
      content: [{ type: "text", text: `# Available Blueprint Templates\n\n${list}` }]
    };
  }
);

// Connect stdio transport and launch server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("starter-doc-mcp server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting starter-doc-mcp:", err);
  process.exit(1);
});

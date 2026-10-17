import test from "node:test";
import assert from "node:assert/strict";
import { generateFullBlueprintSuite } from "../src/engine/generator.js";
import { auditMarkdownSpec } from "../src/engine/auditor.js";
import { generatePrd } from "../src/templates/prd.js";
import { generateErd } from "../src/templates/erd.js";
import { generateSdd } from "../src/templates/sdd.js";
import { generateSrs } from "../src/templates/srs.js";
import { generateDesignSpec } from "../src/templates/design.js";
import { generateTraceabilityMatrix } from "../src/templates/traceability.js";
import { generateAgentInstructions } from "../src/templates/agentInstruction.js";
import { resolveProjectData } from "../src/engine/generator.js";

test("Full Blueprint Suite generates all 7 documents", async () => {
  const result = await generateFullBlueprintSuite({
    projectName: "Test App",
    description: "An automated test application",
    templatePreset: "saas-b2b"
  });

  assert.equal(result.summary.totalDocuments, 7);
  assert.ok(result.files["00_AGENT_INSTRUCTIONS.md"].includes("AGENT EXECUTION DIRECTIVE"));
  assert.ok(result.files["01_PRD.md"].includes("Product Requirements Document"));
  assert.ok(result.files["02_SRS.md"].includes("Software Requirements Specification"));
  assert.ok(result.files["03_ERD.md"].includes("erDiagram"));
  assert.ok(result.files["04_SDD.md"].includes("Software Design Document"));
  assert.ok(result.files["05_DESIGN.md"].includes("Design System Tokens"));
  assert.ok(result.files["06_TRACEABILITY_MATRIX.md"].includes("Requirements Traceability Matrix"));
});

test("Without a named preset nothing is borrowed from one; gaps are marked", async () => {
  const project = resolveProjectData({ projectName: "Freelance Invoices", description: "Invoice tracking for freelancers" });
  assert.deepEqual(project.keyFeatures, []);
  assert.equal(project.entities, undefined);
  assert.equal(project.problemStatement, undefined);

  const { files } = await generateFullBlueprintSuite({ projectName: "Freelance Invoices", description: "Invoice tracking for freelancers" });
  const all = Object.values(files).join("\n");
  assert.ok(!/\bstripe\b|tenant/i.test(all), "no other product's content leaks in");
  for (const name of ["01_PRD.md", "03_ERD.md", "04_SDD.md", "05_DESIGN.md"] as const) {
    assert.ok(files[name].includes("[NOT SUPPLIED]"), `${name} marks what is missing`);
  }
});

test("detail 'lite' is smaller than 'full' and keeps the contract", async () => {
  const input = { projectName: "Portal", description: "Enterprise portal", templatePreset: "saas-b2b" };
  const full = (await generateFullBlueprintSuite(input)).files;
  const lite = (await generateFullBlueprintSuite({ ...input, detail: "lite" })).files;

  const size = (f: Record<string, string>) => Object.values(f).join("").length;
  assert.ok(size(lite) < size(full) * 0.8, `lite ${size(lite)} should be well under full ${size(full)}`);

  // Dropped: reference material.
  assert.ok(!lite["03_ERD.md"].includes("erDiagram") && !lite["04_SDD.md"].includes("sequenceDiagram"));
  assert.ok(!lite["01_PRD.md"].includes("Risk Mitigation") && !lite["05_DESIGN.md"].includes("Wireframe"));
  // Kept: what an agent builds from.
  assert.ok(lite["01_PRD.md"].includes("```gherkin") && lite["01_PRD.md"].includes("Strict Out-of-Scope"));
  assert.ok(lite["02_SRS.md"].includes("SRS-FR-001-BR-01") && lite["02_SRS.md"].includes("VALIDATION_ERROR"));
  assert.ok(lite["03_ERD.md"].includes("CREATE TABLE IF NOT EXISTS"));
  assert.ok(lite["04_SDD.md"].includes("ADR-001") && lite["04_SDD.md"].includes("POST /api/v1/auth/login"));
  assert.ok(lite["05_DESIGN.md"].includes("Empty State") && lite["05_DESIGN.md"].includes("Anti-Slop Rules"));
  assert.ok(lite["00_AGENT_INSTRUCTIONS.md"].includes("Implementation Order"));
});

test("PRD contains BDD Gherkin test scenarios and MoSCoW prioritization", () => {
  const project = resolveProjectData({
    projectName: "Fintech Vault",
    description: "A secure digital vault",
    templatePreset: "saas-b2b"
  });

  const prd = generatePrd(project);
  assert.ok(prd.includes("```gherkin"));
  assert.ok(prd.includes("Given"));
  assert.ok(prd.includes("When"));
  assert.ok(prd.includes("Then"));
  assert.ok(prd.includes("MoSCoW Prioritization"));
  assert.ok(prd.includes("Strict Out-of-Scope"));
  assert.ok(!prd.includes("APPROVED_FOR_IMPLEMENTATION") && !prd.includes("PASSED"), "no self-awarded approval");
  assert.ok(!prd.includes("—"), "no em dashes");
  assert.ok(!/\p{Extended_Pictographic}/u.test(prd), "no emoji");
});

test("ERD contains valid Mermaid erDiagram and SQL DDL migration", () => {
  const project = resolveProjectData({
    projectName: "E-Store",
    description: "Online storefront",
    templatePreset: "ecommerce"
  });

  const erd = generateErd(project);
  assert.ok(erd.includes("erDiagram"));
  assert.ok(erd.includes("CREATE TABLE IF NOT EXISTS"));
  assert.ok(erd.includes("PRIMARY KEY"));
  assert.ok(erd.includes("Comprehensive Data Dictionary"));
});

test("ERD migration honours cascade rules, orders parents first, and is re-runnable", () => {
  const erd = generateErd({
    projectName: "Shop",
    description: "Storefront",
    techStack: { database: "MySQL" },
    keyFeatures: [],
    entities: [
      {
        name: "orders",
        description: "Orders",
        fields: [
          { name: "id", type: "UUID", isPrimary: true },
          { name: "customer_id", type: "UUID", isNullable: true, references: "customers.id" }
        ],
        cascadeRules: "ON DELETE SET NULL on customer_id"
      },
      { name: "customers", description: "Customers", fields: [{ name: "id", type: "UUID", isPrimary: true }] }
    ]
  });

  assert.ok(erd.includes("REFERENCES customers(id) ON DELETE SET NULL"), "valid FK syntax, and SET NULL is not turned into CASCADE");
  assert.ok(!erd.includes("ON DELETE CASCADE"));
  assert.ok(erd.indexOf("CREATE TABLE IF NOT EXISTS customers") < erd.indexOf("CREATE TABLE IF NOT EXISTS orders"), "parent table first");
  assert.ok(erd.includes("CREATE INDEX IF NOT EXISTS idx_orders_customer_id"), "FK is indexed in the migration");
  assert.ok(erd.includes("CUSTOMERS |o--o{ ORDERS"), "nullable FK means optional parent");
  assert.ok(erd.includes("PostgreSQL dialect"), "non-PostgreSQL target is warned");
  assert.ok(!erd.includes("Sample Default Record"), "fixtures are shapes, not invented rows");
});

test("Traceability maps only supplied links and reports gaps and orphans", () => {
  const rtm = generateTraceabilityMatrix({
    projectName: "Shop",
    description: "Storefront",
    keyFeatures: [
      { name: "Checkout", description: "Pay", endpoints: ["POST /api/v1/orders"], entities: ["orders"], screens: ["UI-SCR-01"] },
      { name: "Browse", description: "List items" }
    ],
    apiEndpoints: [
      { method: "POST", path: "/api/v1/orders", summary: "Create order", authRequired: true },
      { method: "GET", path: "/api/v1/legacy", summary: "Old", authRequired: false }
    ],
    entities: [
      { name: "orders", description: "Orders", fields: [] },
      { name: "coupons", description: "Coupons", fields: [] }
    ]
  });

  assert.ok(rtm.includes("1 of 2 features fully mapped"));
  assert.ok(rtm.includes("`POST /api/v1/orders`") && rtm.includes("`UI-SCR-01`"));
  assert.ok(rtm.includes("`UNMAPPED`"), "unmapped features say so instead of getting a guessed link");
  assert.ok(!rtm.includes("STRICT_TRACEABILITY_VALIDATED") && !rtm.includes("core_records"));
  assert.ok(rtm.includes("`GET /api/v1/legacy`") && rtm.includes("`coupons`"), "orphans listed");
  assert.ok(rtm.includes("Standard happy path execution for Browse"), "default scenario names match the PRD");
});

test("saas-b2b preset links features to its own endpoints, tables, and screens", () => {
  const rtm = generateTraceabilityMatrix(resolveProjectData({ projectName: "Portal", description: "Portal", templatePreset: "saas-b2b" }));
  assert.ok(rtm.includes("`GET /api/v1/workspaces/:slug/members`") && rtm.includes("`api_keys`") && rtm.includes("`UI-SCR-02`"));
  assert.ok(!rtm.includes("Screens no feature uses"), "every screen is linked");
  assert.ok(rtm.includes("`POST /api/v1/auth/login`"), "the login endpoint has no feature, so it is reported as an orphan");
});

test("SDD contains C4 diagrams, sequence diagrams, and ADR records", () => {
  const project = resolveProjectData({
    projectName: "AI Orchestrator",
    description: "Autonomous agent execution",
    templatePreset: "ai-agent-platform"
  });

  const sdd = generateSdd(project);
  assert.ok(sdd.includes("sequenceDiagram"));
  assert.ok(sdd.includes("flowchart TD"));
  assert.ok(sdd.includes("ADR-001"));
  assert.ok(sdd.includes("ADR-002"));
  assert.ok(sdd.includes("Exhaustive API Interface Specifications"));
  assert.ok(!/\p{Extended_Pictographic}/u.test(sdd), "no emoji");
  assert.ok(!sdd.includes("ACCEPTED"), "generated ADRs are proposals, not accepted");
});

test("SDD follows tech stack and only draws integrations the project mentions", () => {
  const sdd = generateSdd({
    projectName: "Notes",
    description: "A notes app",
    techStack: { cacheQueue: "Valkey" },
    keyFeatures: [{ name: "Write note", description: "Create a note" }]
  });
  assert.ok(sdd.includes("Valkey") && !sdd.includes("Redis"));
  assert.ok(!sdd.includes("PaymentGateway") && !sdd.includes("EmailGateway"));
  assert.ok(sdd.includes("[NOT SUPPLIED]"), "generic endpoints are labelled as placeholders");
});

test("SRS uses feature data once: business rules, tech stack, shared error matrix", () => {
  const srs = generateSrs({
    projectName: "Ledger",
    description: "Invoice tracking",
    outOfScope: ["Payroll"],
    techStack: { database: "MySQL", cacheQueue: "Valkey" },
    keyFeatures: [
      { name: "Create invoice", description: "Issue an invoice", businessRules: ["Total must equal sum of line items"] },
      { name: "List invoices", description: "Browse invoices" }
    ]
  });

  assert.ok(srs.includes("SRS-FR-001-BR-01"));
  assert.ok(srs.includes("Total must equal sum of line items"));
  assert.ok(srs.includes("MySQL") && srs.includes("Valkey"));
  assert.ok(!srs.includes("Redis 7.2"), "tech stack overrides the Redis default");
  assert.ok(srs.includes("Payroll"));
  assert.equal(srs.split("`VALIDATION_ERROR` | `422 Unprocessable`").length - 1, 1, "error matrix appears once");
});

test("DESIGN contains 60-30-10 palette and 5-State screen matrix", () => {
  const project = resolveProjectData({
    projectName: "Portal",
    description: "Enterprise portal",
    templatePreset: "saas-b2b"
  });

  const design = generateDesignSpec(project);
  assert.ok(design.includes("60-30-10 Rule"));
  assert.ok(design.includes("Empty State"));
  assert.ok(design.includes("Loading State"));
  assert.ok(design.includes("Error State"));
  assert.ok(design.includes("Populated State"));
  assert.ok(design.includes("WCAG 2.1"));
  assert.ok(design.includes("Anti-Slop Rules"));
  assert.ok(!design.includes("—"), "no em dashes");
  assert.ok(!/\p{Extended_Pictographic}/u.test(design), "no emoji");
  assert.ok(!design.includes("#4F46E5"), "no default indigo accent");
  assert.ok(!auditMarkdownSpec(design).issues.some(i => i.category === "WRITING_QUALITY"), "quoted banned words are not flagged");
});

test("Anti-Hallucination Auditor detects ambiguous phrases and missing error codes", () => {
  const badSpec = `
    # My App
    We build a user-friendly and blazing fast system that is scalable and seamless.
    Users can login. That is it.
  `;

  const audit = auditMarkdownSpec(badSpec);
  assert.equal(audit.status, "FAILED");
  assert.ok(audit.score < 70);
  assert.ok(audit.criticalCount > 0);
  assert.ok(audit.issues.some(i => i.category === "AMBIGUITY"));
  assert.ok(audit.issues.some(i => i.category === "MISSING_ERROR_HANDLING"));
});

test("Agent instructions tell the agent to stop on placeholders and PROPOSED decisions", () => {
  const doc = generateAgentInstructions({
    projectName: "Notes",
    description: "A notes app",
    techStack: { testingFramework: "Vitest" },
    keyFeatures: []
  });
  assert.ok(doc.includes("[NOT SUPPLIED]") && doc.includes("PROPOSED"));
  assert.ok(doc.includes("Vitest"));
  assert.ok(!/ZERO HALLUCINATIONS/.test(doc), "no all-caps emphasis");
  assert.ok(!auditMarkdownSpec(doc).issues.some(i => i.description.includes("[NOT SUPPLIED]")), "named placeholders are not unresolved ones");
});

test("Auditor ignores look-alike text and flags etc., empty claims, em dashes, placeholders", () => {
  const prose = "We build a build tool. When it runs, then it builds 4000 files. Quick guide for users.";
  const a = auditMarkdownSpec(prose);
  assert.ok(a.issues.some(i => i.category === "MISSING_ERROR_HANDLING"), "4000 is not an HTTP status");
  assert.ok(a.issues.some(i => i.category === "TESTABILITY"), "prose when/then is not Gherkin");
  assert.ok(!a.issues.some(i => i.category === "UI_EDGE_CASES"), "'build' and 'guide' are not UI");

  const b = auditMarkdownSpec("Supports CSV, JSON, etc. A world-class tool — unlock value. [NOT SUPPLIED]");
  assert.ok(b.issues.some(i => i.category === "AMBIGUITY" && i.description.includes("etc.")));
  assert.ok(b.issues.some(i => i.category === "WRITING_QUALITY"));
  assert.ok(b.issues.some(i => i.description.includes("[NOT SUPPLIED]")));
});

test("Anti-Hallucination Auditor passes rigorous full blueprint", () => {
  const project = resolveProjectData({
    projectName: "Enterprise Platform",
    description: "A production SaaS system",
    templatePreset: "saas-b2b"
  });

  const prd = generatePrd(project);
  const srs = generateSrs(project);
  const combined = `${prd}\n\n${srs}`;

  const audit = auditMarkdownSpec(combined);
  assert.equal(audit.status, "PASSED");
  assert.ok(audit.score >= 85);
  assert.equal(audit.criticalCount, 0);
});

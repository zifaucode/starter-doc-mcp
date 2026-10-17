import { BlueprintProject } from "../types/blueprint.js";

const cell = (values: string[] | undefined) =>
  values && values.length > 0 ? values.map(v => `\`${v}\``).join("<br>") : "`UNMAPPED`";

export function generateTraceabilityMatrix(project: BlueprintProject): string {
  const dateStr = new Date().toISOString().split("T")[0];
  const features = project.keyFeatures || [];
  const entities = project.entities || [];
  const endpoints = project.apiEndpoints || [];
  const screens = project.uiScreens || [];

  const isMapped = (v?: string[]) => !!v && v.length > 0;
  const fullyMapped = features.filter(f => isMapped(f.endpoints) && isMapped(f.entities) && isMapped(f.screens)).length;

  // Anything the project defines that no feature points at. Only checked for lists the project actually supplied.
  const usedEndpoints = features.flatMap(f => f.endpoints || []);
  const orphanEndpoints = endpoints
    .map(ep => `${ep.method} ${ep.path}`)
    .filter(label => !usedEndpoints.some(u => u === label || label.endsWith(` ${u}`)));
  const usedEntities = new Set(features.flatMap(f => f.entities || []));
  const orphanEntities = entities.map(e => e.name).filter(n => !usedEntities.has(n));
  const usedScreens = new Set(features.flatMap(f => f.screens || []));
  const orphanScreens = screens.map(s => s.id).filter(id => !usedScreens.has(id));

  const orphanLines = [
    orphanEndpoints.length > 0 ? `* **Endpoints no feature uses:** ${orphanEndpoints.map(o => `\`${o}\``).join(", ")}` : "",
    orphanEntities.length > 0 ? `* **Tables no feature uses:** ${orphanEntities.map(o => `\`${o}\``).join(", ")}` : "",
    orphanScreens.length > 0 ? `* **Screens no feature uses:** ${orphanScreens.map(o => `\`${o}\``).join(", ")}` : ""
  ].filter(Boolean);

  return `# End-to-End Requirements Traceability Matrix (RTM)
## Project: ${project.projectName}
**Mapping Coverage:** ${fullyMapped} of ${features.length} features fully mapped
**Date:** ${dateStr}
**Classification:** Cross-Artifact Anti-Hallucination Bridge

---

## 1. Executive Traceability Matrix

> [!IMPORTANT]
> **Anti-Hallucination Rule:**
> A row is complete only when no cell reads \`UNMAPPED\`. \`UNMAPPED\` means the owner has not supplied that link. Do not guess it: ask, or leave the part of the feature that depends on it unbuilt.

| PRD Feature | SRS Req ID | SDD API | ERD Table | UI Screen | Verification Test |
| :--- | :--- | :--- | :--- | :--- | :--- |
${features.map((f, idx) => {
  const prdId = f.id || `PRD-F0${idx + 1}`;
  const srsId = `SRS-FR-${String(idx + 1).padStart(3, "0")}`;
  // Same scenario names that 01_PRD.md prints, including its defaults when none were supplied.
  const tests = f.gherkinScenarios && f.gherkinScenarios.length > 0
    ? f.gherkinScenarios.map(s => s.scenario)
    : [`Standard happy path execution for ${f.name}`, "Validation failure with malformed inputs"];

  return `| \`${prdId}\` | \`${srsId}\` | ${cell(f.endpoints)} | ${cell(f.entities)} | ${cell(f.screens)} | ${tests.map(t => `\`${t}\``).join("<br>")} |`;
}).join("\n")}

---

## 2. Orphans
${orphanLines.length > 0
  ? `Defined in the blueprint but not linked to any feature. Link each one to a feature or remove it.\n\n${orphanLines.join("\n")}`
  : "None found among the endpoints, tables, and screens supplied."}

---

## 3. Integrity Verification Checklist for AI Agents

Prior to declaring any milestone complete, verify all items below:

- [ ] **1. Data Integrity:** Every table specified in \`03_ERD.md\` has corresponding migrations with Foreign Key indexes and \`NOT NULL\` constraints.
- [ ] **2. Contract Completeness:** Every endpoint in \`04_SDD.md\` has an active route handler that validates input and returns the error codes listed for it.
- [ ] **3. UI State Completeness:** Every screen in \`05_DESIGN.md\` implements all 5 states (Empty, Loading, Error, Partial, Populated) without hardcoded mock data.
- [ ] **4. Test Automation:** Every BDD Gherkin scenario in \`01_PRD.md\` has a corresponding passing test.
- [ ] **5. Zero Scope Creep:** No feature from the PRD "Out-of-Scope" list has been added or planned.
- [ ] **6. No Open Placeholders:** No \`[NOT SUPPLIED]\` marker, \`UNMAPPED\` cell, or \`PROPOSED\` ADR remains unresolved in this directory.

---
*End of Traceability Matrix. Proceed to \`00_AGENT_INSTRUCTIONS.md\` to commence implementation.*
`;
}

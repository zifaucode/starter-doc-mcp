import { BlueprintProject, FeatureInput } from "../types/blueprint.js";

export function generatePrd(project: BlueprintProject): string {
  const dateStr = new Date().toISOString().split("T")[0];
  const features = project.keyFeatures || [];
  const full = project.detail !== "lite";

  return `# Product Requirements Document (PRD)
## Project: ${project.projectName}
${project.tagline ? `**Tagline:** ${project.tagline}  \n` : ""}**Status:** \`DRAFT_FOR_REVIEW\` (a human must approve before implementation)
**Target Release:** v1.0.0-GA
**Created Date:** ${dateStr}
**Specification Standard:** ISO/IEC/IEEE 29148 structure

---

## 1. Executive Summary & Problem Space

### 1.1 Problem Statement
${project.problemStatement || "[NOT SUPPLIED] State who has the problem, what it costs them today, and how they cope now. Do not infer it from the product description."}

### 1.2 Product Vision & Value Proposition
${project.description}

### 1.3 Target Personas
${(project.targetAudience && project.targetAudience.length > 0)
  ? project.targetAudience.map((audience, idx) => `* **Persona ${idx + 1}:** ${audience}`).join("\n")
  : `* [NOT SUPPLIED] Placeholder roles, replace with the real audience before implementation:\n  * **Primary Operator:** runs day-to-day operations in the product.\n  * **Technical Administrator:** manages permissions, audit logs, and API access.\n  * **Executive Stakeholder:** reads reports and billing.`
}
${full ? `
* **Anti-Persona (Who this is NOT built for; defaults, edit as needed):**
  * Unauthenticated anonymous actors looking for public unrestricted data manipulation.
  * Systems requiring manual batch paper-based offline reconciliations.
` : ""}
---

## 2. Strategic Boundaries & Non-Goals (Scope Guardrails)

> [!IMPORTANT]
> **Anti-Hallucination Directive for AI Agents:**
> Do NOT implement, plan, or scaffold any capability listed in the Out-of-Scope section. Stick strictly to In-Scope requirements.

### 2.1 In-Scope (Milestone v1.0)
${features.length === 0 ? "* [NOT SUPPLIED] No features were provided. Supply `keyFeatures` (or name a `templatePreset`) before implementation.\n" : ""}${features.map((f, i) => `* **[${f.id || `PRD-F0${i + 1}`}]** ${f.name}: ${f.description}`).join("\n")}

### 2.2 Strict Out-of-Scope (Non-Goals)
${(project.outOfScope && project.outOfScope.length > 0)
  ? project.outOfScope.map(item => `* **${item}**`).join("\n")
  : `* No exclusions were supplied. Defaults below apply until the owner replaces them:
  * **Legacy on-premise mainframe sync** (v1.0 is cloud native only).
  * **Native desktop or smart-TV interfaces.**
  * **Database mutations outside validated API routes.**`
}

---

## 3. Feature Matrix & MoSCoW Prioritization

| Feature ID | Feature Name | MoSCoW Priority | Primary Output |
| :--- | :--- | :--- | :--- |
${features.map((f, i) => {
  const fid = f.id || `PRD-F0${i + 1}`;
  const priority = f.priority || "Must";
  const output = (f.outputs && f.outputs[0]) || "Structured State Change / HTTP Response";
  return `| \`${fid}\` | **${f.name}** | \`${priority}\` | ${output} |`;
}).join("\n")}

---

## 4. Detailed User Stories & BDD Acceptance Criteria

${features.map((f, i) => {
  const fid = f.id || `PRD-F0${i + 1}`;
  const inputs = f.inputs && f.inputs.length > 0 ? f.inputs.map(inp => `  * \`${inp}\``).join("\n") : "  * Valid request body and session credentials";
  const outputs = f.outputs && f.outputs.length > 0 ? f.outputs.map(out => `  * \`${out}\``).join("\n") : "  * 200/201 JSON payload or validated error structure";
  const rules = f.businessRules && f.businessRules.length > 0 ? f.businessRules.map(r => `  * ${r}`).join("\n") : "  * Strict input sanitization and authorization enforcement.";

  const scenarios = f.gherkinScenarios && f.gherkinScenarios.length > 0 ? f.gherkinScenarios.map(sc => `
\`\`\`gherkin
Scenario: ${sc.scenario}
  Given ${sc.given}
  When ${sc.when}
  Then ${sc.then}
\`\`\`
`).join("\n") : `
\`\`\`gherkin
Scenario: Standard happy path execution for ${f.name}
  Given an authorized user with appropriate permissions
  When the user executes the command with valid parameters
  Then the system records the state change and returns HTTP 200 Success

Scenario: Validation failure with malformed inputs
  Given an authenticated user
  When the user submits malformed or missing fields
  Then the system rejects the operation with HTTP 422 Unprocessable Entity and returns actionable validation errors
\`\`\`
`;

  return `### 4.${i + 1} [${fid}] ${f.name}
**Description:** ${f.description}  
**Priority:** \`${f.priority || "Must"}\`

#### Inputs & Parameters:
${inputs}

#### Outputs & Side Effects:
${outputs}

#### Business Rules & Invariants:
${rules}

#### BDD Acceptance Test Scenarios (Gherkin):
${scenarios}
`;
}).join("\n---\n\n")}

${full ? `---

## 5. Success Metrics & Key Performance Indicators (KPIs)

| Metric Category | Target Objective | Verification Method |
| :--- | :--- | :--- |
| **API Performance** | P95 Latency ≤ ${project.nfr?.latencyP95Ms || 150}ms under nominal load | Continuous APM / Prometheus tracing |
| **Availability** | SLA ≥ ${project.nfr?.uptimeSla || "99.95%"} uptime | Synthetic health probes every 60s |
| **Data Integrity** | Zero data corruption or orphaned records | Foreign Key constraints & DB integrity checks |
| **Test Coverage** | Unit & Integration test coverage ≥ 85% | Automated CI/CD test runner pipeline |

---

## 6. Assumptions, Dependencies & Risk Mitigation

| Risk / Dependency | Impact | Probability | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Third-Party Service Outage** (Auth / Payment) | HIGH | MEDIUM | Implement circuit breaker with exponential backoff and localized queue replay. |
| **Concurrent Mutation Race Conditions** | HIGH | LOW | Enforce database-level transactions with strict isolation and atomic locks. |
| **Input Injection Attacks (SQLi / XSS)** | CRITICAL | LOW | Strict parameterized queries (ORM) and automated schema validation (Zod/Valibot). |

` : ""}---
*End of PRD. Proceed to \`02_SRS.md\` for technical requirement specifications.*
`;
}

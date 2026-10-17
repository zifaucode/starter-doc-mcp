import { BlueprintProject } from "../types/blueprint.js";

export function generateAgentInstructions(project: BlueprintProject): string {
  const dateStr = new Date().toISOString().split("T")[0];
  const full = project.detail !== "lite";
  const testing = project.techStack?.testingFramework || "the project's test framework";

  return `# AGENT EXECUTION DIRECTIVE: ${project.projectName}
**Role:** Senior Full-Stack Implementation Agent
**Scope of authority:** Implement only what the files in this directory specify
**Directive Version:** 1.1.0
**Generated Date:** ${dateStr}
**Primary Goal:** Build the application to match the specifications in this directory. Add no endpoints, tables, screens, or features they do not define, and ship complete, working code.

---

## 1. Grounding Directives (Anti-Hallucination Protocol)

Every file in this blueprint directory is authoritative for its own domain (see section 3) and cross-linked to the others.

1. **NEVER Invent Endpoints:** Only implement the exact API routes defined in \`04_SDD.md\`. If an endpoint is missing, request clarification rather than fabricating it.
2. **NEVER Alter Database Schemas Speculatively:** Follow \`03_ERD.md\` column names, data types, and foreign key cascade rules verbatim.
3. **NEVER Skip UI States:** Every UI component and screen must handle all 5 states defined in \`05_DESIGN.md\` (Empty, Loading, Error, Partial, Populated).
4. **NEVER Implement Out-of-Scope Items:** Review the "Out-of-Scope" section in \`01_PRD.md\`. Any code attempting to implement those features is considered a defect.
5. **NEVER Truncate or Stub Code:** Write complete, working, deployable implementations with real error handling.
6. **STOP on Unresolved Placeholders:** Any \`[NOT SUPPLIED]\` marker means the owner has not given that fact. Do not infer it. Ask for it, and do not build the part that depends on it.
7. **Treat \`PROPOSED\` Decisions as Defaults:** ADRs marked \`PROPOSED\` in \`04_SDD.md\` are generator defaults. Use them only after the owner confirms or replaces them.
8. **Resolve Conflicts by Domain, Not by Guess:** Scope is decided by \`01_PRD.md\`, behavior by \`02_SRS.md\`, API contracts by \`04_SDD.md\`, data by \`03_ERD.md\`, UI by \`05_DESIGN.md\`. If two files disagree about the same thing, or the owning file is silent, stop and ask.
9. **Invent No Data:** Do not seed screens, tables, or examples with made-up customers, metrics, or testimonials. Empty states stay empty.

---

${full ? `## 2. Phased Implementation Roadmap

Follow this strictly sequential execution order:

\`\`\`
Phase 1: Persistence & Schema  ──>  Phase 2: Domain & Business Rules
               │                                   │
               ▼                                   ▼
Phase 3: API & Auth Gateway    ──>  Phase 4: Frontend & UI States
               │                                   │
               └───────────────┬───────────────────┘
                               ▼
            Phase 5: E2E Traceability Verification
\`\`\`

### Phase 1: Database Setup & Schema Migrations
* Reference: \`03_ERD.md\`
* Action Items:
  1. Generate SQL migration files or ORM schema matching \`03_ERD.md\` table dictionary.
  2. Apply primary keys, foreign keys, unique constraints, and explicit indexes.
  3. Load test seed fixtures.
  4. Run validation queries to confirm schema integrity.

### Phase 2: Domain Layer & Unit Testing (BDD)
* Reference: \`01_PRD.md\` & \`02_SRS.md\`
* Action Items:
  1. Implement domain entity classes/types and pure business logic functions.
  2. Implement input validation schemas (Zod/Valibot) matching the parameter boundaries.
  3. Write unit tests executing all Gherkin scenarios defined in \`01_PRD.md\`.

### Phase 3: API Layer, Authentication & Middleware
* Reference: \`04_SDD.md\`
* Action Items:
  1. Implement route handlers matching the exact HTTP methods, paths, and status codes.
  2. Attach auth guards, role checks, and rate-limiting middleware.
  3. Implement RFC 7807 error handler ensuring structured JSON on failures.
  4. Write integration tests for every route using ${testing}.

### Phase 4: Frontend Architecture & 5-State Screens
* Reference: \`05_DESIGN.md\`
* Action Items:
  1. Configure design tokens (CSS variables, Tailwind colors, typography scale).
  2. Build atomic UI components (\`Button\`, \`InputField\`, \`DataGrid\`, \`Skeleton\`).
  3. Build full screen layouts matching the route paths.
  4. Implement all 5 states: Empty State, Loading Skeleton, Error Banner with Retry, Partial offline state, and Populated view.
  5. Follow the Anti-Slop Rules in section 5 of \`05_DESIGN.md\` (UI and copy). Replace the placeholder accent color with the product's brand color.

### Phase 5: Traceability & Acceptance Verification
* Reference: \`06_TRACEABILITY_MATRIX.md\`
* Action Items:
  1. Cross-check the Traceability Matrix checklist.
  2. Execute end-to-end tests covering each user journey.
  3. Ensure zero compiler warnings and zero unhandled Promise rejections.

---

` : "## 2. Implementation Order\nPersistence (`03_ERD.md`), then domain rules and tests (`01_PRD.md`, `02_SRS.md`), then API and auth (`04_SDD.md`), then UI states (`05_DESIGN.md`), then check `06_TRACEABILITY_MATRIX.md`. Finish each step before starting the next.\n\n---\n\n"}## 3. Directory Blueprint Reference Map

| File | Purpose | Authoritative For |
| :--- | :--- | :--- |
| **\`01_PRD.md\`** | Product Requirements | Scope boundaries, user personas, MoSCoW priorities, Gherkin scenarios |
| **\`02_SRS.md\`** | Technical Specs | Functional requirements, performance SLAs, OWASP security, RFC 7807 errors |
| **\`03_ERD.md\`** | Data Model | Table dictionary, types, foreign key constraints, indexes, DDL migration |
| **\`04_SDD.md\`** | System Architecture | C4 diagrams, REST API contracts, sequence diagrams, ADR decisions |
| **\`05_DESIGN.md\`** | UI/UX Specs | Color tokens, typography, atomic components, screen wireframes, 5-state matrices |
| **\`06_TRACEABILITY_MATRIX.md\`** | Verification Matrix | Unbroken link between PRD, SRS, SDD, ERD, and UI |

---
Start with Phase 1. Before writing code, list every \`[NOT SUPPLIED]\` marker and \`PROPOSED\` decision in this directory and ask the owner to resolve them.
`;
}

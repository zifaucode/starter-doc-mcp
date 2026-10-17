import { BlueprintProject, ApiEndpoint } from "../types/blueprint.js";

export function generateSdd(project: BlueprintProject): string {
  const dateStr = new Date().toISOString().split("T")[0];
  const endpoints = project.apiEndpoints || getDefaultEndpoints(project);
  const tech = project.techStack || {};
  const full = project.detail !== "lite";
  const cache = tech.cacheQueue || "Redis";
  const projectText = JSON.stringify(project);
  const hasPayments = /stripe|payment|billing|subscription/i.test(projectText);
  const hasEmail = /email|invitation|notification/i.test(projectText);

  return `# Software Design Document (SDD)
## Project: ${project.projectName}
**Architecture Pattern:** Modular Monolith with Clean / Hexagonal Layering  
**Version:** 1.0.0-GA  
**Date:** ${dateStr}  
**Classification:** Definitive System Design Contract  

---

${full ? `## 1. Architecture & Topology

### 1.1 High-Level Architecture Overview
The system employs a modular layered architecture separating presentation, domain business rules, and persistence infrastructure. This eliminates tight coupling, ensures unit-testability, and prevents leaky abstractions.

\`\`\`
┌────────────────────────────────────────────────────────┐
│                   PRESENTATION LAYER                   │
│   Web Frontend (React / Next.js) | REST API Gateway    │
└───────────────────────────┬────────────────────────────┘
                            │ (DTOs / Request Payloads)
┌───────────────────────────▼────────────────────────────┐
│                    APPLICATION LAYER                   │
│   Use-Cases, Auth Guards, Rate Limiters, Validators    │
└───────────────────────────┬────────────────────────────┘
                            │ (Domain Models & Ports)
┌───────────────────────────▼────────────────────────────┐
│                      DOMAIN LAYER                      │
│     Pure Business Entities, Value Objects, Policies    │
└───────────────────────────▲────────────────────────────┘
                            │ (Implements Ports)
┌───────────────────────────┴────────────────────────────┐
│                 INFRASTRUCTURE LAYER                   │
│   Database (ORM), Cache, Queue Workers, Gateways       │
└────────────────────────────────────────────────────────┘
\`\`\`

---

## 2. C4 Architecture Diagrams (Mermaid)

### 2.1 Level 1: System Context Diagram
\`\`\`mermaid
flowchart TD
  User["End User / Client"]
  System["${project.projectName} System"]
  AuthService["Identity / Auth Provider${tech.auth ? ` (${tech.auth})` : ""}"]${hasPayments ? `
  PaymentGateway["Payment Gateway"]` : ""}${hasEmail ? `
  EmailGateway["Email Service"]` : ""}

  User -->|"Interacts via HTTPS/Browser"| System
  System -->|"Verifies credentials / OAuth"| AuthService${hasPayments ? `
  System -->|"Processes transactions"| PaymentGateway` : ""}${hasEmail ? `
  System -->|"Dispatches transactional emails"| EmailGateway` : ""}
\`\`\`

### 2.2 Level 2: Container Diagram
\`\`\`mermaid
flowchart TD
  subgraph ClientEnv ["Client Tier"]
    SPA["Web App (${tech.frontend || "Next.js / React"})"]
  end

  subgraph ServerEnv ["Application Infrastructure Tier"]
    API["API Service (${tech.backend || "Node.js / Fastify"})"]
    Worker["Background Job Worker"]
    DB[("Relational DB (${tech.database || "PostgreSQL"})")]
    Cache[("In-Memory Cache & Message Broker (${cache})")]
  end

  SPA -->|"REST API / JSON"| API
  API -->|"Read/Write Queries"| DB
  API -->|"Session / Rate Limits"| Cache
  API -->|"Enqueues asynchronous tasks"| Cache
  Worker -->|"Pulls jobs from queue"| Cache
  Worker -->|"Executes batch DB operations"| DB
\`\`\`

---

` : ""}## 3. Exhaustive API Interface Specifications
${project.apiEndpoints ? "" : "\n> [NOT SUPPLIED] No endpoints were provided. The three below are generic placeholders (session, list, create). Replace them with this product's real endpoints before implementation.\n"}
${endpoints.map((ep, idx) => {
  const authNote = ep.authRequired ? `Required (Roles: \`${(ep.rolesAllowed || ["AUTHENTICATED_USER"]).join(", ")}\`)` : "Public (No Auth)";

  return `### 3.${idx + 1} \`${ep.method} ${ep.path}\`
**Summary:** ${ep.summary}  
**Authentication:** ${authNote}  
**Rate Limit Ceiling:** \`${ep.rateLimit || "60 req/min per IP"}\`

#### Request Payload Schema:
\`\`\`json
${JSON.stringify(ep.requestBodySchema || { note: "No body required or url query params only" }, null, 2)}
\`\`\`

#### Success Response Schema (HTTP 200 / 201):
\`\`\`json
${JSON.stringify({ status: "success", data: ep.responseBodySchema || { id: "uuid", message: "Operation completed successfully" }, timestamp: "ISO-8601" }, null, 2)}
\`\`\`

#### Error Responses Matrix:
| HTTP Status | Error Code | Detail Message |
| :--- | :--- | :--- |
${(ep.errorResponses && ep.errorResponses.length > 0)
  ? ep.errorResponses.map(err => `| \`${err.status}\` | \`${err.code}\` | ${err.message} |`).join("\n")
  : `| \`400\` | \`BAD_REQUEST\` | Invalid payload format (malformed JSON) |
| \`401\` | \`UNAUTHORIZED\` | Missing or expired token (auth header absent) |
| \`403\` | \`FORBIDDEN\` | Access denied (role unauthorized) |
| \`422\` | \`UNPROCESSABLE_ENTITY\` | Validation failed (field length or pattern) |
| \`500\` | \`INTERNAL_ERROR\` | Unexpected server condition (unhandled runtime exception) |`
}
`;
}).join("\n---\n\n")}

---

${full ? `## 4. Sequence Diagram: Primary Core Flow

\`\`\`mermaid
sequenceDiagram
  autonumber
  actor User as Client / User
  participant API as API Server
  participant Auth as Auth & RBAC Guard
  participant DB as Database
  participant Queue as Queue (${cache})

  User->>API: POST /api/v1/resource (with Bearer Token & Payload)
  API->>Auth: Validate JWT Signature & Claims
  alt Invalid Token
    Auth-->>API: Token Expired / Invalid
    API-->>User: 401 Unauthorized
  else Token Valid
    Auth-->>API: Authorized User Context
    API->>API: Validate Zod Payload Schema
    alt Validation Fails
      API-->>User: 422 Unprocessable Entity
    else Schema Valid
      API->>DB: BEGIN Transaction; INSERT record
      DB-->>API: Commit OK (record ID returned)
      API->>Queue: Push Async Event (Job Queued)
      API-->>User: 201 Created (with Resource Representation)
    end
  end
\`\`\`

---

` : ""}## 5. Architectural Decision Records (ADR)
These are default decisions proposed by the generator. Each stays \`PROPOSED\` until a human accepts or replaces it.

### ADR-001: Modular Monolith vs Microservices
* **Status:** \`PROPOSED\`
* **Context:** The system requires maximum development velocity, atomic transactions, and zero distributed-network latency overhead during v1.0.
* **Decision:** Build as a strictly structured Modular Monolith with explicit boundary modules.
* **Consequences:** Simple single-repo deployment; enforces clean domain imports; can be partitioned into microservices if specific domains exceed scaling thresholds.

### ADR-002: Authentication & Token Lifecycle Strategy
* **Status:** \`PROPOSED\`
* **Context:** Preventing token leakage via XSS while supporting mobile and external API consumers.
* **Decision:** Use HttpOnly, Secure, SameSite=Lax cookies for browser web sessions; use short-lived JWTs (15 min) + Refresh Token rotation (7 days) with database-backed revocation lists.
* **Consequences:** Immune to document.cookie script injection; revoking access takes effect within 15 minutes or immediately via token blacklist.

### ADR-003: Idempotent Mutation Handling
* **Status:** \`PROPOSED\`
* **Context:** Network glitches can cause double-submission of critical mutating operations.
* **Decision:** Mutation endpoints accept an optional \`Idempotency-Key\` UUID header. Keys are stored in ${cache} with a 24-hour TTL mapped to the completed response.
* **Consequences:** Re-sent requests receive identical cached responses without duplicate side effects.

---
*End of SDD. Proceed to \`05_DESIGN.md\` for UI/UX specifications, design tokens, and screen states.*
`;
}

function getDefaultEndpoints(project: BlueprintProject): ApiEndpoint[] {
  return [
    {
      method: "POST",
      path: "/api/v1/auth/session",
      summary: "Authenticate user and establish session cookie",
      authRequired: false,
      rateLimit: "5 requests / minute",
      requestBodySchema: { email: "user@example.com", password: "SecurePassword123!" },
      responseBodySchema: { userId: "UUID", role: "USER", tokenExpiresAt: "ISO-8601" },
      errorResponses: [
        { status: 401, code: "INVALID_CREDENTIALS", message: "Email or password does not match." },
        { status: 429, code: "TOO_MANY_ATTEMPTS", message: "Rate limit reached. Try again in 60s." }
      ]
    },
    {
      method: "GET",
      path: "/api/v1/resources",
      summary: "List resources with pagination and query filter",
      authRequired: true,
      rolesAllowed: ["USER", "ADMIN"],
      rateLimit: "100 requests / minute",
      responseBodySchema: {
        items: [{ id: "UUID", name: "Resource Alpha", createdAt: "ISO-8601" }],
        page: 1,
        limit: 20,
        total: 1
      },
      errorResponses: [
        { status: 401, code: "UNAUTHORIZED", message: "Token missing or invalid." }
      ]
    },
    {
      method: "POST",
      path: "/api/v1/resources",
      summary: "Create a new resource record",
      authRequired: true,
      rolesAllowed: ["USER", "ADMIN"],
      rateLimit: "30 requests / minute",
      requestBodySchema: { name: "string (min 3, max 100)", description: "string (optional)" },
      responseBodySchema: { id: "UUID", name: "string", createdAt: "ISO-8601" },
      errorResponses: [
        { status: 400, code: "MALFORMED_JSON", message: "Invalid JSON format." },
        { status: 422, code: "VALIDATION_FAILED", message: "Name must be at least 3 characters." }
      ]
    }
  ];
}

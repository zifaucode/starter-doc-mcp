import { BlueprintProject } from "../types/blueprint.js";

export function generateSrs(project: BlueprintProject): string {
  const dateStr = new Date().toISOString().split("T")[0];
  const features = project.keyFeatures || [];
  const nfr = project.nfr || {};
  const tech = project.techStack || {};
  const db = tech.database || "PostgreSQL 16+";
  const cache = tech.cacheQueue || "Redis 7.2+";
  const tenanted = (project.entities || []).some(e => /tenant/i.test(e.name));
  const full = project.detail !== "lite";

  return `# Software Requirements Specification (SRS)
## Project: ${project.projectName}
**Standard:** ISO/IEC/IEEE 29148 / IEEE 830-1998 Format  
**Version:** 1.0.0-PROD  
**Date:** ${dateStr}  
**Classification:** Technical Contract for Autonomous Agents & Engineers  

---

## 1. Introduction

### 1.1 Purpose
This document specifies the complete software requirements for the implementation of **${project.projectName}**. It serves as an authoritative technical contract governing functional logic, system boundaries, non-functional constraints, and interface specifications. Any implementation behavior deviating from this specification is classified as a defect.

### 1.2 System Scope
The software system provides:
${project.description}

${full ? `### 1.3 Definitions, Acronyms, and Abbreviations
* **FR:** Functional Requirement
* **NFR:** Non-Functional Requirement
* **Idempotency:** Property of certain operations whereby they can be applied multiple times without changing the result beyond the initial application.
* **RBAC:** Role-Based Access Control
* **JWT:** JSON Web Token
* **RPO / RTO:** Recovery Point Objective / Recovery Time Objective
* **BR:** Business Rule, numbered per functional requirement (e.g. \`SRS-FR-001-BR-01\`)

` : ""}### 1.4 Out of Scope
${(project.outOfScope && project.outOfScope.length > 0)
  ? project.outOfScope.map(item => `* ${item}`).join("\n")
  : "* No exclusions were supplied. See `01_PRD.md` section 2.2 (Strict Out-of-Scope) for the authoritative list."}
Behavior in these areas is not specified here. An implementation must not add it.

---

## 2. Overall Description

### 2.1 Product Perspective
The system operates as a distributed web application utilizing modern decoupled frontend and backend services backed by relational persistence, caching layers, and external service gateways.
${full ? `
\`\`\`
[ Client / Browser ] ──HTTPS──> [ API Gateway / Reverse Proxy ]
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
                 [ App Service ]              [ Background Worker ]
                         │                             │
                 ┌───────┴───────┐                     ▼
                 ▼               ▼              [ Queue / Cache ]
          [ Database ]      [ Cache ]
\`\`\`
` : ""}
### 2.2 Operating Environment
* **Platform:** ${tech.infrastructure || "Containerized Linux (Node.js runtime / LTS) (default, confirm)"}
* **Storage Engine:** Relational Database (${db})${tech.database ? "" : " (default, confirm)"}
* **In-Memory Store:** ${cache} for rate limiting, session cache, and job queues.${tech.cacheQueue ? "" : " (default, confirm)"}${tech.backend ? `\n* **Backend:** ${tech.backend}` : ""}${tech.frontend ? `\n* **Frontend:** ${tech.frontend}` : ""}${tech.auth ? `\n* **Authentication:** ${tech.auth}` : ""}

---

## 3. Specific Functional Requirements (FR)

### 3.0 Common Rules (apply to every FR below)
Stated once here so each FR lists only what is specific to it. A feature-specific rule that conflicts with a common rule wins, and must say so.

#### 3.0.1 Pre-Conditions
1. The client must supply a valid authentication token via \`Authorization: Bearer <token>\` or secure HttpOnly cookie.
2. The user identity associated with the session must hold authorized role privileges.
3. The underlying database connection pool must be in a healthy state.

#### 3.0.2 Execution Pipeline
1. **Validation Gate:** System verifies all input fields against rigid type constraints and regex patterns. Failures abort immediately with HTTP 422.
2. **Authorization Enforcement:** System validates which records the user may access${tenanted ? " (tenant boundary)" : ""} and the action permissions. Unauthorized requests are aborted with HTTP 403.
3. **Transactional Boundary:** Core mutation logic is executed within an ACID database transaction.
4. **Idempotency Check:** If client provides an \`Idempotency-Key\` header, repeated identical requests return the cached response without re-executing mutations.
5. **State Commitment:** Database records are updated, audit log records are written, and external events are dispatched to the message bus.

#### 3.0.3 Common Exception & Error Matrix
| Trigger Condition | Error Code | HTTP Status | System Response |
| :--- | :--- | :--- | :--- |
| Missing / Malformed fields | \`VALIDATION_ERROR\` | \`422 Unprocessable\` | Returns field-level validation errors array. |
| Invalid / Expired Token | \`AUTHENTICATION_FAILED\` | \`401 Unauthorized\` | Aborts processing; clears invalid session. |
| Inadequate Role Permission | \`FORBIDDEN_ACCESS\` | \`403 Forbidden\` | Logs security warning; rejects request. |
| Record Not Found | \`RESOURCE_NOT_FOUND\` | \`404 Not Found\` | Returns standardized error envelope. |
| Concurrency Conflict (mutations only) | \`VERSION_CONFLICT\` | \`409 Conflict\` | Rolls back transaction; suggests client retry. |
| Unhandled Server Error | \`INTERNAL_SERVER_ERROR\` | \`500 Internal Error\` | Hides stack trace from client; alerts Sentry/APM. |

---

${features.length === 0 ? "[NOT SUPPLIED] No features were provided, so no functional requirements can be specified. Supply `keyFeatures` before implementation.\n\n" : ""}${features.map((f, idx) => {
  const frId = `SRS-FR-${String(idx + 1).padStart(3, "0")}`;
  const prdId = f.id || `PRD-F0${idx + 1}`;
  const scenarios = f.gherkinScenarios || [];

  return `### 3.${idx + 1} [${frId}] ${f.name}
* **Cross-Reference:** Implements \`${prdId}\`
* **Priority:** \`${f.priority || "Must"}\`
* **Description:** ${f.description}

#### 3.${idx + 1}.1 Input Specification
${f.inputs && f.inputs.length > 0
  ? f.inputs.map(i => `* \`${i}\``).join("\n")
  : `* Request Header: \`Content-Type: application/json\`\n* JSON Payload matching schema validation rules.`}

#### 3.${idx + 1}.2 Business Rules
${f.businessRules && f.businessRules.length > 0
  ? f.businessRules.map((r, i) => `* **${frId}-BR-${String(i + 1).padStart(2, "0")}:** ${r}`).join("\n")
  : "* No feature-specific rules were supplied. Only section 3.0 applies."}

#### 3.${idx + 1}.3 Output Specification
${f.outputs && f.outputs.length > 0
  ? f.outputs.map(o => `* \`${o}\``).join("\n")
  : `* HTTP Status 200 OK or 201 Created with JSON envelope containing \`data\`, \`timestamp\`, and \`requestId\`.`}

#### 3.${idx + 1}.4 Verification
${scenarios.length > 0
  ? scenarios.map(s => `* Acceptance scenario \`${s.scenario}\` in \`01_PRD.md\` (${prdId}).`).join("\n")
  : `* Acceptance scenarios \`Standard happy path execution for ${f.name}\` and \`Validation failure with malformed inputs\` in \`01_PRD.md\` (${prdId}).`}
`;
}).join("\n---\n\n")}

---

## 4. Non-Functional Requirements (NFR)

### 4.1 Performance & Latency (SRS-NFR-001)
* **P95 Response Latency:** The system must respond within **${nfr.latencyP95Ms || 150}ms** for all read requests under nominal load.
* **P99 Response Latency:** The system must respond within **${nfr.latencyP99Ms || 400}ms** for all mutation endpoints.
* **Throughput Capacity:** Support minimum **${nfr.maxRps || 1000} requests/second** sustained without degradation.
* **Database Query Timeout:** Hard ceiling of 3,000ms on all SQL transactions before automated cancellation to avoid pool starvation.

### 4.2 Security & Threat Mitigation (SRS-NFR-002)
* **OWASP Top 10 Compliance:**
  * **Injection Mitigation:** 100% of database queries must use prepared statements / parameterized bindings via ORM. Raw string interpolation in queries is strictly prohibited.
  * **Cross-Site Scripting (XSS):** Context-aware HTML sanitization on all user-supplied text inputs.
  * **Cross-Site Request Forgery (CSRF):** SameSite=Lax/Strict cookie configuration with custom anti-CSRF token verification on mutation endpoints.
* **Encryption Standards:**
  * **In-Transit:** Mandatory TLS 1.3 for all external and internal microservice communication.
  * **At-Rest:** AES-256-GCM encryption for database storage volumes, backups, and sensitive configuration secrets.
  * **Password Storage:** Passwords hashed using Argon2id or bcrypt (work factor 12+).
* **Rate Limiting:** IP and Token-based sliding window rate limits enforced in ${cache} (default: 100 req/min for authenticated, 20 req/min for public endpoints; per-endpoint limits in \`04_SDD.md\` override the default).${nfr.securityStandards && nfr.securityStandards.length > 0 ? `\n* **Required Standards:** ${nfr.securityStandards.join(", ")}` : ""}

### 4.3 Availability & Fault Tolerance (SRS-NFR-003)
* **Uptime Target:** **${nfr.uptimeSla || "99.95%"}** availability excluding scheduled maintenance windows.
* **Recovery Point Objective (RPO):** Maximum **${nfr.rpoHours || 1} hour(s)** of data loss in catastrophic disaster scenarios (enforced via continuous transaction-log archiving on ${db}).
* **Recovery Time Objective (RTO):** Maximum **${nfr.rtoHours || 2} hour(s)** to restore production service.
* **Graceful Degradation:** When secondary dependencies (e.g. notification service, analytics) are unreachable, core user transactions must still succeed.

### 4.4 Auditability & Compliance (SRS-NFR-004)
* All mutation actions (CREATE, UPDATE, DELETE) must emit an immutable audit log containing:
  \`{ timestamp, actorId, ${tenanted ? "tenantId, " : ""}action, resourceType, resourceId, ipAddress, diff }\`.
* Personally Identifiable Information (PII) must be masked in application logs (regex redaction for emails, phone numbers, credit cards).

---

${full ? `## 5. External Interface Requirements

### 5.1 Communication Protocols
* **RESTful HTTP/JSON:** Primary communication protocol following RFC 7807 for error representations.
* **WebSockets / Server-Sent Events (SSE):** Used for real-time notifications and streaming event pushes.

### 5.2 Error Response Standard (RFC 7807)
All error responses must strictly conform to the following JSON structure:
\`\`\`json
{
  "type": "https://api.system.local/errors/VALIDATION_ERROR",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "The payload failed validation checks.",
  "instance": "/api/v1/workspaces",
  "code": "VALIDATION_ERROR",
  "timestamp": "${dateStr}T12:00:00Z",
  "invalidParams": [
    {
      "name": "email",
      "reason": "Must be a valid RFC 5322 email address."
    }
  ]
}
\`\`\`
` : "## 5. Error Format\nAll errors follow RFC 7807 with the fields `type`, `title`, `status`, `detail`, `instance`, `code`, `timestamp`, and `invalidParams`.\n"}
---
*End of SRS. Proceed to \`03_ERD.md\` for relational data model and schema contracts.*
`;
}

import { AuditIssue, AuditResult } from "../types/blueprint.js";

const AMBIGUOUS_WORDS = [
  { word: "user-friendly", penalty: 5, tip: "Replace 'user-friendly' with concrete UX metrics like 'time-to-complete-task < 3 clicks' or WCAG compliance." },
  { word: "blazing fast", penalty: 6, tip: "Replace 'blazing fast' with explicit latency targets like 'P95 response time < 150ms'." },
  { word: "scalable", penalty: 4, tip: "Replace 'scalable' with explicit concurrency/RPS bounds like 'supports 2,000 req/sec sustained'." },
  { word: "seamless", penalty: 4, tip: "Replace 'seamless' with step-by-step state transition rules." },
  { word: "intuitive", penalty: 4, tip: "Specify exact UI layouts, visual affordances, and interaction patterns." },
  { word: "robust", penalty: 4, tip: "Specify concrete fault-tolerance, circuit-breaker timeout, and retry policies." },
  { word: "as soon as possible", penalty: 5, tip: "Specify an explicit SLA in milliseconds or seconds." },
  { word: "etc.", penalty: 5, tip: "Enumerate all cases explicitly. AI agents cannot guess what 'etc.' implies." },
  { word: "and so on", penalty: 4, tip: "Enumerate all cases explicitly. AI agents cannot guess what 'and so on' implies." }
];

// Empty-claim wording: sounds impressive, specifies nothing, and gives an agent nothing to build or test.
const EMPTY_CLAIMS = [
  "unlock", "elevate", "empower", "game-changer", "cutting-edge", "revolutionary", "next level",
  "world-class", "industry-leading", "trusted by thousands", "experts say"
];

export function auditMarkdownSpec(content: string): AuditResult {
  const issues: AuditIssue[] = [];
  const strengths: string[] = [];
  let score = 100;

  // 1. Audit Ambiguous Buzzwords
  for (const item of AMBIGUOUS_WORDS) {
    // Lookarounds instead of \b: a trailing "." (as in "etc.") has no word boundary after it.
    const regex = new RegExp(`(?<![\\w-])${item.word.replace(".", "\\.")}(?![\\w-])`, "gi");
    const matches = content.match(regex);
    if (matches && matches.length > 0) {
      const deduction = Math.min(item.penalty * matches.length, item.penalty * 3);
      score -= deduction;
      issues.push({
        severity: "HIGH",
        category: "AMBIGUITY",
        description: `Found ambiguous phrase "${item.word}" (${matches.length} occurrence${matches.length > 1 ? "s" : ""}) without quantifiable metrics.`,
        recommendation: item.tip,
        snippet: `Occurrences found: ${matches.length}`
      });
    }
  }

  // 2. Audit Error Handling Matrix
  const hasErrorCodes = /\b(400|401|403|404|409|422|429|500)\b|errorResponses/i.test(content);
  if (!hasErrorCodes) {
    score -= 20;
    issues.push({
      severity: "CRITICAL",
      category: "MISSING_ERROR_HANDLING",
      description: "Specification lacks explicit HTTP error status codes (400, 401, 403, 422, 500) and failure schemas.",
      recommendation: "Define a structured error matrix (RFC 7807) detailing what status code and payload is returned on each failure condition."
    });
  } else {
    strengths.push("Explicit error handling codes and exception matrix are present.");
  }

  // 3. Audit BDD / Acceptance Criteria
  // Full Given/When/Then steps at line start; the words alone appear in ordinary prose.
  const hasGherkin = ["given", "when", "then"].every(step => new RegExp(`^\\s*${step}\\s`, "im").test(content));
  if (!hasGherkin) {
    score -= 15;
    issues.push({
      severity: "HIGH",
      category: "TESTABILITY",
      description: "No BDD / Gherkin acceptance criteria (Given/When/Then) found.",
      recommendation: "Provide concrete Given-When-Then scenarios so coding agents can generate reliable automated unit/e2e test suites."
    });
  } else {
    strengths.push("Gherkin BDD / acceptance test criteria detected.");
  }

  // 4. Audit Data Types and Constraints
  const hasTypes = /\b(uuid|varchar|timestamptz|foreign key|primary key|not null)\b/i.test(content);
  if (!hasTypes) {
    score -= 15;
    issues.push({
      severity: "HIGH",
      category: "DATA_INTEGRITY",
      description: "Missing explicit database data types (e.g. UUID, VARCHAR, TIMESTAMPTZ) and integrity constraints.",
      recommendation: "Enforce exact column types, NULL/NOT NULL declarations, and foreign key cascade behaviors."
    });
  } else {
    strengths.push("Concrete relational data types and key constraints specified.");
  }

  // 5. Audit UI Edge States
  // Only documents that specify screens are held to the UI state rule.
  const mentionsUi = /\b(screens?|wireframes?|ui)\b/i.test(content);
  if (mentionsUi) {
    const hasEmptyState = /empty state|zero-data|no records/i.test(content);
    const hasLoadingState = /loading state|skeleton|shimmer|spinner/i.test(content);
    const hasErrorState = /error state|retry button|alert panel/i.test(content);

    if (!hasEmptyState || !hasLoadingState || !hasErrorState) {
      score -= 15;
      const missingStates = [
        !hasEmptyState ? "Empty State" : null,
        !hasLoadingState ? "Loading State" : null,
        !hasErrorState ? "Error State" : null
      ].filter(Boolean);

      issues.push({
        severity: "HIGH",
        category: "UI_EDGE_CASES",
        description: `Frontend specifications are missing critical edge states: ${missingStates.join(", ")}.`,
        recommendation: "Implement the 5-State UI Matrix (Empty, Loading, Error, Partial, Populated) for all views."
      });
    } else {
      strengths.push("Comprehensive 5-state UI matrices defined (Empty, Loading, Error, Populated).");
    }
  }

  // 6. Audit Scope Boundaries
  const hasOutOfScope = /out-of-scope|non-goals|boundaries/i.test(content);
  if (!hasOutOfScope) {
    score -= 10;
    issues.push({
      severity: "MEDIUM",
      category: "AMBIGUITY",
      description: "No explicit 'Out-of-Scope' (Non-Goals) boundary defined.",
      recommendation: "Clearly list what the application will NOT do to prevent autonomous agent scope creep."
    });
  } else {
    strengths.push("Explicit Out-of-Scope boundary guardrails prevent agent scope creep.");
  }

  // 7. Audit empty claims, em dashes, and emoji (they pad the text and give an agent nothing to build or test)
  // Words quoted in `code spans` are being named (e.g. a banned-word list), not used.
  const prose = content.replace(/`[^`]*`/g, "");
  const claims = EMPTY_CLAIMS.filter(w => new RegExp(`(?<![\\w-])${w}(?![\\w-])`, "i").test(prose));
  const emDashes = (content.match(/—/g) || []).length;
  const emoji = (content.match(/\p{Extended_Pictographic}/gu) || []).length;
  if (claims.length > 0 || emDashes > 0 || emoji > 0) {
    score -= Math.min(3 * claims.length + (emDashes > 0 ? 2 : 0) + (emoji > 0 ? 2 : 0), 10);
    issues.push({
      severity: "MEDIUM",
      category: "WRITING_QUALITY",
      description: [
        claims.length > 0 ? `empty-claim wording (${claims.join(", ")})` : null,
        emDashes > 0 ? `${emDashes} em dash${emDashes > 1 ? "es" : ""}` : null,
        emoji > 0 ? `${emoji} emoji` : null
      ].filter(Boolean).join("; ").replace(/^./, c => `Found ${c}`) + ".",
      recommendation: "Replace claims with a measurable statement or cut them. Use a period, comma, or colon instead of an em dash. Remove emoji."
    });
  }

  // 8. Audit unresolved placeholders left by the generator
  const placeholders = (prose.match(/\[NOT SUPPLIED\]/g) || []).length;
  if (placeholders > 0) {
    score -= Math.min(2 * placeholders, 8);
    issues.push({
      severity: "MEDIUM",
      category: "AMBIGUITY",
      description: `${placeholders} unresolved [NOT SUPPLIED] placeholder${placeholders > 1 ? "s" : ""}.`,
      recommendation: "Supply the real value (problem statement, personas, and so on) before an agent implements from this document."
    });
  }

  // Normalize score
  score = Math.max(0, Math.min(100, score));

  const criticalCount = issues.filter(i => i.severity === "CRITICAL").length;
  const highCount = issues.filter(i => i.severity === "HIGH").length;

  let status: "PASSED" | "WARNING" | "FAILED" = "PASSED";
  let antiHallucinationVerdict = "SAFE FOR AGENT EXECUTION: The document contains sufficient deterministic boundaries, concrete types, and verifiable acceptance criteria.";

  if (score < 70 || criticalCount > 0) {
    status = "FAILED";
    antiHallucinationVerdict = "CRITICAL HAZARD: High risk of AI agent hallucination and scope drift. The document contains unspecified edge cases, loose types, or missing error boundaries. Resolve critical issues before execution.";
  } else if (score < 85 || highCount > 1) {
    status = "WARNING";
    antiHallucinationVerdict = "ACCEPTABLE WITH RESERVATIONS: Minor ambiguities detected. Agent may generate standard boilerplate for missing details.";
  }

  return {
    score,
    status,
    totalIssues: issues.length,
    criticalCount,
    highCount,
    issues,
    strengths,
    antiHallucinationVerdict
  };
}

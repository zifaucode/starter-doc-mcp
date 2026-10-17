export type Priority = "Must" | "Should" | "Could" | "Won't";

export interface GherkinScenario {
  scenario: string;
  given: string;
  when: string;
  then: string;
}

export interface FeatureInput {
  id?: string;
  name: string;
  description: string;
  priority?: Priority;
  inputs?: string[];
  outputs?: string[];
  businessRules?: string[];
  gherkinScenarios?: GherkinScenario[];
  // Traceability links, filled by the owner. Left empty, the matrix shows UNMAPPED instead of guessing.
  endpoints?: string[]; // "POST /api/v1/invoices" or just the path
  entities?: string[]; // table names
  screens?: string[]; // UiScreen ids
}

export interface EntityField {
  name: string;
  type: string;
  isPrimary?: boolean;
  isUnique?: boolean;
  isNullable?: boolean;
  defaultValue?: string;
  references?: string; // e.g. "users.id"
  description?: string;
}

export interface EntityDefinition {
  name: string;
  description: string;
  fields: EntityField[];
  indexes?: string[];
  cascadeRules?: string;
}

export interface ApiEndpoint {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  summary: string;
  authRequired: boolean;
  rolesAllowed?: string[];
  rateLimit?: string;
  requestBodySchema?: Record<string, any>;
  responseBodySchema?: Record<string, any>;
  errorResponses?: Array<{
    status: number;
    code: string;
    message: string;
  }>;
}

export interface UiScreen {
  id: string;
  name: string;
  route: string;
  description: string;
  components: string[];
  states: {
    emptyState: string;
    loadingState: string;
    errorState: string;
    successState: string;
  };
}

export interface TechStackConfig {
  frontend?: string;
  backend?: string;
  database?: "PostgreSQL" | "MySQL" | "SQLite" | "MongoDB";
  orm?: string;
  auth?: string;
  cacheQueue?: string;
  infrastructure?: string;
  testingFramework?: string;
}

export interface NfrConfig {
  latencyP95Ms?: number;
  latencyP99Ms?: number;
  maxRps?: number;
  uptimeSla?: string;
  rpoHours?: number;
  rtoHours?: number;
  securityStandards?: string[];
}

export interface BlueprintProject {
  projectName: string;
  tagline?: string;
  description: string;
  targetAudience?: string[];
  problemStatement?: string;
  keyFeatures: FeatureInput[];
  outOfScope?: string[];
  techStack?: TechStackConfig;
  entities?: EntityDefinition[];
  apiEndpoints?: ApiEndpoint[];
  uiScreens?: UiScreen[];
  nfr?: NfrConfig;
  outputDir?: string;
  templatePreset?: string;
  // "lite" leaves out diagrams, glossaries, and other reference material. Default "full".
  detail?: "lite" | "full";
}

export interface AuditIssue {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  category: "AMBIGUITY" | "MISSING_ERROR_HANDLING" | "DATA_INTEGRITY" | "SECURITY" | "TESTABILITY" | "UI_EDGE_CASES" | "WRITING_QUALITY";
  description: string;
  recommendation: string;
  snippet?: string;
}

export interface AuditResult {
  score: number; // 0 - 100
  status: "PASSED" | "WARNING" | "FAILED";
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  issues: AuditIssue[];
  strengths: string[];
  antiHallucinationVerdict: string;
}

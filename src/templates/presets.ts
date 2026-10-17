import { BlueprintProject } from "../types/blueprint.js";

export const BLUEPRINT_PRESETS: Record<string, Partial<BlueprintProject>> = {
  "saas-b2b": {
    projectName: "Enterprise SaaS Workspace",
    tagline: "Multi-tenant workspace platform with RBAC and subscription billing",
    description: "Production-grade multi-tenant B2B SaaS platform providing isolated workspace data, team member invitations with granular role-based access control (Owner, Admin, Member, Viewer), Stripe subscription tiers, API key management, and audit log tracking.",
    targetAudience: [
      "Engineering Leads requiring team coordination",
      "IT Administrators managing access controls and compliance",
      "Finance Officers needing automated invoice and subscription billing"
    ],
    problemStatement: "Fragmented team tools cause security audit failures, access sprawl, lack of billing transparency, and compliance liabilities in enterprise operations.",
    outOfScope: [
      "On-premise air-gapped installation (SaaS cloud only for v1.0)",
      "Native mobile applications (Web responsive SPA only for v1.0)",
      "Direct fiat bank transfer integrations (Stripe / LemonSqueezy only)"
    ],
    techStack: {
      frontend: "Next.js 15 (App Router, React 19, TypeScript)",
      backend: "Node.js with Fastify / Next.js Server Actions",
      database: "PostgreSQL",
      orm: "Prisma ORM or Drizzle ORM",
      auth: "NextAuth v5 / Auth.js with JWT in HttpOnly secure cookies & Session Table",
      cacheQueue: "Redis & BullMQ for asynchronous email & billing webhooks",
      infrastructure: "Docker containerized, deployed to AWS ECS / Vercel + Neon Postgres",
      testingFramework: "Vitest for unit tests, Playwright for e2e tests"
    },
    keyFeatures: [
      {
        id: "PRD-F01",
        name: "Multi-Tenant Workspace & Team Management",
        description: "Organization workspaces with member invitations and RBAC permission enforcement.",
        priority: "Must",
        endpoints: ["GET /api/v1/workspaces/:slug/members"],
        entities: ["tenants", "users", "tenant_memberships"],
        screens: ["UI-SCR-01", "UI-SCR-02"],
        inputs: ["workspaceName: string (min 3, max 50)", "inviteeEmail: string (valid email format)", "role: 'ADMIN' | 'MEMBER' | 'VIEWER'"],
        outputs: ["workspaceId: UUID", "invitationToken: string (expires in 72h)", "memberStatus: 'PENDING' | 'ACTIVE'"],
        businessRules: [
          "Workspace slug must be globally unique and alphanumeric with hyphens.",
          "Only workspace OWNER or ADMIN can invite new members.",
          "Removing a user immediately revokes all active session tokens for that workspace."
        ],
        gherkinScenarios: [
          {
            scenario: "Admin invites new team member successfully",
            given: "An authenticated user with role 'ADMIN' in workspace 'acme-corp'",
            when: "The user sends a POST request to '/api/workspaces/acme-corp/invitations' with valid email 'dev@example.com' and role 'MEMBER'",
            then: "A 201 Created status is returned, an invitation token is generated with 72h TTL, and an invitation email job is queued in Redis"
          },
          {
            scenario: "Non-admin member attempts to invite user",
            given: "An authenticated user with role 'VIEWER' in workspace 'acme-corp'",
            when: "The user sends a POST request to invite a team member",
            then: "A 403 Forbidden status is returned with error code 'INSUFFICIENT_PERMISSIONS'"
          }
        ]
      },
      {
        id: "PRD-F02",
        name: "Subscription Tier Billing & Stripe Metering",
        description: "Automated recurring billing, seat management, webhook synchronization, and payment failure handling.",
        priority: "Must",
        // No billing or webhook endpoint is defined in apiEndpoints below, so that link stays UNMAPPED on purpose.
        entities: ["tenants"],
        screens: ["UI-SCR-01"],
        inputs: ["priceId: string", "paymentMethodId: string", "seatsCount: integer (min 1)"],
        outputs: ["stripeSubscriptionId: string", "status: 'active' | 'past_due' | 'canceled'", "currentPeriodEnd: timestamp"],
        businessRules: [
          "Stripe webhook signatures must be cryptographically verified using STRIPE_WEBHOOK_SECRET before processing.",
          "Grace period of 3 days granted on payment failure before workspace degrades to READ-ONLY state.",
          "Seat count changes trigger prorated billing on the next billing invoice."
        ],
        gherkinScenarios: [
          {
            scenario: "Successful invoice payment webhook updates workspace status",
            given: "A valid Stripe webhook event 'invoice.payment_succeeded' with valid signature",
            when: "The webhook endpoint '/api/webhooks/stripe' processes the event payload",
            then: "Workspace subscription status is updated to 'ACTIVE', next billing date is extended, and HTTP 200 is acknowledged"
          }
        ]
      },
      {
        id: "PRD-F03",
        name: "Developer API Keys & Usage Rate Limiting",
        description: "Programmatic access via SHA-256 hashed API keys with sliding-window rate limiting.",
        priority: "Should",
        endpoints: ["POST /api/v1/workspaces/:slug/api-keys"],
        entities: ["api_keys"],
        screens: ["UI-SCR-01"],
        inputs: ["keyName: string", "scopes: string[]", "expiresAt: optional timestamp"],
        outputs: ["rawApiKey: string (displayed ONCE to user)", "keyPrefix: string (first 8 chars)", "keyHash: string"],
        businessRules: [
          "Raw API keys must never be stored in plain text; store SHA-256 hash only.",
          "Rate limit: 100 requests per minute per API key enforced via Redis sliding window counter.",
          "Revoked keys must return 401 Unauthorized immediately across all cluster nodes."
        ],
        gherkinScenarios: [
          {
            scenario: "API request exceeding rate limit is throttled",
            given: "An active API key that has made 100 requests within the past 60 seconds",
            when: "A 101st request is received within the same 60-second window",
            then: "A 429 Too Many Requests status is returned with 'Retry-After' header and error payload"
          }
        ]
      }
    ],
    entities: [
      {
        name: "tenants",
        description: "Primary workspace tenant boundary for data isolation.",
        fields: [
          { name: "id", type: "UUID", isPrimary: true, description: "System generated UUID v4" },
          { name: "name", type: "VARCHAR(100)", isNullable: false, description: "Workspace display name" },
          { name: "slug", type: "VARCHAR(60)", isUnique: true, isNullable: false, description: "URL-friendly unique identifier" },
          { name: "plan", type: "VARCHAR(30)", isNullable: false, defaultValue: "'FREE'", description: "FREE, PRO, ENTERPRISE" },
          { name: "stripe_customer_id", type: "VARCHAR(100)", isUnique: true, isNullable: true, description: "Stripe customer reference" },
          { name: "is_active", type: "BOOLEAN", isNullable: false, defaultValue: "TRUE", description: "Soft activation toggle" },
          { name: "created_at", type: "TIMESTAMPTZ", isNullable: false, defaultValue: "NOW()", description: "Creation timestamp" },
          { name: "updated_at", type: "TIMESTAMPTZ", isNullable: false, defaultValue: "NOW()", description: "Last modified timestamp" }
        ],
        indexes: ["CREATE UNIQUE INDEX idx_tenants_slug ON tenants(slug);", "CREATE INDEX idx_tenants_stripe ON tenants(stripe_customer_id);"]
      },
      {
        name: "users",
        description: "User identity and authentication profile.",
        fields: [
          { name: "id", type: "UUID", isPrimary: true, description: "Primary key" },
          { name: "email", type: "VARCHAR(255)", isUnique: true, isNullable: false, description: "Normalized lowercase email" },
          { name: "password_hash", type: "VARCHAR(255)", isNullable: false, description: "Argon2id password hash" },
          { name: "full_name", type: "VARCHAR(150)", isNullable: false, description: "User full name" },
          { name: "email_verified_at", type: "TIMESTAMPTZ", isNullable: true, description: "Verification timestamp" },
          { name: "created_at", type: "TIMESTAMPTZ", isNullable: false, defaultValue: "NOW()" },
          { name: "updated_at", type: "TIMESTAMPTZ", isNullable: false, defaultValue: "NOW()" }
        ],
        indexes: ["CREATE UNIQUE INDEX idx_users_email ON users(email);"]
      },
      {
        name: "tenant_memberships",
        description: "Many-to-many junction between users and tenants with assigned roles.",
        fields: [
          { name: "id", type: "UUID", isPrimary: true },
          { name: "tenant_id", type: "UUID", isNullable: false, references: "tenants.id", description: "Associated tenant" },
          { name: "user_id", type: "UUID", isNullable: false, references: "users.id", description: "Associated user" },
          { name: "role", type: "VARCHAR(30)", isNullable: false, defaultValue: "'MEMBER'", description: "OWNER, ADMIN, MEMBER, VIEWER" },
          { name: "created_at", type: "TIMESTAMPTZ", isNullable: false, defaultValue: "NOW()" }
        ],
        indexes: [
          "CREATE UNIQUE INDEX idx_tenant_user_unique ON tenant_memberships(tenant_id, user_id);",
          "CREATE INDEX idx_tenant_memberships_tenant ON tenant_memberships(tenant_id);"
        ],
        cascadeRules: "ON DELETE CASCADE on tenant_id, ON DELETE CASCADE on user_id"
      },
      {
        name: "api_keys",
        description: "Hashed API keys for programmatic tenant access.",
        fields: [
          { name: "id", type: "UUID", isPrimary: true },
          { name: "tenant_id", type: "UUID", isNullable: false, references: "tenants.id" },
          { name: "created_by_user_id", type: "UUID", isNullable: false, references: "users.id" },
          { name: "key_prefix", type: "VARCHAR(12)", isNullable: false, description: "First 8 chars for recognition" },
          { name: "key_hash", type: "VARCHAR(64)", isNullable: false, description: "SHA-256 hex digest" },
          { name: "name", type: "VARCHAR(100)", isNullable: false },
          { name: "last_used_at", type: "TIMESTAMPTZ", isNullable: true },
          { name: "revoked_at", type: "TIMESTAMPTZ", isNullable: true },
          { name: "created_at", type: "TIMESTAMPTZ", isNullable: false, defaultValue: "NOW()" }
        ],
        indexes: ["CREATE UNIQUE INDEX idx_api_keys_hash ON api_keys(key_hash);", "CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id);"]
      }
    ],
    apiEndpoints: [
      {
        method: "POST",
        path: "/api/v1/auth/login",
        summary: "User credential login returning secure HttpOnly session cookie",
        authRequired: false,
        rateLimit: "5 requests / minute per IP",
        requestBodySchema: {
          email: "string (email format, max 255)",
          password: "string (min 8 chars)"
        },
        responseBodySchema: {
          user: { id: "UUID", email: "string", fullName: "string" },
          currentTenant: { id: "UUID", name: "string", role: "string" }
        },
        errorResponses: [
          { status: 400, code: "VALIDATION_ERROR", message: "Invalid email or password format." },
          { status: 401, code: "INVALID_CREDENTIALS", message: "Email or password does not match records." },
          { status: 429, code: "RATE_LIMIT_EXCEEDED", message: "Too many login attempts. Retry after 60 seconds." }
        ]
      },
      {
        method: "GET",
        path: "/api/v1/workspaces/:slug/members",
        summary: "Retrieve list of team members in workspace",
        authRequired: true,
        rolesAllowed: ["OWNER", "ADMIN", "MEMBER", "VIEWER"],
        rateLimit: "100 requests / minute",
        responseBodySchema: {
          members: [
            { id: "UUID", userId: "UUID", fullName: "string", email: "string", role: "string", joinedAt: "ISO-8601" }
          ],
          total: "number"
        },
        errorResponses: [
          { status: 401, code: "UNAUTHORIZED", message: "Missing or expired session token." },
          { status: 403, code: "FORBIDDEN", message: "You are not a member of this workspace." },
          { status: 404, code: "WORKSPACE_NOT_FOUND", message: "Workspace slug does not exist." }
        ]
      },
      {
        method: "POST",
        path: "/api/v1/workspaces/:slug/api-keys",
        summary: "Generate a new hashed API key for the workspace",
        authRequired: true,
        rolesAllowed: ["OWNER", "ADMIN"],
        rateLimit: "10 requests / hour",
        requestBodySchema: {
          name: "string (min 3, max 60 chars)",
          scopes: ["string array"]
        },
        responseBodySchema: {
          apiKeyId: "UUID",
          name: "string",
          rawKey: "sk_live_abc123... (DISPLAYED ONCE ONLY)",
          keyPrefix: "sk_live_ab...",
          createdAt: "ISO-8601"
        },
        errorResponses: [
          { status: 400, code: "VALIDATION_ERROR", message: "API key name required." },
          { status: 403, code: "FORBIDDEN", message: "Requires OWNER or ADMIN role." }
        ]
      }
    ],
    uiScreens: [
      {
        id: "UI-SCR-01",
        name: "Workspace Overview Dashboard",
        route: "/dashboard/[workspaceSlug]",
        description: "Central command center displaying key business metrics, recent activities, and team health.",
        components: ["MetricCardsGrid", "ActivityTimeline", "QuickActionsMenu", "BillingWarningBanner"],
        states: {
          emptyState: "Renders 'No activity yet' card with CTA 'Invite Team Members' and 'Generate First API Key'.",
          loadingState: "Shimmer skeleton blocks mimicking 4 metric cards and 5 timeline entries.",
          errorState: "Error banner with 'Failed to load workspace data. [Retry Button]' and error code display.",
          successState: "Full dashboard populated with real-time stats, interactive charts, and recent activity log."
        }
      },
      {
        id: "UI-SCR-02",
        name: "Team & Permissions Settings",
        route: "/dashboard/[workspaceSlug]/settings/team",
        description: "Member management table, pending invitation drawer, and role modifier modal.",
        components: ["MemberTable", "InviteMemberModal", "RoleChangeDropdown", "RevokeAccessDialog"],
        states: {
          emptyState: "Displays single owner row with subtle tooltip 'You are the only member. Invite colleagues to collaborate.'",
          loadingState: "Table rows with animated grey skeleton pulses for avatar, name, email, and action buttons.",
          errorState: "Table replaces rows with centered alert box: 'Could not fetch team directory. Check network connection.'",
          successState: "Paginated list of active users, pending invite pills, and inline role modification selector."
        }
      }
    ],
    nfr: {
      latencyP95Ms: 150,
      latencyP99Ms: 400,
      maxRps: 1500,
      uptimeSla: "99.95%",
      rpoHours: 1,
      rtoHours: 2,
      securityStandards: ["OWASP Top 10 Compliant", "SOC2 Type II Readiness", "GDPR / CCPA Right to Deletion"]
    }
  },

  "ecommerce": {
    projectName: "Modern Headless E-Commerce Platform",
    tagline: "High-performance store with real-time inventory locking and payment reconciliation",
    description: "Enterprise e-commerce platform with catalog variants, atomic inventory reservations, multi-provider payment checkout, cart state preservation, and order fulfillment state machine.",
    targetAudience: [
      "Consumers searching for seamless multi-device shopping experience",
      "Store Administrators managing catalog, pricing, and stock levels",
      "Warehouse Operators executing fulfillment, pick-and-pack, and return processing"
    ],
    problemStatement: "Inventory race conditions cause overselling during flash sales, high cart abandonment from clumsy checkouts, and disconnected accounting reconciliations.",
    outOfScope: [
      "Physical in-store POS hardware integration (v1.0 is online storefront only)",
      "Multi-vendor marketplace split payouts (single merchant v1.0)"
    ],
    techStack: {
      frontend: "Next.js 15 with Server Components, Tailwind CSS, Zustand",
      backend: "Node.js / Express or NestJS with transactional PostgreSQL",
      database: "PostgreSQL",
      orm: "Prisma ORM",
      auth: "OAuth2 & Magic Link passwordless authentication",
      cacheQueue: "Redis for product caching & inventory atomic locks, BullMQ for order processing",
      infrastructure: "Cloudflare CDN edge caching, Kubernetes or AWS App Runner",
      testingFramework: "Vitest, Supertest for API tests, Playwright for checkout e2e"
    },
    keyFeatures: [
      {
        id: "PRD-F01",
        name: "Atomic Inventory Reservation & Checkout",
        description: "15-minute temporary inventory lock during checkout to prevent overselling.",
        priority: "Must",
        // This preset defines no endpoints or screens, so only the table link is known.
        entities: ["product_variants", "orders"],
        inputs: ["cartId: UUID", "shippingAddress: AddressObject", "paymentIntentId: string"],
        outputs: ["orderId: UUID", "orderNumber: string", "reservedUntil: timestamp", "status: 'PENDING_PAYMENT'"],
        businessRules: [
          "Inventory lock expires in exactly 900 seconds (15 minutes) if payment is not confirmed.",
          "Stock deduction must use PostgreSQL pessimistic row locking (`SELECT FOR UPDATE`) or Redis atomic `DECR`.",
          "Checkout cannot proceed if any item stock is less than requested quantity."
        ],
        gherkinScenarios: [
          {
            scenario: "Simultaneous checkouts on last remaining inventory item",
            given: "Product variant 'SHIRT-BLUE-M' has exactly 1 item in stock",
            when: "Customer A and Customer B attempt to place an order simultaneously",
            then: "Customer A succeeds with HTTP 201 and 15-minute lock; Customer B receives HTTP 409 Conflict with 'OUT_OF_STOCK'"
          }
        ]
      }
    ],
    entities: [
      {
        name: "products",
        description: "Store catalog items and master product metadata.",
        fields: [
          { name: "id", type: "UUID", isPrimary: true },
          { name: "title", type: "VARCHAR(255)", isNullable: false },
          { name: "slug", type: "VARCHAR(255)", isUnique: true, isNullable: false },
          { name: "description", type: "TEXT", isNullable: false },
          { name: "is_published", type: "BOOLEAN", isNullable: false, defaultValue: "FALSE" },
          { name: "created_at", type: "TIMESTAMPTZ", isNullable: false, defaultValue: "NOW()" }
        ],
        indexes: ["CREATE UNIQUE INDEX idx_products_slug ON products(slug);"]
      },
      {
        name: "product_variants",
        description: "Specific SKU variants (size, color, price, inventory).",
        fields: [
          { name: "id", type: "UUID", isPrimary: true },
          { name: "product_id", type: "UUID", isNullable: false, references: "products.id" },
          { name: "sku", type: "VARCHAR(100)", isUnique: true, isNullable: false },
          { name: "price_cents", type: "INTEGER", isNullable: false, description: "Price stored in integer cents" },
          { name: "stock_quantity", type: "INTEGER", isNullable: false, defaultValue: "0" },
          { name: "created_at", type: "TIMESTAMPTZ", isNullable: false, defaultValue: "NOW()" }
        ],
        indexes: ["CREATE UNIQUE INDEX idx_variants_sku ON product_variants(sku);", "CREATE INDEX idx_variants_product ON product_variants(product_id);"],
        cascadeRules: "ON DELETE CASCADE on product_id"
      },
      {
        name: "orders",
        description: "Customer orders and payment fulfillment lifecycle.",
        fields: [
          { name: "id", type: "UUID", isPrimary: true },
          { name: "order_number", type: "VARCHAR(50)", isUnique: true, isNullable: false },
          { name: "customer_email", type: "VARCHAR(255)", isNullable: false },
          { name: "total_amount_cents", type: "INTEGER", isNullable: false },
          { name: "status", type: "VARCHAR(30)", isNullable: false, defaultValue: "'PENDING_PAYMENT'" },
          { name: "payment_reference", type: "VARCHAR(150)", isNullable: true },
          { name: "created_at", type: "TIMESTAMPTZ", isNullable: false, defaultValue: "NOW()" }
        ],
        indexes: ["CREATE UNIQUE INDEX idx_orders_number ON orders(order_number);", "CREATE INDEX idx_orders_email ON orders(customer_email);"]
      }
    ],
    nfr: {
      latencyP95Ms: 120,
      latencyP99Ms: 300,
      maxRps: 3000,
      uptimeSla: "99.99%",
      rpoHours: 0.5,
      rtoHours: 1,
      securityStandards: ["PCI-DSS Level 1 Compliance (delegated via Stripe Elements)", "OWASP Top 10"]
    }
  },

  "ai-agent-platform": {
    projectName: "Autonomous AI Agent Orchestration Engine",
    tagline: "Deterministic multi-agent execution pipeline with sandboxing and tool routing",
    description: "Production platform for managing, chaining, and evaluating autonomous AI agents with strict token budgets, sandbox tool execution, step-by-step audit logs, and streaming completions.",
    targetAudience: [
      "AI Engineers creating automated agent pipelines",
      "Enterprise Teams automating multi-step customer workflows",
      "Compliance Officers monitoring agent safety and token consumption"
    ],
    problemStatement: "AI agents hallucinate, loop infinitely, consume uncontrolled API credits, and execute unsafe shell/database commands without deterministic guardrails.",
    outOfScope: [
      "Fine-tuning proprietary foundational models (orchestration layer only)",
      "Unrestricted raw system shell access without Docker sandbox"
    ],
    techStack: {
      frontend: "React 19 with Vite / Next.js, Tailwind CSS, Monaco Code Editor",
      backend: "Node.js (TypeScript) / Python FastAPI sidecar",
      database: "PostgreSQL",
      orm: "Drizzle ORM",
      auth: "API Key Authentication & JWT session",
      cacheQueue: "Redis pub/sub for SSE streaming, RabbitMQ/BullMQ for asynchronous agent runs",
      infrastructure: "PostgreSQL pgvector extension for embeddings; isolated Docker container sandboxes via gVisor or Firecracker",
      testingFramework: "Vitest, Pytest for model evals"
    },
    keyFeatures: [
      {
        id: "PRD-F01",
        name: "Sandbox Tool Execution Guardrail",
        description: "Executes agent-generated code or tools inside ephemeral isolated sandboxes with strict timeouts and memory limits.",
        priority: "Must",
        inputs: ["toolName: string", "toolArguments: object", "sandboxId: UUID", "maxExecutionTimeMs: number (max 30000)"],
        outputs: ["stdout: string", "stderr: string", "exitCode: integer", "executionDurationMs: integer"],
        businessRules: [
          "Sandbox must terminate immediately upon reaching timeout threshold.",
          "Network egress restricted to explicit allowlist domains.",
          "Zero access to host filesystem, environment secrets, or Docker socket."
        ],
        gherkinScenarios: [
          {
            scenario: "Agent tool attempts infinite loop",
            given: "An agent executing a script with 'while(true){}' in sandbox",
            when: "Execution exceeds the 10,000ms hard ceiling",
            then: "Sandbox supervisor issues SIGKILL, returns HTTP 408 Timeout, and logs security event"
          }
        ]
      }
    ],
    entities: [
      {
        name: "agent_workflows",
        description: "Workflow definition containing system instructions, tool bindings, and model parameters.",
        fields: [
          { name: "id", type: "UUID", isPrimary: true },
          { name: "name", type: "VARCHAR(150)", isNullable: false },
          { name: "model_provider", type: "VARCHAR(50)", isNullable: false, defaultValue: "'openai'" },
          { name: "model_name", type: "VARCHAR(100)", isNullable: false },
          { name: "max_budget_usd", type: "DECIMAL(10,4)", isNullable: false, defaultValue: "1.0000" },
          { name: "created_at", type: "TIMESTAMPTZ", isNullable: false, defaultValue: "NOW()" }
        ],
        indexes: ["CREATE INDEX idx_workflows_created ON agent_workflows(created_at);"]
      },
      {
        name: "agent_executions",
        description: "Execution run instance tracking token cost, duration, and status.",
        fields: [
          { name: "id", type: "UUID", isPrimary: true },
          { name: "workflow_id", type: "UUID", isNullable: false, references: "agent_workflows.id" },
          { name: "status", type: "VARCHAR(30)", isNullable: false, defaultValue: "'RUNNING'" },
          { name: "tokens_consumed", type: "INTEGER", isNullable: false, defaultValue: "0" },
          { name: "cost_usd", type: "DECIMAL(10,5)", isNullable: false, defaultValue: "0.00000" },
          { name: "error_message", type: "TEXT", isNullable: true },
          { name: "created_at", type: "TIMESTAMPTZ", isNullable: false, defaultValue: "NOW()" }
        ],
        indexes: ["CREATE INDEX idx_executions_workflow ON agent_executions(workflow_id);"],
        cascadeRules: "ON DELETE CASCADE on workflow_id"
      }
    ],
    nfr: {
      latencyP95Ms: 50, // routing latency excluding LLM wait
      latencyP99Ms: 200,
      maxRps: 500,
      uptimeSla: "99.9%",
      securityStandards: ["gVisor Container Isolation", "AES-256 encrypted API keys", "Strict Token Caps"]
    }
  }
};

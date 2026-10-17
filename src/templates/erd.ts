import { BlueprintProject, EntityDefinition } from "../types/blueprint.js";

export function generateErd(project: BlueprintProject): string {
  const dateStr = new Date().toISOString().split("T")[0];
  const entities = project.entities || getDefaultEntities(project);
  const dbEngine = project.techStack?.database || "PostgreSQL";
  const isPostgres = dbEngine.startsWith("PostgreSQL");
  const full = project.detail !== "lite";

  // Build Mermaid diagram
  const mermaidRelations: string[] = [];
  const mermaidEntities: string[] = [];

  for (const ent of entities) {
    const lines: string[] = [];
    lines.push(`  ${ent.name.toUpperCase()} {`);
    for (const f of ent.fields) {
      const pkOrFk = f.isPrimary ? "PK" : f.references ? "FK" : f.isUnique ? "UK" : "";
      const sanitizedType = f.type.replace(/\(.*?\)/, "").toLowerCase();
      lines.push(`    ${sanitizedType} ${f.name} ${pkOrFk}`);

      if (f.references) {
        const [refTable] = f.references.split(".");
        // A nullable FK means the parent is optional: |o instead of ||.
        const parent = f.isNullable ? "|o" : "||";
        const relLine = `  ${refTable.toUpperCase()} ${parent}--o{ ${ent.name.toUpperCase()} : "${f.name}"`;
        if (!mermaidRelations.includes(relLine)) {
          mermaidRelations.push(relLine);
        }
      }
    }
    lines.push("  }");
    mermaidEntities.push(lines.join("\n"));
  }

  const mermaidDiagram = `\`\`\`mermaid
erDiagram
${mermaidEntities.join("\n\n")}

${mermaidRelations.join("\n")}
\`\`\``;

  // Build SQL DDL
  const sqlDdl = generateSqlDdl(entities);

  return `# Entity Relationship Diagram (ERD) & Data Model Specification
## Project: ${project.projectName}
**Target Database Engine:** \`${dbEngine}\`
**Schema Specification Version:** 1.0.0
**Generated Date:** ${dateStr}
**Normalization Target:** 3NF (the generator does not verify it; review before migrating)
${project.entities ? "" : "\n> [NOT SUPPLIED] No entities were provided. `users` and `audit_logs` below are generic placeholders. Replace them with this product's real data model before implementation.\n"}
---

${full ? `## 1. Visual Entity Relationship Diagram (Mermaid)

${mermaidDiagram}

---

` : ""}
## 2. Comprehensive Data Dictionary

${entities.map((ent, i) => {
  return `### 2.${i + 1} Table: \`${ent.name}\`
**Description:** ${ent.description}
${ent.cascadeRules ? `**Cascade Behavior:** \`${ent.cascadeRules}\`  ` : ""}

| Column Name | Data Type | Nullable | Default | Constraints | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
${ent.fields.map(f => {
  const constraints = [
    f.isPrimary ? "\`PK\`" : "",
    f.isUnique ? "\`UNIQUE\`" : "",
    f.references ? `\`FK -> ${f.references}\`` : "",
    !f.isNullable && !f.isPrimary ? "\`NOT NULL\`" : ""
  ].filter(Boolean).join(", ") || "-";

  return `| \`${f.name}\` | \`${f.type}\` | ${f.isNullable ? "YES" : "NO"} | ${f.defaultValue || "-"} | ${constraints} | ${f.description || f.name} |`;
}).join("\n")}

**Indexes (the same statements the migration runs):**
${entityIndexes(ent).length > 0
  ? entityIndexes(ent).map(idx => `* \`${idx}\``).join("\n")
  : "* None."}
`;
}).join("\n---\n\n")}

---

## 3. Production Migration Script (SQL DDL)

${isPostgres
  ? "> [!TIP]\n> Re-runnable (`IF NOT EXISTS` on tables and indexes), wrapped in one transaction, tables ordered so every foreign key target exists first."
  : `> [!WARNING]\n> This script is written in PostgreSQL dialect (\`UUID\`, \`TIMESTAMPTZ\`, \`NOW()\`). The target engine is \`${dbEngine}\`: translate types and syntax before running it.`}

\`\`\`sql
-- Migration: 001_initial_schema.sql
-- Generated for ${project.projectName} (${dbEngine})

BEGIN;

${sqlDdl}

COMMIT;
\`\`\`

---
${full ? `
## 4. Test Fixture Shapes (JSON)
Each row shows the column names and types a fixture must supply. Values are type placeholders, not real data: fill them from the test scenarios in \`01_PRD.md\`.

\`\`\`json
${JSON.stringify(
  Object.fromEntries(entities.map(ent => [ent.name, [Object.fromEntries(ent.fields.map(f => [f.name, `<${f.type}${f.isNullable ? ", nullable" : ""}>`]))]])),
  null,
  2
)}
\`\`\`

---` : ""}
*End of ERD. Proceed to \`04_SDD.md\` for software system architecture and API contracts.*
`;
}

function getDefaultEntities(project: BlueprintProject): EntityDefinition[] {
  return [
    {
      name: "users",
      description: "User profiles, credentials, and authentication state.",
      fields: [
        { name: "id", type: "UUID", isPrimary: true, description: "System generated UUID v4" },
        { name: "email", type: "VARCHAR(255)", isUnique: true, isNullable: false, description: "Normalized unique email address" },
        { name: "password_hash", type: "VARCHAR(255)", isNullable: false, description: "Argon2id password hash" },
        { name: "full_name", type: "VARCHAR(150)", isNullable: false, description: "User display name" },
        { name: "role", type: "VARCHAR(30)", isNullable: false, defaultValue: "'USER'", description: "Access control role" },
        { name: "is_active", type: "BOOLEAN", isNullable: false, defaultValue: "TRUE", description: "Account status toggle" },
        { name: "created_at", type: "TIMESTAMPTZ", isNullable: false, defaultValue: "NOW()", description: "Creation audit timestamp" },
        { name: "updated_at", type: "TIMESTAMPTZ", isNullable: false, defaultValue: "NOW()", description: "Modification audit timestamp" }
      ],
      indexes: [
        "CREATE UNIQUE INDEX idx_users_email ON users(email);",
        "CREATE INDEX idx_users_role ON users(role);"
      ]
    },
    {
      name: "audit_logs",
      description: "Immutable security and mutation audit records.",
      fields: [
        { name: "id", type: "UUID", isPrimary: true, description: "Log primary identifier" },
        { name: "user_id", type: "UUID", isNullable: true, references: "users.id", description: "Actor performing the action" },
        { name: "action", type: "VARCHAR(100)", isNullable: false, description: "Event verb (e.g. USER_LOGIN, RESOURCE_CREATED)" },
        { name: "resource_id", type: "VARCHAR(100)", isNullable: true, description: "Target resource identifier" },
        { name: "payload", type: "JSONB", isNullable: true, description: "Sanitized state change payload" },
        { name: "ip_address", type: "VARCHAR(45)", isNullable: true, description: "Client IPv4 / IPv6" },
        { name: "created_at", type: "TIMESTAMPTZ", isNullable: false, defaultValue: "NOW()" }
      ],
      indexes: [
        "CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);",
        "CREATE INDEX idx_audit_logs_action ON audit_logs(action);",
        "CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);"
      ],
      cascadeRules: "ON DELETE SET NULL on user_id"
    }
  ];
}

const makeIdempotent = (stmt: string) =>
  stmt.replace(/^CREATE (UNIQUE )?INDEX (?!IF NOT EXISTS)/i, "CREATE $1INDEX IF NOT EXISTS ");

// Explicit indexes, plus a created_at index and one per foreign key when the entity does not already cover them.
// The data dictionary and the migration both read this, so the two documents cannot disagree.
function entityIndexes(ent: EntityDefinition): string[] {
  const indexes = [...(ent.indexes || [])];
  const covers = (col: string) => indexes.some(i => new RegExp(`\\([^)]*\\b${col}\\b`).test(i));
  const wanted = ent.fields
    .filter(f => f.references || f.name === "created_at")
    .map(f => f.name);
  for (const col of wanted) {
    if (!covers(col)) indexes.push(`CREATE INDEX idx_${ent.name}_${col} ON ${ent.name}(${col});`);
  }
  return indexes.map(makeIdempotent);
}

// "ON DELETE SET NULL on user_id" -> action for that column; a rule that names no column applies to every FK.
function deleteAction(ent: EntityDefinition, column: string): string {
  const rule = ent.cascadeRules || "";
  const action = rule.match(/ON DELETE (CASCADE|SET NULL|SET DEFAULT|RESTRICT|NO ACTION)/i)?.[1];
  if (!action) return "";
  const fkColumns = ent.fields.filter(f => f.references).map(f => f.name);
  const named = fkColumns.filter(c => new RegExp(`\\b${c}\\b`).test(rule));
  return named.length === 0 || named.includes(column) ? ` ON DELETE ${action.toUpperCase()}` : "";
}

// Parents first, so every REFERENCES target already exists. Cycles keep their original order.
function orderByDependency(entities: EntityDefinition[]): EntityDefinition[] {
  const byName = new Map(entities.map(e => [e.name, e]));
  const done = new Set<string>();
  const visiting = new Set<string>();
  const ordered: EntityDefinition[] = [];

  const visit = (ent: EntityDefinition) => {
    if (done.has(ent.name) || visiting.has(ent.name)) return;
    visiting.add(ent.name);
    for (const f of ent.fields) {
      const parent = f.references && byName.get(f.references.split(".")[0]);
      if (parent && parent !== ent) visit(parent);
    }
    visiting.delete(ent.name);
    done.add(ent.name);
    ordered.push(ent);
  };

  entities.forEach(visit);
  return ordered;
}

function generateSqlDdl(entities: EntityDefinition[]): string {
  const statements: string[] = [];

  for (const ent of orderByDependency(entities)) {
    const colDefs: string[] = [];

    for (const f of ent.fields) {
      let colDef = `  ${f.name} ${f.type}`;
      if (f.isPrimary) {
        colDef += " PRIMARY KEY";
      } else {
        if (!f.isNullable) colDef += " NOT NULL";
        if (f.isUnique) colDef += " UNIQUE";
      }
      if (f.defaultValue) colDef += ` DEFAULT ${f.defaultValue}`;
      if (f.references) {
        const [table, column = "id"] = f.references.split(".");
        colDef += ` REFERENCES ${table}(${column})${deleteAction(ent, f.name)}`;
      }
      colDefs.push(colDef);
    }

    statements.push(`CREATE TABLE IF NOT EXISTS ${ent.name} (\n${colDefs.join(",\n")}\n);`);
    statements.push(...entityIndexes(ent));
  }

  return statements.join("\n\n");
}

import { BlueprintProject, UiScreen } from "../types/blueprint.js";

export function generateDesignSpec(project: BlueprintProject): string {
  const dateStr = new Date().toISOString().split("T")[0];
  const screens = project.uiScreens || getDefaultScreens(project);
  const full = project.detail !== "lite";

  return `# UI/UX Design System & Screen Specifications
## Project: ${project.projectName}
**Standard:** WCAG 2.1 Level AA Compliant  
**Version:** 1.0.0-PROD  
**Date:** ${dateStr}  
**Classification:** Definitive Frontend Implementation Contract  

---

## 1. Design System Tokens & Foundations

### 1.1 Color Palette (60-30-10 Rule)
The visual hierarchy uses a 60% dominant neutral foundation, 30% structural secondary, and 10% purposeful accent call-to-actions.

**Palette limits:** 2-3 core colors plus ONE accent. The accent appears only on the primary action and the focus ring, never on every icon, badge, and link at once. No gradients, glow, or blurred color orbs unless a written reason ties them to the product's identity. The accent below is a placeholder: replace it with the product's brand color before implementation, and re-check the contrast ratios in section 4.

| Role | Color Name | Hex Code | HSL Value | Usage Context |
| :--- | :--- | :--- | :--- | :--- |
| **Primary 60%** | Slate 950 (Dark Mode) | \`#020617\` | \`hsl(229, 84%, 5%)\` | App background, deep canvas |
| **Primary 60%** | Slate 50 (Light Mode) | \`#F8FAFC\` | \`hsl(210, 40%, 98%)\` | Canvas background for light theme |
| **Secondary 30%** | Slate 800 / Slate 100 | \`#1E293B\` | \`hsl(217, 33%, 17%)\` | Cards, sidebars, borders, navbars |
| **Accent 10% (light theme)** | Teal 700 (placeholder) | \`#0F766E\` | \`hsl(175, 77%, 26%)\` | Primary button fill, focus ring |
| **Accent 10% (dark theme)** | Teal 400 (placeholder) | \`#2DD4BF\` | \`hsl(172, 66%, 50%)\` | Primary button fill, focus ring |
| **Semantic Success** | Emerald 500 | \`#10B981\` | \`hsl(158, 64%, 52%)\` | Confirmation badges, success toasts |
| **Semantic Warning** | Amber 500 | \`#F59E0B\` | \`hsl(38, 92%, 50%)\` | Alert banners, billing warnings |
| **Semantic Danger** | Rose 600 | \`#E11D48\` | \`hsl(347, 77%, 50%)\` | Delete confirmations, validation errors |

Components reference semantic tokens (\`--color-accent\`, \`--color-surface\`, \`--color-danger\`), never raw hex values. Pick the theme from the product and its audience; if neither argues for a fixed theme, ship a working light/dark toggle.

### 1.2 Typography System
* **Primary Typeface:** \`Inter\`, system-ui, -apple-system, sans-serif (default; swap for a typeface that fits the brand and note the reason in this file)
* **Monospace Typeface:** \`JetBrains Mono\`, monospace, used only for API keys, IDs, and code blocks, never as a heading style
* Uppercase labels with wide letter-spacing are not a default; use them only where the brand calls for it.

| Level | Size | Weight | Line Height | CSS Class |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | 36px (2.25rem) | 800 (Extrabold) | 1.2 | \`text-4xl font-extrabold tracking-tight\` |
| **Heading 1** | 28px (1.75rem) | 700 (Bold) | 1.25 | \`text-2xl font-bold\` |
| **Heading 2** | 20px (1.25rem) | 600 (Semibold) | 1.3 | \`text-xl font-semibold\` |
| **Heading 3** | 18px (1.125rem) | 600 (Semibold) | 1.4 | \`text-lg font-semibold\` |
| **Body Regular** | 16px (1.0rem) | 400 (Normal) | 1.5 | \`text-base font-normal text-slate-300\` |
| **Body Dense (tables only)** | 14px (0.875rem) | 400 (Normal) | 1.5 | \`text-sm font-normal text-slate-300\` |
| **Caption** | 12px (0.75rem) | 500 (Medium) | 1.4 | \`text-xs font-medium text-slate-400\` |

Body text is never below 14px, and 12px is for captions only.

### 1.3 Spacing & Layout Grid
* **Baseline Grid:** 4px incremental scale (4, 8, 12, 16, 24, 32, 48, 64px).
* **Spacing rhythm:** Use different steps of the scale to group and separate sections; identical padding everywhere flattens the page.
* **Radius & elevation:** Define 2-3 radius values and use them by role (input, card, modal). Shadow marks elevation only; most surfaces stay flat.
* **Touch targets:** Minimum 44x44px with at least 8px between adjacent targets.
* **Breakpoints:**
  * Mobile: \`< 640px\` (Single column, collapsible bottom sheet navigation)
  * Tablet: \`640px - 1024px\` (2-column adaptive layout)
  * Desktop: \`> 1024px\` (Fixed sidebar 260px, fluid content container max-w-7xl)

---

${full ? `## 2. Reusable Component Hierarchy (Atomic Design)

\`\`\`
src/components/
├── ui/                  # Primitives (Radix / Tailwind / Vanilla)
│   ├── Button.tsx       # Primary, Secondary, Ghost, Danger (w/ Loading spinner)
│   ├── InputField.tsx   # Floating label, Error text, Focus-visible ring
│   ├── Badge.tsx        # Success, Warning, Neutral, Danger pills
│   ├── Skeleton.tsx     # Animated shimmer pulse placeholder
│   └── ModalDialog.tsx  # Accessible dialog with Esc key & focus trap
├── layout/
│   ├── SidebarNav.tsx   # Workspace switcher & navigation items
│   ├── TopHeader.tsx    # Breadcrumbs, User menu, Notifications bell
│   └── PageShell.tsx    # Responsive grid wrapper with max-width
└── modules/             # Domain organisms
    ├── DataGrid.tsx     # Sortable, paginated data table
    └── StatCard.tsx     # Metric value, % change, sparkline indicator
\`\`\`

---

` : ""}## 3. Screen Specifications & Comprehensive 5-State Matrices
${project.uiScreens ? "" : "\n> [NOT SUPPLIED] No screens were provided. The two below are generic placeholders (dashboard, resource list). Replace them with this product's real screens before implementation.\n"}

${screens.map((scr, idx) => {
  return `### 3.${idx + 1} [${scr.id}] ${scr.name}
* **Route Path:** \`${scr.route}\`  
* **Description:** ${scr.description}  
* **Required Components:** \`${scr.components.join("`, `")}\`

${full ? `#### 3.${idx + 1}.1 Wireframe Layout Structure
Built from this screen's required components, in reading order. Order the screen around the one decision the user makes here, and drop any component that does not serve it.
\`\`\`
${wireframe(scr)}
\`\`\`

` : ""}#### 3.${idx + 1}.2 Deterministic 5-State Matrix
| UI State | Visual Representation & Behavior | Required Elements |
| :--- | :--- | :--- |
| **1. Empty State** | ${scr.states.emptyState} | Heading that says why it is empty, one primary action that fills it. No decorative illustration. |
| **2. Loading State** | ${scr.states.loadingState} | Skeletons matching exact layout height/width (no layout shift), plus a label naming what is loading. |
| **3. Error State** | ${scr.states.errorState} | Danger-bordered card, message naming what failed and the next step, \`Retry\` button, support reference ID. |
| **4. Partial State** | Shows cached / degraded data with persistent warning badge: *"Working in offline mode / Sync pending."* | Yellow status pill, cached list, background retry loop. |
| **5. Populated State** | ${scr.states.successState} | Full interactive UI, active hover transitions, responsive table. |
`;
}).join("\n---\n\n")}

---

## 4. Accessibility & Micro-Interactions (WCAG 2.1 AA)

1. **Color Contrast:** All text must maintain a minimum contrast ratio of **4.5:1** against backgrounds (7:1 for headers). Chart segments and UI borders need **3:1** against neighbours.
2. **Keyboard Navigation:** Every interactive element must have a visible \`:focus-visible\` ring (\`2px solid var(--color-accent)\` with \`2px offset\`). Never remove it.
3. **Screen Readers:** ARIA labels on all icon-only buttons (e.g., \`aria-label="Close modal"\`, \`aria-expanded="false"\`).
4. **Motion Comfort:** Honor \`@media (prefers-reduced-motion: reduce)\` by disabling non-essential transition animations. Transitions run 150-300ms, animate only \`transform\` and \`opacity\`, and no element loops forever.
5. **Meaning beyond color:** Status is always paired with text or an icon, never color alone.
6. **Forms:** Visible label on every field (a placeholder is not a label), error text next to the field it belongs to.

---

## 5. Anti-Slop Rules for Implementing Agents

These rules bind every agent that builds from this file. A choice that matches a default below needs a written reason in the PR description.

### 5.1 UI
1. **No stock decoration:** no blue-purple gradients, background grids, blurred color orbs, glow, or glassmorphism on more than 1-2 elements. No colored left stripes unless the edge marks a real state.
2. **No emoji or generic AI glyphs as icons** (sparkle, robot, lightning). Use SVG icons that match the feature, from one consistent set, or no icon.
3. **No template layout:** no bento mosaic, no fake terminal window, no "Trusted by" logo bar, no three-tier pricing with the middle one highlighted, no 4-column footer, unless the product's content requires it.
4. **No eyebrow pill above the H1** that repeats the headline, and no "AI Powered" capsule badges.
5. **Real data only:** no invented metrics, trend deltas, activity feeds, testimonials, or names like "John Doe". Empty cells stay empty; placeholders say what goes there (\`Your Name\`, \`email@example.com\`).
6. **Every control works:** no dead nav links, no buttons without behavior. An unbuilt feature is left out or labeled "Coming soon".
7. **Design from the screen's job:** name the decision the user makes on each screen, then build the hierarchy around it. Do not default to sidebar + stat cards + chart + table.
8. **Empty, loading, and error states** name the cause and the next action. "No data available" alone fails.

### 5.2 Copy
1. **No filler vocabulary:** \`unlock\`, \`elevate\`, \`empower\`, \`game-changer\`, \`cutting-edge\`, \`revolutionary\`, \`journey\`, \`next level\`.
2. **No claims without evidence:** no \`trusted by thousands\`, \`industry-leading\`, or unnamed \`experts say\`. Name the source or cut the sentence.
3. **No em dashes** in any user-facing or document text; use a period, comma, colon, or parentheses.
4. **CTAs name the action** ("Export invoices"), not "Get started" or "Learn more".
5. **Name the actor:** "We rewrote the pricing page", not "the pricing page was updated". No "not just X, it's Y" and no run of one-word fragments for drama.
6. **No decorative bold, emoji in headings, or chatbot closers** ("Let me know if you need anything").

---
*End of DESIGN. Proceed to \`06_TRACEABILITY_MATRIX.md\` for requirements verification mapping.*
`;
}

function wireframe(scr: UiScreen): string {
  const width = 60;
  const line = `+${"-".repeat(width)}+`;
  const row = (text: string) => `| ${text.padEnd(width - 2)} |`;
  return [
    line,
    row(`${scr.name}  (${scr.route})`),
    line,
    ...scr.components.flatMap(c => [row(`[${c}]`), line])
  ].join("\n");
}

function getDefaultScreens(project: BlueprintProject): UiScreen[] {
  return [
    {
      id: "UI-SCR-01",
      name: "Dashboard Home",
      route: "/dashboard",
      description: "Overview screen listing items that need the user's attention first, followed by recent workspace operations.",
      components: ["PageShell", "StatCard", "ActivityList", "QuickActionDrawer"],
      states: {
        emptyState: "Heading 'No resources yet' with the line 'Create a resource to see activity here' and a primary 'Create resource' button.",
        loadingState: "Skeleton stat cards and 5 skeleton list items, labeled 'Loading workspace activity'.",
        errorState: "Alert panel with 'Could not load dashboard metrics. Check your connection, then select Retry.'",
        successState: "Stat cards bound to real workspace data (each with a named comparison period) and an activity list of real recorded events."
      }
    },
    {
      id: "UI-SCR-02",
      name: "Resource Management Directory",
      route: "/dashboard/resources",
      description: "Data table listing, filtering, search, and action controls for resource records.",
      components: ["PageShell", "DataGrid", "SearchBar", "FilterPopover", "CreateResourceModal"],
      states: {
        emptyState: "Table shows empty row stating 'No records found matching criteria. [Clear Filters] [Create New]'.",
        loadingState: "Table displays 8 shimmer skeleton rows with pulse animation.",
        errorState: "Banner notification 'Network error retrieving data. Check your connection.' with retry button.",
        successState: "Full paginated data table with sorting, search highlighting, and dropdown action menu."
      }
    }
  ];
}

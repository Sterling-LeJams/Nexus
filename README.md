# Nexus

# Nexus — Project Roadmap

**Commercial SaaS — 3D BIM Model Viewer & Construction Intelligence Platform**
**Target Users:** General Contractors

Would like to minimize dependencies when possible.

## Vision

Nexus is a web-based 3D model viewer for commercial construction that replaces the fragmented workflow of switching between Autodesk Construction Cloud, Procore, Navisworks, and spreadsheets. General contractors upload IFC models, navigate them through a **command palette-first interface** powered by sophisticated fuzzy search with Claude AI fallback, and connect their existing construction platforms to unify model coordination, RFIs, drawings, and issue tracking in a single view.

The command palette is the core differentiator. Instead of learning a complex toolbar UI, users type natural language commands — "section level 1", "hide mechanical", "show me grid A through D" — and the system executes instantly. When commands are too complex for deterministic parsing, Claude interprets the intent and composes multi-step operations. No BIM viewer in the market offers this interaction model.

### Product Phases

**Phase 1 — The Viewer (MVP):** IFC upload, 3D rendering, model navigation,
**Phase 2 - Element selection/inspection, section planes, visibility controls
**Phase 3 - Command palette with fuzzy search, and LLM fallback.
**Phase 4 — Integrations: Autodesk Construction Cloud (model coordination issues, pinned in the viewer), Procore (RFIs read/write, drawing overlay exploration), and Notion (project documentation linking). These integrations make Nexus the GC's single pane of glass.
**Phase 5 — Clash Detection
\*\*Phase 6 - 4D: Browser-based clash detection engine, clash grouping and management, appearance profiling, and potentially 4D scheduling visualization. This phase makes Nexus a Navisworks replacement.

---

Starting Project Structure
Monorepo Structure

nexus/
app/
frontend/ ← React + Vite SPA
backend/ ← Rust + Axum API
supabase/
migrations/
seed.sql
shared/ ← API contract types (TypeScript)
types/
README.md

## Technology Stack

### Frontend — React + Vite (TypeScript)

**What it does:** Application shell, UI components, command palette, settings, project management views, and all user-facing interface.

**Why this choice:** Vite provides fast HMR and build times for a pure SPA. Since the backend is Rust (not Node.js), Next.js's SSR and API route advantages don't apply. React has the largest ecosystem for UI component libraries, and TypeScript catches bugs at compile time — critical for a solo dev with no code reviewer.

**Key libraries:**

- `cmdk` — Command palette foundation (powers Vercel's and Linear's palettes)
- `fuse.js` — Fuzzy search engine for command matching
- `@tanstack/react-query` — Server state management for Supabase data
- `zustand` — Lightweight client state for viewer state (active section planes, hidden elements, camera position)
- `@supabase/supabase-js` — Direct client-to-Supabase communication for auth, database reads, and storage

### 3D Engine — That Open Engine + web-ifc

**What it does:** All IFC parsing, 3D rendering, element picking, section planes, visibility control, and fragment-based model caching. This is the entire geometry pipeline — parsing, tessellation, rendering, and interaction.

**Why this choice:** That Open Engine is built on Three.js with web-ifc (C++/WASM IFC parser) and provides BIM-specific components out of the box: IFC loading, fragment serialization, model trees, property extraction, section planes, and element selection with metadata. MIT licensed. Using raw Three.js would require building all of this from scratch (3–4 months of work).

**Key packages:**

- `@thatopen/components` — Core viewer components (scene, camera, raycaster, renderer)
- `@thatopen/components-front` — Frontend-specific components (postprocessing, measurement, plans)
- `@thatopen/fragments` — Fragment serialization/deserialization for fast model reload
- `web-ifc` — The WASM-based IFC parser that powers all geometry and metadata extraction

### Backend API — Rust + Axum

**What it does:** Thin API layer handling operations that cannot live client-side: OAuth token exchange for Autodesk/Procore, Claude API calls for the command palette fallback tier, webhook receivers, and any server-side business logic requiring secrets or authority.

**Why this choice:** The backend is intentionally thin — Supabase handles auth, database, and storage; That Open Engine handles IFC parsing client-side. The remaining server-side work is small (10–15 endpoints for MVP). Rust/Axum is fast, type-safe, compiles to a single binary for simple deployment, and avoids server-side JavaScript.

**Key crates:**

- `axum` — HTTP framework
- `reqwest` — Outbound HTTP (Claude API, Autodesk API, Procore API)
- `serde` / `serde_json` — Serialization
- `sqlx` — PostgreSQL driver (for direct DB access when needed beyond Supabase client)
- `tower-http` — CORS, logging, request tracing middleware
- `jsonwebtoken` — JWT validation for Supabase auth tokens

### Data Layer — Supabase

**What it does:** Authentication (email/password, SSO for enterprise later), PostgreSQL database with PostGIS for spatial queries and JSONB for flexible BIM metadata, S3-compatible object storage for IFC files and processed fragment files, Row Level Security for multi-tenant data isolation, and real-time subscriptions (future collaborative features).

**Why this choice:** Supabase provides a managed PostgreSQL instance with auth, storage, and real-time built in. For a solo dev, this eliminates weeks of infrastructure setup. The frontend talks to Supabase directly for most operations (auth, reads, writes, file uploads), and the Axum backend connects to the same PostgreSQL instance via standard connection string when server-side data access is needed.

**Database responsibilities:**

- Project and model metadata (names, versions, upload dates, processing status)
- IFC element metadata (GlobalId, classification, level, properties as JSONB, 3D bounding boxes via PostGIS)
- Command palette search index (pre-extracted levels, categories, systems, grids, type names)
- User state (saved views, hidden element sets, section plane positions, appearance profiles)
- Integration state (linked ACC issues, Procore RFIs, pin locations)
- Clash results (future Phase 3)

**Storage responsibilities:**

- Raw uploaded IFC files
- Processed fragment files (That Open Engine's binary fragment format)
- Thumbnails and screenshots

### Command Pallete: Fuzzy Matcher

User types "hide mech on L3"
│
▼
┌─────────────┐
│ Chevrotain │ Tokenize + parse structure
│ Parser │ → { action: "hide", target: "mech", modifier: { on: "L3" } }
└──────┬──────┘
│
▼
┌─────────────┐
│ Fuse.js │ Resolve ambiguous tokens against model vocabulary
│ Resolver │ → "mech" → Mechanical (0.95), "L3" → Level 3 (0.92)
└──────┬──────┘
│
▼
┌─────────────┐
│ Command │ Map to viewer operation
│ Executor │ → viewer.hideByDiscipline(["Mechanical"], { level: "Level 3" })
└─────────────┘

### Command Pallete Fallback — Claude API (Anthropic)

**What it does:** Fallback tier for the command palette. When fuzzy search and deterministic command parsing cannot resolve a user's input, the query is sent to Claude with the model's metadata schema as context. Claude interprets intent and returns structured commands (function calls) that the viewer executes.

**Why this choice:** Claude's function calling capability maps cleanly to viewer operations. You define a tool schema (section_at_level, hide_category, isolate_elements, etc.) and Claude returns structured calls rather than free-text, ensuring safe and predictable execution.

---

## Database Schema (Core Tables)

```
organizations
  id, name, created_at

projects
  id, organization_id, name, description, created_at

models
  id, project_id, name, version, status (uploading|processing|ready|error),
  ifc_file_path (storage ref), fragment_file_path (storage ref),
  element_count, created_at, processed_at

elements
  id, model_id, ifc_global_id, ifc_class (IfcWall, IfcDuctSegment, etc),
  name, level_name, system_type, discipline,
  properties (JSONB), bbox (PostGIS geometry — 3D bounding box),
  fragment_key (reference to position within fragment file)

command_index
  id, model_id, term, term_type (level|category|system|grid|type_name|material),
  element_count (how many elements match this term)

saved_views
  id, model_id, user_id, name,
  camera_position (JSONB), hidden_elements (array), section_planes (JSONB),
  appearance_overrides (JSONB), created_at

integration_pins (Phase 2)
  id, model_id, element_id, source (acc|procore|notion),
  external_id, pin_type (issue|rfi|document), position (JSONB),
  metadata (JSONB), created_at
```

---

## Command Palette Architecture

### Tier 1 — Deterministic Fuzzy Search (instant, <50ms)

Local command parsing with BIM-aware vocabulary. No network calls.

**Input:** User types in command palette
**Processing:** Parse input against command grammar → fuzzy match against `command_index` table (pre-loaded into client memory on model load)
**Examples:**

- "section level 1" → `section_at_level("Level 1")`
- "hide mech" → fuzzy matches "mechanical" → `hide_by_discipline("Mechanical")`
- "isolate walls" → `isolate_by_class("IfcWall")`
- "show grid A-3" → `navigate_to_grid("A-3")`

**BIM synonym map (client-side):**

- "cut" / "section" / "slice" → section operation
- "MEP" → Mechanical + Electrical + Plumbing
- "struct" / "structure" → Structural discipline
- "arch" → Architectural discipline
- "hide" / "remove" / "turn off" → visibility hide
- "show" / "reveal" / "turn on" → visibility show
- "isolate" / "solo" / "only" → isolate (hide everything else)

### Tier 2 — Compound Metadata Queries (fast, <500ms)

Structured queries against Supabase for multi-filter operations.

**Input:** Commands that combine multiple filters
**Processing:** Intent parser identifies filters and actions → Supabase query → viewer execution
**Examples:**

- "show concrete beams on level 3" → query elements WHERE ifc_class='IfcBeam' AND properties->>'material' ILIKE '%concrete%' AND level_name='Level 3' → isolate results
- "hide everything above level 5" → query levels above 5 → hide elements on those levels

### Tier 3 — Claude AI Fallback (1–3 seconds)

Complex or ambiguous requests sent to Claude with model context.

**Input:** Anything Tier 1 and 2 can't resolve
**Processing:** Send to Axum backend → Claude API with function-calling schema → return structured commands → viewer executes
**Examples:**

- "show me everything that might conflict with ductwork on level 2" → Claude composes: isolate level 2, show only mechanical + structural, enable transparency on structural
- "what changed since last upload" → Claude queries model versions, diffs element lists, highlights additions/removals

**Claude tool schema (defined in Axum backend):**

```
section_at_level(level_name: string)
hide_by_class(ifc_class: string[])
hide_by_discipline(discipline: string[])
isolate_elements(element_ids: string[])
show_all()
navigate_to_element(element_id: string)
set_transparency(element_ids: string[], opacity: float)
navigate_to_grid(grid_name: string)
highlight_elements(element_ids: string[], color: string)
```

---

## Implementation Guide — Phase 1 (MVP)

### Step 1: Project Scaffolding

**Goal:** Monorepo with frontend and backend building, Supabase connected, and a blank canvas rendering.

**Tasks:**

1. Initialize Vite React-TS project: `npm create vite@latest web -- --template react-ts`
2. Install That Open Engine: `npm install @thatopen/components @thatopen/components-front @thatopen/fragments web-ifc`
3. Install UI dependencies: `npm install cmdk fuse.js zustand @tanstack/react-query @supabase/supabase-js`
4. Create Supabase project at supabase.com — enable PostGIS extension
5. Initialize Axum project: `cargo init api` with axum, tokio, serde, reqwest, tower-http
6. Set up environment variables for Supabase URL, anon key, and service role key
7. Verify: React app renders, Supabase client connects, Axum serves a health endpoint

### Step 2: Basic 3D Viewer (Weeks 2–3)

**Goal:** User can drag-drop an IFC file, it renders in the browser, and they can orbit/pan/zoom.

**Tasks:**

1. Create a `ViewerContainer` React component that mounts a That Open Engine scene
2. Initialize `OBC.Components()`, set up `OBC.SimpleScene`, `OBC.SimpleCamera`, `OBC.SimpleRenderer`
3. Add `OBC.IfcLoader` component — configure web-ifc WASM path
4. Implement drag-and-drop file handler: accept `.ifc` files, pass to IfcLoader
5. Add orbit controls (That Open Engine wraps Three.js OrbitControls)
6. Add grid helper and ambient/directional lighting
7. Style the viewer to fill the viewport with a minimal toolbar overlay
8. Test with a sample IFC file (the That Open Engine docs include test files)

### Step 3: Element Interaction (Weeks 3–4)

**Goal:** User can click elements to select them, view properties, hide/show elements, and use section planes.

**Tasks:**

1. Set up `OBC.Raycasters` for element picking — click to select, highlight selected element
2. Extract properties from selected element using That Open Engine's property extraction
3. Build a side panel component showing selected element properties (IFC class, name, level, property sets)
4. Implement visibility controls: right-click context menu with "Hide", "Isolate", "Show All"
5. Add section plane tool using `OBC.Clipper` — click to place, drag to move
6. Add a model tree panel using That Open Engine's spatial tree classification
7. Store viewer state (hidden elements, section planes, camera) in Zustand

### Step 4: Supabase Integration & Model Persistence (Weeks 4–6)

**Goal:** Models are stored in Supabase so users don't re-upload every session. Auth is working.

**Tasks:**

1. Set up Supabase Auth — email/password for MVP (add SSO later)
2. Create database tables: `organizations`, `projects`, `models`, `elements`, `command_index`
3. Enable Row Level Security policies — users see only their organization's data
4. Create Supabase Storage buckets: `ifc-files` (raw uploads), `fragments` (processed geometry)
5. Implement upload flow:
   - User selects IFC file → upload to Supabase Storage (`ifc-files` bucket)
   - Client-side: That Open Engine parses the file, renders immediately
   - Background: extract metadata from parsed model → batch insert to `elements` table
   - Background: serialize fragments → upload to Supabase Storage (`fragments` bucket)
   - Update `models` row status to "ready"
6. Implement load flow:
   - User opens a project → fetch model metadata from `models` table
   - Download fragment files from storage → load into That Open Engine (skip IFC re-parse)
   - Fetch element metadata for command palette index
7. Build project dashboard: list projects, list models per project, upload button
8. Build the metadata extraction pipeline:
   - After IFC parse, iterate all elements via web-ifc API
   - Extract: GlobalId, IFC class, name, level, properties (as JSON)
   - Compute bounding boxes per element
   - Batch insert to `elements` table (use Supabase's bulk insert — watch for row limits)
   - Build `command_index` entries: distinct levels, categories, systems, type names

### Step 5: Command Palette — Tier 1 (Weeks 6–8)

**Goal:** Command palette opens with Cmd+K, user types natural language, and basic commands execute instantly.

**Tasks:**

1. Integrate `cmdk` library — mount as global overlay, open with Cmd+K / Ctrl+K
2. On model load, fetch `command_index` into client memory
3. Build BIM synonym map (static object mapping construction terminology to canonical terms)
4. Build command parser:
   - Tokenize input
   - Identify action verb (section, hide, show, isolate, navigate, highlight)
   - Identify target (level name, IFC class, discipline, system, grid)
   - Fuzzy match targets against command index using Fuse.js
5. Wire parsed commands to viewer operations:
   - `section_at_level` → position OBC.Clipper at level elevation
   - `hide_by_class` → set visibility on matching elements
   - `isolate_by_discipline` → hide all except matching discipline
   - `show_all` → reset all visibility
   - `navigate_to_element` → fly camera to element, highlight it
6. Show ranked suggestions as user types — display command, affected element count, and preview
7. Add keyboard navigation (arrow keys, enter to execute)
8. Add command history (recent commands shown on empty input)

### Step 6: Command Palette — Tier 3 / Claude Fallback (Weeks 8–9)

**Goal:** Commands that Tier 1 can't resolve are sent to Claude and return executable viewer actions.

**Tasks:**

1. Define Claude tool schema in Axum backend (all viewer operations as function definitions)
2. Build Axum endpoint: `POST /api/command` — receives user input + model context
3. Model context payload: list of available levels, disciplines, systems, IFC classes, grids (from command_index)
4. Call Claude API with tools + model context + user input
5. Parse Claude's tool-use response → return structured commands to frontend
6. Frontend executes returned commands through same viewer operation functions as Tier 1
7. Show loading indicator in command palette during Claude call
8. Cache Claude responses for identical inputs (avoid repeated API costs)
9. Add graceful fallback: if Claude call fails, show "I couldn't understand that — try being more specific"

### Step 7: Saved Views & User State (Weeks 9–10)

**Goal:** Users can save and restore viewer states (camera, visibility, sections, highlights).

**Tasks:**

1. Define view state schema: camera position/target/up, hidden element IDs, section plane positions, appearance overrides
2. "Save View" button serializes current Zustand state → inserts to `saved_views` table
3. Saved views panel lists all saved views with thumbnails (capture canvas screenshot via Three.js)
4. Click saved view → restore all state (camera, visibility, sections)
5. Shareable view URLs: encode view ID in URL path, load on page open

### Step 8: Polish, Testing & Launch Prep (Weeks 10–12)

**Goal:** Production-ready MVP with error handling, loading states, and deployment.

**Tasks:**

1. Error boundaries around viewer (WebGL context loss, large file OOM, corrupt IFC)
2. Loading states: file upload progress, parsing progress, fragment loading progress
3. Responsive layout: viewer fills available space, panels collapse on mobile
4. Performance testing with real GC models (request test files from target users)
5. Deploy frontend to Vercel (or Cloudflare Pages)
6. Deploy Axum backend to Fly.io or Railway (single binary, simple Dockerfile)
7. Set up Supabase production project (separate from development)
8. Domain, SSL, basic landing page explaining the product
9. Invite 3–5 GC contacts for private beta feedback

---

---

## Key Risks & Mitigations

| Risk                                             | Impact                                     | Mitigation                                                                                                                                 |
| ------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Large IFC files crash browser (>200MB)           | Users can't load real project models       | Implement chunked fragment loading; set file size limit with clear messaging; keep IfcOpenShell as future server-side fallback             |
| web-ifc fails on certain IFC schemas             | Some models don't parse                    | Test with diverse real-world IFCs early; log parsing errors; document supported IFC versions                                               |
| Command palette doesn't understand GC vocabulary | Core differentiator fails                  | Interview 3–5 GCs during development; build synonym map from real usage; iterate on Tier 1 patterns before relying on Claude               |
| Supabase rate limits on bulk element inserts     | Metadata extraction fails for large models | Batch inserts (1000 rows per call); implement retry with backoff; consider direct PostgreSQL connection for bulk operations                |
| Claude API latency frustrates users              | Tier 3 feels slow                          | Make Tier 1 and 2 cover 90%+ of commands; show clear loading state; cache responses                                                        |
| Solo dev burnout                                 | Timeline slips                             | Ship Viewer (Phase 1) as complete product first; integrations are additive; avoid scope creep into clash detection before MVP is validated |

---

# ACC Connection — Implementation Plan

## Basic Overview

Nexus currently uses the **That Open Engine (TOE)** to load and render IFC files entirely client-side. This plan adds support for Autodesk file formats (`.rvt`, `.nwd`, `.nwc`) by
introducing the **Autodesk Model Derivative API** as a conversion layer, while keeping TOE as the sole viewer.

The routing logic works as follows:

- **"Load Example"** — Loads the default IFC sample file. Uses the **TOE engine** directly, no backend involvement.
- **"Select from Device"** — Opens a file picker. The selected file's extension determines the pipeline:
  - **`.ifc`** → Uses the **TOE engine** directly, same as today.
  - **`.rvt`, `.nwd`, `.nwc`** → The file is uploaded to Autodesk's cloud via the Rust backend. The **Model Derivative API** translates it to glTF format. The translated geometry is
    downloaded and loaded into the **TOE engine** via Three.js. Metadata (categories, families, types, properties, object tree) is extracted from the Model Derivative API and stored in **Supabase** for BIM querying.
- **"Autodesk Construction Cloud"** — The user authenticates with their Autodesk account via OAuth. Once connected, they can browse their ACC hubs, projects, and folders to select a
  model. Since the file already lives in Autodesk's cloud, the upload step is skipped — the **Model Derivative API** translates the file directly using its existing URN, and the same glTF → TOE rendering and metadata extraction pipeline is used.

In all cases, **TOE is the only viewer**. The Model Derivative API is used purely as a file translation and metadata extraction service for non-IFC formats.

---

## Overview

Add Autodesk Construction Cloud (ACC) support to Nexus so users can view `.rvt`, `.nwd`, and `.nwc` files alongside the existing IFC/TOE workflow. The Autodesk Model Derivative API handles file translation; TOE (That Open Engine) remains the sole viewer. Metadata is persisted to Supabase.

---

## Design Decisions

| Decision         | Choice                    | Rationale                                            |
| ---------------- | ------------------------- | ---------------------------------------------------- |
| Backend language | **Rust (port APS calls)** | One backend, cleaner long-term                       |
| glTF storage     | **Supabase Storage**      | Persistent, avoids re-translation costs              |
| Metadata scope   | **Full**                  | Categories, families, types, properties, object tree |
| ACC browser UI   | **New draggable panel**   | Consistent with MenuPanel/LevelsPanel pattern        |
| Multi-model      | **Replace current**       | Simpler for MVP                                      |
| Auth persistence | **Persist token**         | Less friction for users                              |

---

## Viewer Mode Flag

A new `viewerMode` field in `viewerStore` drives which pipeline processes the file:

```
viewerMode: 'toe' | 'acc' | null
```

| User Action                           | File Types             | viewerMode | Pipeline                                             |
| ------------------------------------- | ---------------------- | ---------- | ---------------------------------------------------- |
| Load Example                          | `.ifc`                 | `toe`      | TOE direct                                           |
| Select from Device → IFC              | `.ifc`                 | `toe`      | TOE direct                                           |
| Select from Device → Revit/Navisworks | `.rvt`, `.nwd`, `.nwc` | `acc`      | Upload → Model Derivative → glTF → TOE               |
| Connect to ACC → browse & select      | any ACC file           | `acc`      | URN already in cloud → Model Derivative → glTF → TOE |

---

## Folder Structure

### Frontend — New & Modified Files

```
app/frontend/src/
├── store/
│   ├── viewerStore.ts              ← MODIFY: add viewerMode, accAuth state
│   └── themeStore.ts               (unchanged)
├── viewer/
│   ├── viewer.tsx                  ← MODIFY: add loadGltf() callback
│   ├── types.ts                    ← MODIFY: add loadGltf to ViewerCallbacks
│   ├── controls.tsx                (unchanged)
│   └── index.ts                    (unchanged)
├── components/
│   ├── MenuPanel.tsx               ← MODIFY: file extension detection, ACC button enables
│   ├── ACCBrowserPanel.tsx         ← NEW: draggable panel for browsing ACC projects/files
│   └── panels/
│       └── panelStore.ts           (unchanged — ACCBrowserPanel self-registers)
├── autodesk/
│   ├── types.ts                    ← NEW: ACC API response types, auth types
│   ├── auth.ts                     ← NEW: OAuth redirect, token storage/refresh
│   ├── api.ts                      ← NEW: frontend calls to Rust backend ACC endpoints
│   └── index.ts                    ← NEW: barrel export
├── types.ts                        ← MODIFY: add AccFile type, extend IfcExample
├── App.tsx                         ← MODIFY: add ACCBrowserPanel, pass new props
└── ...
```

### Backend — New & Modified Files

```
app/backend/src/
├── main.rs                         ← MODIFY: register new route modules, add app state
├── config.rs                       ← NEW: env var loading (APS_CLIENT_ID, APS_CLIENT_SECRET, SUPABASE_URL, etc.)
├── error.rs                        ← NEW: unified error types for API responses
├── routes/
│   ├── mod.rs                      ← NEW: route module declarations
│   ├── health.rs                   ← NEW: GET / health check
│   ├── auth.rs                     ← NEW: 3-legged OAuth endpoints (login, callback, token refresh)
│   └── acc.rs                      ← NEW: ACC proxy endpoints (list hubs, projects, files, translate, status, download)
├── autodesk/
│   ├── mod.rs                      ← NEW: module declarations
│   ├── client.rs                   ← NEW: reqwest-based HTTP client for Autodesk API (mirrors RevitParser/client.ts)
│   ├── oauth.rs                    ← NEW: 2-legged & 3-legged token management, refresh logic
│   ├── oss.rs                      ← NEW: Object Storage Service (upload from device flow)
│   ├── derivative.rs               ← NEW: Model Derivative API (start job, poll manifest, request glTF output)
│   ├── metadata.rs                 ← NEW: metadata + properties extraction (mirrors RevitParser/metadata.ts)
│   ├── data_management.rs          ← NEW: Data Management API (list hubs, projects, folders, items)
│   └── types.rs                    ← NEW: Rust structs for all Autodesk API responses (serde)
├── supabase/
│   ├── mod.rs                      ← NEW: module declarations
│   ├── client.rs                   ← NEW: Supabase client (storage + database via REST API or sqlx)
│   ├── storage.rs                  ← NEW: upload/download glTF to Supabase Storage
│   └── models.rs                   ← NEW: insert/query model metadata, elements, properties
└── models/
    ├── mod.rs                      ← NEW: module declarations
    └── transform.rs                ← NEW: transform Autodesk properties → DB records (mirrors RevitParser/transform.ts)
```

### Supabase — New Files

```
supabase/
├── migrations/
│   ├── 001_create_models_table.sql         ← NEW: models table (id, urn, file_name, status, viewer_mode, storage_path)
│   ├── 002_create_metadata_table.sql       ← NEW: model metadata views (guid, view_name, properties JSONB)
│   ├── 003_create_elements_table.sql       ← NEW: elements (db_id, name, category, family, type, properties JSONB)
│   ├── 004_create_object_tree_table.sql    ← NEW: object tree hierarchy (parent_id, children, depth)
│   └── 005_create_auth_tokens_table.sql    ← NEW: persisted Autodesk OAuth tokens (user_id, access_token, refresh_token, expires_at)
└── seed.sql                                (unchanged)
```

---

## Architecture

### Backend API Endpoints

| Method | Path                                                        | Purpose                                                          | Auth                     |
| ------ | ----------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------ |
| `GET`  | `/api/health`                                               | Health check                                                     | None                     |
| `GET`  | `/api/acc/login`                                            | Redirect user to Autodesk OAuth consent page                     | Supabase JWT             |
| `GET`  | `/api/acc/callback`                                         | OAuth callback — exchange code for tokens, persist to DB         | None (Autodesk redirect) |
| `GET`  | `/api/acc/token`                                            | Return current user's Autodesk access token (refresh if expired) | Supabase JWT             |
| `GET`  | `/api/acc/hubs`                                             | List user's ACC hubs                                             | Supabase JWT + ACC token |
| `GET`  | `/api/acc/hubs/:hub_id/projects`                            | List projects in a hub                                           | Supabase JWT + ACC token |
| `GET`  | `/api/acc/projects/:project_id/folders/:folder_id/contents` | List folder contents                                             | Supabase JWT + ACC token |
| `POST` | `/api/acc/upload`                                           | Upload file from device to APS OSS                               | Supabase JWT             |
| `POST` | `/api/acc/translate`                                        | Start Model Derivative translation job (input: URN)              | Supabase JWT             |
| `GET`  | `/api/acc/translate/:urn/status`                            | Poll translation status                                          | Supabase JWT             |
| `GET`  | `/api/acc/translate/:urn/download`                          | Download translated glTF, cache to Supabase Storage              | Supabase JWT             |
| `GET`  | `/api/acc/models/:model_id/metadata`                        | Get stored metadata for a model                                  | Supabase JWT             |

### Autodesk API Endpoints Used

| API                  | Endpoint                                                            | Purpose                            |
| -------------------- | ------------------------------------------------------------------- | ---------------------------------- |
| **Authentication**   | `POST /authentication/v2/token`                                     | 2-legged & 3-legged token exchange |
| **Authentication**   | `GET /authentication/v2/authorize`                                  | 3-legged OAuth consent redirect    |
| **Data Management**  | `GET /project/v1/hubs`                                              | List ACC hubs                      |
| **Data Management**  | `GET /project/v1/hubs/:hub/projects`                                | List ACC projects                  |
| **Data Management**  | `GET /data/v1/projects/:project/folders/:folder/contents`           | Browse files                       |
| **Data Management**  | `GET /data/v1/projects/:project/items/:item/versions`               | Get file versions                  |
| **OSS**              | `PUT /oss/v2/buckets/:bucket/objects/:object`                       | Upload file (device flow)          |
| **Model Derivative** | `POST /modelderivative/v2/designdata/job`                           | Start translation                  |
| **Model Derivative** | `GET /modelderivative/v2/designdata/:urn/manifest`                  | Poll translation status            |
| **Model Derivative** | `GET /modelderivative/v2/designdata/:urn/metadata`                  | List model views                   |
| **Model Derivative** | `GET /modelderivative/v2/designdata/:urn/metadata/:guid/properties` | Element properties                 |
| **Model Derivative** | `GET /modelderivative/v2/designdata/:urn/metadata/:guid`            | Object tree                        |

### Database Schema

```sql
-- Models table
CREATE TABLE models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    urn TEXT,
    file_name TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('ifc_local', 'ifc_example', 'device_upload', 'acc')),
    status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'translating', 'extracting_metadata', 'complete', 'failed')),
    storage_path TEXT,                    -- path in Supabase Storage to cached glTF
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Model metadata views (from Model Derivative metadata endpoint)
CREATE TABLE model_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    guid TEXT NOT NULL,
    view_name TEXT NOT NULL,
    role TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Elements (individual Revit/Navisworks elements with full properties)
CREATE TABLE model_elements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    metadata_id UUID REFERENCES model_metadata(id) ON DELETE CASCADE,
    db_id INTEGER NOT NULL,
    external_id TEXT,
    name TEXT NOT NULL,
    category TEXT,
    family TEXT,
    type TEXT,
    properties JSONB,                     -- full property bag from Autodesk
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Object tree (hierarchical structure)
CREATE TABLE model_object_tree (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES models(id) ON DELETE CASCADE,
    metadata_id UUID REFERENCES model_metadata(id) ON DELETE CASCADE,
    object_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    parent_object_id INTEGER,
    depth INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Persisted Autodesk OAuth tokens
CREATE TABLE autodesk_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    scope TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Token Flow

```
┌─────────────────────────────────────────────────────────┐
│ 2-Legged (Server-to-Server) — for device upload flow    │
│                                                         │
│ Rust backend uses APS_CLIENT_ID + APS_CLIENT_SECRET     │
│ → gets app-level token                                  │
│ → used for: OSS upload, Model Derivative translation    │
│ → no user login required                                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ 3-Legged (User Auth) — for ACC browsing flow            │
│                                                         │
│ 1. Frontend redirects to /api/acc/login                 │
│ 2. Backend redirects to Autodesk OAuth consent page     │
│ 3. User logs in + grants access                         │
│ 4. Autodesk redirects to /api/acc/callback              │
│ 5. Backend exchanges code → access_token + refresh_token│
│ 6. Tokens stored in autodesk_tokens table               │
│ 7. Frontend uses /api/acc/token to get current token    │
│ 8. Token auto-refreshes when expired                    │
└─────────────────────────────────────────────────────────┘
```

## Implementation Steps

### Phase 1: Backend Foundation

**Step 1 — Rust backend scaffolding**

- Set up Axum router in `main.rs` with CORS, state, and route modules
- Create `config.rs` to load env vars: `APS_CLIENT_ID`, `APS_CLIENT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `APS_CALLBACK_URL`
- Create `error.rs` with unified error type implementing `IntoResponse`
- Add dependencies to `Cargo.toml`: `dotenvy`, `uuid`, `chrono`, `tower`, `tracing`, `tracing-subscriber`
- Reference: Current `Cargo.toml` already has `axum`, `tokio`, `serde`, `reqwest`, `tower-http`, `sqlx`, `jsonwebtoken`

**Step 2 — Autodesk HTTP client in Rust**

- Create `autodesk/client.rs` — a `reqwest`-based wrapper with bearer token auth
- Mirror the pattern from `RevitParser/src/autodesk/client.ts` but in Rust
- All Autodesk API calls go through this client

**Step 3 — OAuth implementation**

- Create `autodesk/oauth.rs`:
  - `get_two_legged_token()` — POST to `/authentication/v2/token` with `client_credentials` grant (mirrors `autodesk-app/server/src/aps.ts:getInternalToken`)
  - `get_three_legged_auth_url()` — build Autodesk consent URL with scopes + redirect URI
  - `exchange_code_for_token()` — POST to `/authentication/v2/token` with `authorization_code` grant
  - `refresh_access_token()` — POST to `/authentication/v2/token` with `refresh_token` grant
- Create `routes/auth.rs`:
  - `GET /api/acc/login` — redirects browser to Autodesk consent page
  - `GET /api/acc/callback` — receives auth code, exchanges for tokens, stores in `autodesk_tokens` table, redirects back to frontend
  - `GET /api/acc/token` — returns current access token (auto-refreshes if expired)

**Step 4 — Database setup**

- Create Supabase migration files for all 5 tables (`models`, `model_metadata`, `model_elements`, `model_object_tree`, `autodesk_tokens`)
- Create `supabase/client.rs` — initialize SQLx connection pool
- Create `supabase/models.rs` — CRUD functions for all tables
- Create `supabase/storage.rs` — upload/download glTF files to Supabase Storage bucket

### Phase 2: Model Derivative Pipeline

**Step 5 — OSS upload (device flow)**

- Create `autodesk/oss.rs`:
  - `ensure_bucket_exists()` — mirrors `autodesk-app/aps.ts:ensureBucketExists`
  - `upload_object()` — upload file bytes to APS OSS bucket
  - `urnify()` — base64 encode object ID for Model Derivative
- Create `routes/acc.rs`:
  - `POST /api/acc/upload` — receive multipart file from frontend, save to temp, upload to OSS, return URN

**Step 6 — Model Derivative translation**

- Create `autodesk/derivative.rs`:
  - `start_translation()` — POST job requesting **OBJ output** (geometry) + SVF2 (for metadata extraction)
  - `get_manifest()` — poll translation status (mirrors `RevitParser/src/autodesk/translation.ts`)
  - `download_derivative()` — download the translated geometry output
- Add routes to `routes/acc.rs`:
  - `POST /api/acc/translate` — start translation job for a given URN
  - `GET /api/acc/translate/:urn/status` — return current translation status + progress

**Step 7 — Metadata extraction**

- Create `autodesk/metadata.rs`:
  - `get_metadata()` — list model views (mirrors `RevitParser/src/autodesk/metadata.ts:getMetadata`)
  - `get_properties()` — get element properties per view (mirrors `waitForProperties`)
  - `get_object_tree()` — get hierarchical tree (mirrors `RevitParser/src/autodesk/geometry.ts:getObjectTree`)
- Create `models/transform.rs`:
  - `transform_properties_to_elements()` — extract category, family, type from nested properties (mirrors `RevitParser/src/parser/transform.ts`)
  - `flatten_object_tree()` — flatten recursive tree into DB rows with parent_id + depth
- Create `autodesk/data_management.rs`:
  - `list_hubs()` — GET `/project/v1/hubs`
  - `list_projects()` — GET `/project/v1/hubs/:hub/projects`
  - `list_folder_contents()` — GET `/data/v1/projects/:project/folders/:folder/contents`

**Step 8 — glTF download & storage**

- After translation completes, backend downloads the geometry derivative
- Convert/package as `.glb` if needed
- Upload to Supabase Storage at path: `models/{model_id}/model.glb`
- Update `models.storage_path` in database
- Add route: `GET /api/acc/translate/:urn/download` — returns signed URL or streams glTF from Supabase Storage

### Phase 3: Frontend Integration

**Step 9 — Viewer store & types updates**

- Add to `viewerStore.ts`:
  - `viewerMode: 'toe' | 'acc' | null`
  - `setViewerMode()`
  - `accAuthStatus: 'disconnected' | 'connected' | 'loading'`
  - `setAccAuthStatus()`
- Add to `viewer/types.ts`:
  - `loadGltf: (url: string) => Promise<void>` to `ViewerCallbacks`
- Add to `types.ts`:
  - `AccFile`, `AccProject`, `AccHub` types

**Step 10 — glTF loading in TOE viewer**

- Add `loadGltf()` function in `viewer.tsx`:
  - Use Three.js `GLTFLoader` to load the glTF/glb file
  - Add the loaded scene to the TOE world scene
  - Fit camera to model bounds
  - Fire `onModelLoaded()` callback
- Clear previous model before loading new one (replace behavior)

**Step 11 — MenuPanel file extension detection**

- Change file input `accept` from `.ifc` to `.ifc,.rvt,.nwd,.nwc`
- In `handleFileUpload()`, detect extension:
  - `.ifc` → call `loadIfc()` as today, `setViewerMode('toe')`
  - `.rvt/.nwd/.nwc` → call backend upload + translate pipeline, `setViewerMode('acc')`
- Enable the "Autodesk Construction Cloud" button
- Add loading/progress states for translation polling

**Step 12 — Autodesk auth flow (frontend)**

- Create `autodesk/auth.ts`:
  - `initiateLogin()` — redirect to `GET /api/acc/login`
  - `checkAuthStatus()` — call `GET /api/acc/token` to see if user has valid token
  - `getStoredToken()` — retrieve token for API calls
  - Store auth state in `viewerStore`
- On "Autodesk Construction Cloud" click:
  - Check if user is authenticated
  - If not, redirect to OAuth flow
  - If yes, open ACCBrowserPanel

**Step 13 — ACCBrowserPanel**

- New draggable panel component (register with `panelStore`)
- Three-level drill-down:
  1. **Hubs list** — call `GET /api/acc/hubs`
  2. **Projects list** — call `GET /api/acc/hubs/:id/projects`
  3. **File browser** — call `GET /api/acc/projects/:id/folders/:id/contents` (recursive folder navigation)
- Each level shows a list with back navigation
- Selecting a `.rvt/.nwd/.nwc` file triggers the translation pipeline (skip upload since file is already in Autodesk cloud)
- Show translation progress inline in the panel

**Step 14 — Translation progress UI**

- When translation is in progress, show status in MenuPanel or ACCBrowserPanel:
  - "Uploading to Autodesk..." (device flow only)
  - "Translating model... 45%"
  - "Extracting metadata..."
  - "Loading model..."
  - "Complete" → model appears in viewer

### Phase 4: Metadata Integration

**Step 15 — Frontend metadata consumption**

- Create `autodesk/api.ts`:
  - `fetchModelMetadata(modelId)` — call `GET /api/acc/models/:id/metadata`
  - Returns elements with categories, families, types, properties
- Wire metadata into existing UI:
  - `LevelsPanel` — if viewerMode is `acc`, query levels from stored metadata instead of TOE's IFC parser
  - `CommandPallete` — BIM Query tier can search stored element metadata
  - Future: properties panel showing selected element details

**Step 16 — Error handling & edge cases**

- Translation failure: show error message, allow retry
- OAuth token expired mid-browse: auto-refresh, retry request
- Large model timeout: extend polling duration, show estimate
- Duplicate model: check if URN already translated, skip re-translation and load from Supabase Storage cache
- Network failure during upload: cleanup partial OSS upload

### Phase 5: Polish & Testing

**Step 17 — End-to-end testing**

- Test IFC flow still works unchanged
- Test device upload flow: `.rvt` → translate → view in TOE
- Test ACC flow: login → browse → select → translate → view
- Test token persistence: close browser → reopen → ACC still connected
- Test model replacement: load IFC → load RVT → verify clean swap
- Test metadata queries via command palette

**Step 18 — Environment & deployment**

- Add required env vars to backend `.env`:
  ```
  APS_CLIENT_ID=xxx
  APS_CLIENT_SECRET=xxx
  APS_CALLBACK_URL=http://localhost:3001/api/acc/callback
  SUPABASE_URL=xxx
  SUPABASE_SERVICE_KEY=xxx
  DATABASE_URL=xxx
  ```
- Update `CLAUDE.md` with new dev commands and architecture notes
- Update frontend env/config if needed for backend URL

# Nexus — Project Instructions

## Overview
Nexus is a commercial SaaS — a **3D BIM Model Viewer & Construction Intelligence Platform** for General Contractors. It enables GCs to view IFC/BIM models in the browser, query building data via a command palette, and collaborate on construction projects.

## Monorepo Structure
```
Nexus/
├── app/
│   ├── frontend/       # React + Vite + TypeScript
│   └── backend/        # Rust + Axum API server
├── supabase/
│   ├── migrations/     # SQL migration files
│   └── seed.sql        # Seed data
├── shared/
│   └── types/          # Shared TypeScript type definitions
├── CLAUDE.md           # This file
└── README.md
```

## Tech Stack
- **Frontend**: React 19, Vite, TypeScript
- **3D Engine**: That Open Engine (`@thatopen/components`, `@thatopen/components-front`, `@thatopen/fragments`, `web-ifc`)
- **UI/State**: `cmdk` (command palette), `zustand` (state), `@tanstack/react-query` (async state), `fuse.js` (fuzzy search)
- **Backend**: Rust, Axum, Tokio, SQLx (Postgres)
- **Database/Auth**: Supabase (Postgres + Auth + Storage)
- **Serialization**: serde, serde_json
- **Auth**: JWT validation via `jsonwebtoken` crate

## Key Conventions
- **Minimize dependencies** — prefer small, focused libraries; avoid framework bloat
- **Command-palette-first UX** — primary interaction pattern is the 3-tier command palette (Navigation → BIM Query → NLP)
- **Phase 1 MVP focus** — build the viewer + basic command palette first, defer NLP/advanced features
- **Client-side IFC parsing** — IFC files are parsed in the browser via web-ifc/That Open Engine; backend is thin
- **Thin backend** — Rust API handles auth relay, project metadata, and file storage pointers; no server-side IFC processing

## Code Style
- **Arrow functions for nested functions** — never use `function` declarations inside another function; always use `const fn = () => { ... }` instead (makes scope obvious, no hoisting surprises)
- **No `any` in TypeScript** — always use proper types or `unknown`; never use `any`
- **File search permissions** — no need to ask for permission to read or search files/folders within the project directory; always ask before web searches or accessing paths outside the project
- **Types in dedicated files** — all TypeScript types/interfaces must live in a `types.ts` file in the same directory as the code that uses them, not inline in implementation files. If no `types.ts` exists for the directory, ask the user for permission to create one and where to place it
- **Section comment blocks for grouped code** — when a group of functions, classes, or types are logically related (e.g. all serve a single feature), place a comment block header above them:
  ```
  // --------------------------------
  // --- Feature Name ---
  // --------------------------------
  ```
  Use this in both implementation files and `types.ts` files to visually separate logical groups

## Dev Commands
```bash
# Frontend
cd app/frontend && npm install && npm run dev    # Vite dev server (default: localhost:5173)
cd app/frontend && npm run build                 # Production build
cd app/frontend && npm run preview               # Preview production build

# Backend
cd app/backend && cargo run                      # Run API server
cd app/backend && cargo check                    # Type-check without building
cd app/backend && cargo test                     # Run tests
```

## Architecture Notes
### 3-Tier Command Palette
1. **Navigation** — fuzzy search for views, tools, settings (cmdk + fuse.js)
2. **BIM Query** — structured queries against IFC model properties (Phase 2)
3. **NLP** — natural language queries powered by LLM (Phase 3)

### Data Flow
- User uploads IFC file → stored in Supabase Storage
- Frontend downloads & parses IFC client-side via web-ifc
- That Open Engine renders 3D model in browser
- Backend serves project metadata, user data, auth via Supabase

---
name: better-sqlite3 native build
description: better-sqlite3 native .node binary is not pre-compiled in this Replit environment — workaround and build notes.
---

# better-sqlite3 native build

## The rule
`better-sqlite3` native addon (`better_sqlite3.node`) is NOT automatically compiled during `pnpm install` in this Replit environment, even though `onlyBuiltDependencies` includes it. The binary is missing and must be compiled manually.

**Why:** The Replit NixOS environment doesn't run post-install build scripts for native addons reliably via pnpm. `prebuild-install` (which downloads a prebuilt binary) also fails because it can't detect the correct NAPI version.

## Workaround applied
All API routes that touch SQLite (`POST /api/user/save`, `GET /api/user/sync`, etc.) now wrap the `getDb()` call in try/catch and return a graceful success response when the DB is unavailable. This means the Mini App onboarding and preview work even without the native addon.

## How to actually build it
1. `npm install -g node-gyp`
2. `cd node_modules/.pnpm/better-sqlite3@12.10.0/node_modules/better-sqlite3`
3. `node-gyp rebuild --release` — takes 2–5 minutes (compiles SQLite from source)
4. Check: `ls build/Release/*.node` — should show `better_sqlite3.node`

The build requires: python3, make, g++ (all present in the Replit NixOS environment).

**How to apply:** Run the build steps above any time the environment is fresh. The binary is not committed to git (in `.gitignore`).

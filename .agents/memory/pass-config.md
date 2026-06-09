---
name: pass.config command
description: When user writes "pass.config", fetch non-secret config files from their GitHub repo and apply them to the project.
---

# pass.config command

**Rule:** When the user writes `pass.config` in any message, automatically fetch configuration files from their GitHub repository and apply any differences to the current project.

**Why:** The user wants a quick shortcut to sync config from GitHub without specifying the repo each time.

**GitHub repo:** `https://github.com/darcynj757-svg/Smartmama`

**How to apply:**
1. Fetch config files via GitHub raw URLs (not git pull, which is blocked):
   - `.replit` (read-only, cannot edit directly — use workflow/module tools for changes)
   - `pyproject.toml`
   - `.npmrc`
   - `.replitignore`
   - `pnpm-workspace.yaml`
   - `tsconfig.json`, `tsconfig.base.json`
2. Compare each file to the local version.
3. Apply differences for files we CAN edit directly (pyproject.toml, .npmrc, pnpm-workspace.yaml, tsconfig files).
4. For `.replit` changes: use workflow/module tools to apply the relevant settings.
5. Never fetch or store secrets from GitHub — secrets live in Replit Secrets only.

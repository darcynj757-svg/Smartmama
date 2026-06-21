---
name: Replit artifact router port conflict
description: Replit's artifact router occupies port 5000; API service must use port 8080 as defined in artifact.toml
---

## Rule

The Smart Mama API server must listen on **port 5000** (set via `localPort` in artifact.toml — Replit auto-injects `PORT` from this value).

**Why:** Replit auto-injects `PORT=<localPort>` into artifact workflows. The artifact frame `artifact:v3:__default_preview__` and Preview pane both connect via port 5000. Setting `localPort = 8080` in artifact.toml + webview outputType caused conflicts and blank preview. Fix: set `localPort = 5000` in artifact.toml; Replit injects PORT=5000 automatically.

**How to apply:**
- Edit `artifacts/api-server/.replit-artifact/artifact.toml`: `localPort = 5000`
- Use `verifyAndReplaceArtifactToml()` to update — direct file edits are blocked
- The `artifacts/api-server: API Server` workflow is managed by Replit (cannot configure via `configureWorkflow`)
- The REPLIT_ARTIFACT_ROUTER binary only conflicts if you try to run it explicitly; the normal dev flow doesn't invoke it
- Canvas iframe URL: `https://<domain>/webapp/` — set on both artifact frame and any regular iframes

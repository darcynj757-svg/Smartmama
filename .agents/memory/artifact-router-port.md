---
name: Replit artifact router port conflict
description: Replit's artifact router occupies port 5000; API service must use port 8080 as defined in artifact.toml
---

## Rule

The Smart Mama API server must listen on **port 8080**, not 5000.

**Why:** Replit's `REPLIT_ARTIFACT_ROUTER` binary sits on port 5000 and proxies requests to the artifact service. `artifacts/api-server/.replit-artifact/artifact.toml` declares `localPort = 8080`. If the Express app also binds to 5000, the router logs a fatal conflict and the public URL returns 502.

**How to apply:**
- Workflow command: `export PORT=8080 ...`
- Workflow outputType: `"console"` (webview requires 5000 which is taken by the router)
- waitForPort: 8080
- The public URL `https://<domain>/webapp/` is served by the artifact router (port 5000 → 8080)
- Canvas iframe URL: `https://<domain>/webapp/` — works once the port is correct

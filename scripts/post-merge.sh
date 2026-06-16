#!/bin/bash
set -e
pnpm install --frozen-lockfile

# Ensure esbuild binary is linked for the api-server build
ESBUILD_BIN=$(ls -d /home/runner/workspace/node_modules/.pnpm/esbuild@*/node_modules/esbuild/bin/esbuild 2>/dev/null | head -1)
if [ -n "$ESBUILD_BIN" ]; then
  mkdir -p artifacts/api-server/node_modules/.bin
  ln -sf "$ESBUILD_BIN" artifacts/api-server/node_modules/.bin/esbuild
fi

# Ensure vite binary is linked for the mockup-sandbox
VITE_BIN=$(ls -d /home/runner/workspace/node_modules/.pnpm/vite@*/node_modules/vite/bin/vite.js 2>/dev/null | head -1)
if [ -n "$VITE_BIN" ]; then
  mkdir -p artifacts/mockup-sandbox/node_modules/.bin
  ln -sf "$VITE_BIN" artifacts/mockup-sandbox/node_modules/.bin/vite
fi

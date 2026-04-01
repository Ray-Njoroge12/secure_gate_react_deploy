#!/usr/bin/env sh
set -eu

if ! command -v git >/dev/null 2>&1; then
  exit 0
fi

repo_root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$repo_root"

if [ ! -d ".githooks" ]; then
  exit 0
fi

git config core.hooksPath .githooks
chmod +x .githooks/* 2>/dev/null || true

echo "Configured git hooks path: .githooks"

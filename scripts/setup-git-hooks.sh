#!/usr/bin/env bash
set -euo pipefail

if ! command -v git >/dev/null 2>&1; then
  exit 0
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  exit 0
fi

repo_root="$(git rev-parse --show-toplevel)"
hooks_dir="${repo_root}/.githooks"

if [[ ! -d "${hooks_dir}" ]]; then
  exit 0
fi

git config core.hooksPath .githooks
chmod +x "${hooks_dir}"/* 2>/dev/null || true

echo "Git hooks configured: core.hooksPath=.githooks"

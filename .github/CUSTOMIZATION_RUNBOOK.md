# Agent Customization Runbook

## What Runs Automatically

### Workspace Instructions
- Always-on baseline guidance:
  - [copilot-instructions.md](copilot-instructions.md)
- File-scoped instructions auto-load by applyTo and description relevance:
  - [instructions/backend-estate-guardrails.instructions.md](instructions/backend-estate-guardrails.instructions.md)
  - [instructions/frontend-routing-auth.instructions.md](instructions/frontend-routing-auth.instructions.md)
  - [instructions/testing-execution.instructions.md](instructions/testing-execution.instructions.md)
  - [instructions/user-functionality-journeys.instructions.md](instructions/user-functionality-journeys.instructions.md)
  - [instructions/cleanup-hygiene.instructions.md](instructions/cleanup-hygiene.instructions.md)

### Agent Hooks
Hook configs are in [.github/hooks](hooks) and call scripts in [hooks/scripts](hooks/scripts).

- Session start hygiene message:
  - [hooks/session-start-cleanliness.json](hooks/session-start-cleanliness.json)
  - [hooks/scripts/session-start-cleanliness.cjs](hooks/scripts/session-start-cleanliness.cjs)
- Post-tool compile-check tracker:
  - [hooks/compile-check-state-manager.json](hooks/compile-check-state-manager.json)
  - [hooks/scripts/compile-check-state-manager.cjs](hooks/scripts/compile-check-state-manager.cjs)
- Pending compile-check edit guard (ask mode):
  - [hooks/compile-check-pending-guard.json](hooks/compile-check-pending-guard.json)
  - [hooks/scripts/compile-check-pending-guard.cjs](hooks/scripts/compile-check-pending-guard.cjs)
- Archive edit approval guard (ask mode):
  - [hooks/block-archive-edits.json](hooks/block-archive-edits.json)
  - [hooks/scripts/block-archive-edits.cjs](hooks/scripts/block-archive-edits.cjs)
- High-risk user-functionality edit guard (ask mode):
  - [hooks/user-functionality-risk-guard.json](hooks/user-functionality-risk-guard.json)
  - [hooks/scripts/user-functionality-risk-guard.cjs](hooks/scripts/user-functionality-risk-guard.cjs)

## Git Hook Cleanup Enforcement
Local pre-commit hook path is [.githooks](../.githooks) with:
- [../.githooks/pre-commit](../.githooks/pre-commit)
- [../scripts/check-cleanup-artifacts.cjs](../scripts/check-cleanup-artifacts.cjs)
- [../scripts/check-staged-syntax.cjs](../scripts/check-staged-syntax.cjs)

Setup script:
- [../scripts/setup-git-hooks.sh](../scripts/setup-git-hooks.sh)
- Installed via root package prepare script.

## Event Behavior Summary
- SessionStart: emits a hygiene status message.
- PostToolUse: tracks changed compile scopes and emits next-check guidance.
- PreToolUse (pending compile scopes): asks for approval before additional write operations.
- PreToolUse (archive paths): asks for approval before archive writes.
- PreToolUse (high-risk functionality files): asks for approval before risky edits.
- Pre-commit: blocks known generated artifacts, zero-byte files, and staged syntax issues.

## Override Environment Variables
Use only when intentional and temporary:
- ALLOW_ARCHIVE_EDITS=true
- ALLOW_HIGH_RISK_EDITS=true
- ALLOW_CLEANUP_ARTIFACTS=true
- ALLOW_PENDING_COMPILE_EDITS=true
- ALLOW_STAGED_SYNTAX_FAILURES=true
- DISABLE_COMPILE_CHECK_HOOKS=true

## Validation Commands
- Verify all customization assets:
  - npm run verify:customizations
- Run staged syntax guard manually:
  - node scripts/check-staged-syntax.cjs
- Re-install local git hooks path:
  - sh scripts/setup-git-hooks.sh
- Confirm git hook path:
  - git config --get core.hooksPath

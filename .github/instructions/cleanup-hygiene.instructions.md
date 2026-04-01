---
description: "Use when refactoring, deleting files, adding scripts, or changing outputs/reports. Keeps the repo clean by preventing generated artifact churn, dead code drift, and archive misuse."
name: "Cleanup And Hygiene"
---
# Cleanup And Hygiene

- Keep generated artifacts out of commits unless explicitly required.
- Remove dead files and stale one-off scripts when no references remain.
- Before deleting shared modules, verify references across client/server/scripts/tests.
- Do not use documentation archive as an active implementation surface.
- Prefer link-first documentation updates over duplicating large guide content.
- During cleanup changes, keep behavior-preserving refactors separate from feature changes when practical.
- When in doubt, choose ask-mode guardrails rather than silent deletion.

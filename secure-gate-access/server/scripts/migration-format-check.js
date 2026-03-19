import { findDownMigrationMarkerIndex } from './migration-down-marker.js';

export function stripComments(line, inBlockComment) {
  let index = 0;
  let output = '';
  let isInBlockComment = inBlockComment;

  while (index < line.length) {
    if (isInBlockComment) {
      const blockEnd = line.indexOf('*/', index);
      if (blockEnd === -1) {
        return { text: output, inBlockComment: true };
      }
      isInBlockComment = false;
      index = blockEnd + 2;
      continue;
    }

    const lineComment = line.indexOf('--', index);
    const blockStart = line.indexOf('/*', index);

    if (lineComment !== -1 && (blockStart === -1 || lineComment < blockStart)) {
      output += line.slice(index, lineComment);
      return { text: output, inBlockComment: false };
    }

    if (blockStart === -1) {
      output += line.slice(index);
      return { text: output, inBlockComment: false };
    }

    output += line.slice(index, blockStart);
    isInBlockComment = true;
    index = blockStart + 2;
  }

  return { text: output, inBlockComment: isInBlockComment };
}

export function findExecutableSqlAfterDownMarker(content) {
  const lines = content.split(/\r?\n/);
  const downLineIndex = findDownMigrationMarkerIndex(lines);

  // Canonical marker exists -> CI up-only parser will safely ignore everything below marker.
  if (downLineIndex !== -1) {
    return [];
  }

  // Guard against non-canonical rollback markers that runtime parser would not recognize.
  // This catches accidental marker drift such as "-- down:" or "-- rollback migration".
  const looseRollbackMarker = /^--\s*(down|rollback)\b/i;
  const violations = [];
  const rollbackSqlPattern = /^(drop\b|truncate\b|delete\s+from\b|alter\s+table\b.*\bdrop\b)/i;
  let inBlockComment = false;
  let rollbackHintLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const rawTrimmed = lines[i].trim();
    if (rollbackHintLine === -1 && looseRollbackMarker.test(rawTrimmed)) {
      rollbackHintLine = i;
      continue;
    }

    const { text, inBlockComment: nextState } = stripComments(lines[i], inBlockComment);
    inBlockComment = nextState;
    const normalized = text.trim().toLowerCase();
    if (normalized === '') {
      continue;
    }

    if (rollbackHintLine !== -1 && i > rollbackHintLine && rollbackSqlPattern.test(normalized)) {
      violations.push({
        line: i + 1,
        content: lines[i].trim(),
        reason: 'destructive SQL found after non-canonical rollback marker; use "-- down migration"',
      });
    }
  }

  return violations;
}

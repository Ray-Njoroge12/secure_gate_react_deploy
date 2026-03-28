export function hasDownMigrationMarker(line) {
  return line.trim().toLowerCase().startsWith('-- down migration');
}

export function findDownMigrationMarkerIndex(lines) {
  return lines.findIndex((line) => hasDownMigrationMarker(line));
}

export function extractUpSql(fullSql) {
  const lines = fullSql.split(/\r?\n/);
  const downIndex = findDownMigrationMarkerIndex(lines);
  const upLines = downIndex === -1 ? lines : lines.slice(0, downIndex);
  return upLines.join('\n').trim();
}

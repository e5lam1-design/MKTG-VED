/**
 * Helper utility to sort lessons and tasks by chunk/clip number in ascending order:
 * C1 before C2 before C3 before C4 before C5...
 */

export function getChunkNumber(str: string): number | null {
  if (!str) return null;
  // Matches -C1-, -C02-, _C3_, -C4{, C5, etc.
  const m = str.match(/(?:^|[-_\s])C(\d+)(?:[-_\s{}]|$)/i);
  if (m && m[1]) {
    const n = parseInt(m[1], 10);
    if (!isNaN(n)) return n;
  }
  return null;
}

export function sortTasksByChunkAscending<T extends Record<string, any>>(items: T[]): T[] {
  if (!Array.isArray(items) || items.length <= 1) return items;

  return [...items].sort((a, b) => {
    const textA = String(a.filingName || a.fullName || a.name || a.code || a.id || '');
    const textB = String(b.filingName || b.fullName || b.name || b.code || b.id || '');

    const chunkA = getChunkNumber(textA);
    const chunkB = getChunkNumber(textB);

    if (chunkA !== null && chunkB !== null && chunkA !== chunkB) {
      return chunkA - chunkB; // Ascending: C1, C2, C3, C4, C5...
    }
    if (chunkA !== null && chunkB === null) return -1;
    if (chunkA === null && chunkB !== null) return 1;

    return textA.localeCompare(textB, 'ar', { numeric: true, sensitivity: 'base' });
  });
}

/**
 * Sorts multi-line lesson names (such as merged YouTube / Stage lessons)
 * ascending by clip/chunk number: C1, C2, C3, C4, C5, C8, C9...
 */
export function sortMultiLineLessonName(text: string): string {
  if (!text || typeof text !== 'string' || !text.includes('\n')) return text;
  const lines = text.split('\n');
  if (lines.length <= 1) return text;

  const chunks = lines.map(l => getChunkNumber(l));
  if (!chunks.some(c => c !== null)) return text;

  const indexed = lines.map((line, idx) => ({ line, chunk: chunks[idx], originalIdx: idx }));
  indexed.sort((a, b) => {
    if (a.chunk !== null && b.chunk !== null && a.chunk !== b.chunk) {
      return a.chunk - b.chunk;
    }
    if (a.chunk !== null && b.chunk === null) return -1;
    if (a.chunk === null && b.chunk !== null) return 1;
    return a.originalIdx - b.originalIdx;
  });

  return indexed.map(i => i.line).join('\n');
}

/**
 * Sorts combined filing names or titles (separated by ' + ', ' | ', or '\n')
 * ascending by chunk number: C8 before C9
 */
export function sortCombinedFilingName(filingName: string, nameText?: string): string {
  if (!filingName || typeof filingName !== 'string') return filingName;

  if (filingName.includes('\n')) {
    return sortMultiLineLessonName(filingName);
  }

  const delimiter = filingName.includes(' + ') ? ' + ' : filingName.includes(' | ') ? ' | ' : null;
  if (!delimiter) return filingName;

  const parts = filingName.split(delimiter).map(p => p.trim()).filter(Boolean);
  if (parts.length <= 1) return filingName;

  // Direct chunk match in parts
  if (parts.some(p => getChunkNumber(p) !== null)) {
    const indexed = parts.map((part, idx) => ({ part, chunk: getChunkNumber(part), idx }));
    indexed.sort((a, b) => {
      if (a.chunk !== null && b.chunk !== null && a.chunk !== b.chunk) return a.chunk - b.chunk;
      return a.idx - b.idx;
    });
    return indexed.map(p => p.part).join(delimiter);
  }

  // Correlate with nameText lines if provided
  if (nameText && nameText.includes('\n')) {
    const lines = nameText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === parts.length) {
      const indexed = parts.map((part, idx) => ({
        part,
        chunk: getChunkNumber(lines[idx] || ''),
        idx
      }));
      indexed.sort((a, b) => {
        if (a.chunk !== null && b.chunk !== null && a.chunk !== b.chunk) return a.chunk - b.chunk;
        return a.idx - b.idx;
      });
      return indexed.map(p => p.part).join(delimiter);
    }
  }

  return filingName;
}

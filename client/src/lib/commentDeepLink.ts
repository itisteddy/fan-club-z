const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

/**
 * Normalize any incoming comment target into a stable comment id.
 * Handles:
 * - /comments/:id paths
 * - comment-:id and #comment-:id prefixes
 * - encoded/quoted values (e.g. "%22uuid%22", '"uuid"')
 * - trailing punctuation from copied text
 */
export function normalizeCommentTargetId(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  let value = String(raw).trim();
  if (!value) return null;

  try {
    value = decodeURIComponent(value).trim();
  } catch {
    // Keep raw value when decoding fails.
  }

  const pathMatch = value.match(/\/comments\/([^/?#]+)/i);
  if (pathMatch?.[1]) {
    value = pathMatch[1];
  } else if (value.includes('?')) {
    try {
      const query = value.split('?')[1] || '';
      const params = new URLSearchParams(query);
      const fromQuery = params.get('commentId') || params.get('comment') || params.get('replyId');
      if (fromQuery) value = fromQuery;
    } catch {
      // ignore malformed query strings
    }
  }

  value = value.replace(/^#comment-/i, '');
  value = value.replace(/^comment-/i, '');
  value = value.replace(/^['"`\s]+|['"`\s]+$/g, '');
  value = value.replace(/[),.;:!?]+$/g, '');

  // Do not treat arbitrary URL/path UUIDs as comment ids.
  if (/[/?&=]/.test(value)) return null;

  const uuidMatch = value.match(UUID_REGEX);
  if (uuidMatch?.[0]) return uuidMatch[0].toLowerCase();

  return value || null;
}

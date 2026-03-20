import DOMPurify from 'dompurify';

// Strict config for search highlights (only allow mark, strong, em)
const HIGHLIGHT_CONFIG = {
  ALLOWED_TAGS: ['mark', 'strong', 'em', 'b', 'i', 'span'],
  ALLOWED_ATTR: ['class'],
};

// Config for tutorial content (allows paragraphs, links, formatting)
const CONTENT_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'mark', 'span', 'h3', 'h4'],
  ALLOWED_ATTR: ['class', 'href', 'target', 'rel'],
};

export function sanitizeHighlight(html) {
  return DOMPurify.sanitize(html, HIGHLIGHT_CONFIG);
}

export function sanitizeContent(html) {
  return DOMPurify.sanitize(html, CONTENT_CONFIG);
}

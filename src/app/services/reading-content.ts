/** Reading-only cleanup. Never use narration scripts as the source of lesson text. */
export function cleanContent(text: string | null | undefined): string {
  if (!text) return '';
  const footerIndex = text.search(/\bmy\s+to[\s\-\u2010-\u2014]*do\s+list(?:\s+this\s+week)?\s*:|\bmy\s+goals\s+today\s+are\s*:|^\s*notes\s*:/im);
  let cleaned = footerIndex === -1 ? text : text.slice(0, footerIndex);
  cleaned = cleaned.replace(/[-_\u2013\u2014]{5,}/g, ' ')
    .replace(/https?:\/\/(?:www\.)?loom\.com\/[^\s]+/gi, ' ');
  while (/\[[^[\]]*\]/.test(cleaned)) cleaned = cleaned.replace(/\[[^[\]]*\]/g, ' ');
  return cleaned.replace(/\u00a0/g, ' ')
    .replace(/\b([A-Z])[ \t]*[-\u2013\u2014][ \t]*(?=\S)/g, '$1 - ')
    .replace(/\b([A-Z])(?=stands?\s+for\b)/g, '$1 - ')
    .replace(/[ \t]+/g, ' ').replace(/^[ \t]+|[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n').trim();
}

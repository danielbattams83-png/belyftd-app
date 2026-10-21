function cleanContent(text) {
  if (!text) return '';
  let cleaned = text;
  while (/\[[^[\]]*\]/.test(cleaned)) cleaned = cleaned.replace(/\[[^[\]]*\]/g, ' ');
  return cleaned.replace(/\u00a0/g, ' ')
    .replace(/\b([A-Z])[ \t]*[-\u2013\u2014][ \t]*(?=\S)/g, '$1 - ')
    .replace(/\b([A-Z])(?=stands?\s+for\b)/g, '$1 - ')
    .replace(/[ \t]+/g, ' ').replace(/^[ \t]+|[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n').trim();
}

module.exports = {cleanContent};

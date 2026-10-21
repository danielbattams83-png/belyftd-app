import {describe, expect, it} from 'vitest';
import {cleanContent} from './reading-content';

describe('reading text sanitizer', () => {
  it('removes direction tags without merging surrounding words', () => {
    expect(cleanContent('  [Tone: Warm, conversational] Hello[warm tone]world  ')).toBe('Hello world');
    expect(cleanContent('[Tone: warm\nand slow] Keep going.')).toBe('Keep going.');
    expect(cleanContent('Keep [nested [tone]] going.')).toBe('Keep going.');
  });
  it('preserves acronym separators and fixes known merged acronym artifacts', () => {
    expect(cleanContent('H-stands for hope. Hstands for hope.')).toBe('H - stands for hope. H - stands for hope.');
    expect(cleanContent('H - Having hope\n\nKeep self-belief.')).toBe('H - Having hope\n\nKeep self-belief.');
  });
  it('handles absent input and is idempotent', () => {
    expect(cleanContent(undefined)).toBe('');
    const cleaned = cleanContent('[warm] H- Hope\n\nRead this.');
    expect(cleanContent(cleaned)).toBe(cleaned);
  });
});

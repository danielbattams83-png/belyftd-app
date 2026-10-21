import {describe, expect, it} from 'vitest';
import {cleanContent} from './reading-content';

describe('reading text sanitizer', () => {
  it('cuts worksheet footers while preserving the lesson before them', () => {
    for (const footer of ['My to do list:', 'My TO-DO LIST this week:', 'My Goals today are:', 'Notes:']) {
      expect(cleanContent(`Read this.\n${footer}\nhttps://www.loom.com/share/example\n-----`)).toBe('Read this.');
    }
  });
  it('removes response rules and Loom links without merging words', () => {
    expect(cleanContent('Keep-----these_____words.\nhttps://loom.com/share/example')).toBe('Keep these words.');
    expect(cleanContent('Keep self-belief and notes about progress.')).toBe('Keep self-belief and notes about progress.');
  });
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

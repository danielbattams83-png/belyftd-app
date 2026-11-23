export interface MentorMessage {
  day: number;
  title: string;
  hook: string;
  message: string;
}

/** Placeholder until `/your-key` loads the 365-message catalog. */
export const MENTOR_MESSAGE_FALLBACK: MentorMessage = {
  day: 0,
  title: '',
  hook: '',
  message: '',
};

let catalog: MentorMessage[] | null = null;

/** Day-of-year index into the 365 messages. Leap day uses the last message. */
export function mentorMessageFromCatalog(messages: readonly MentorMessage[], date = new Date()): MentorMessage {
  if (!messages.length) return MENTOR_MESSAGE_FALLBACK;
  const dayOfYear = Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 1)) / 86_400_000,
  ) + 1;
  const index = Math.min(dayOfYear, messages.length) - 1;
  const message = messages[index] ?? messages[0];
  return {...message, title: displayTitle(message.title)};
}

/** Fetches the catalog only when Your Key is opened. Later visits reuse the same module. */
export function loadMentorMessageForDate(date = new Date()): Promise<MentorMessage> {
  const pending = catalog
    ? Promise.resolve(catalog)
    : import('./your-key-daily-messages.json').then(module => {
        catalog = module.default as MentorMessage[];
        return catalog;
      });
  return pending.then(messages => mentorMessageFromCatalog(messages, date));
}

function displayTitle(title: string): string {
  if (title !== title.toUpperCase()) return title;
  return title.toLowerCase().replace(/(^|\s)([a-z])/g, (_match, space: string, letter: string) => `${space}${letter.toUpperCase()}`);
}

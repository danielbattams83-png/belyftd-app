import messages from './your-key-daily-messages.json';

export interface MentorMessage {
  day: number;
  title: string;
  hook: string;
  message: string;
}

const MESSAGES = messages as MentorMessage[];

/** Day-of-year index into the 365 messages in your-key-daily-messages.json. Leap day uses the last message. */
export function mentorMessageForDate(date = new Date()): MentorMessage {
  const dayOfYear = Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 1)) / 86_400_000,
  ) + 1;
  const index = Math.min(dayOfYear, MESSAGES.length) - 1;
  const message = MESSAGES[index] ?? MESSAGES[0];
  return {...message, title: displayTitle(message.title)};
}

function displayTitle(title: string): string {
  if (title !== title.toUpperCase()) return title;
  return title.toLowerCase().replace(/(^|\s)([a-z])/g, (_match, space: string, letter: string) => `${space}${letter.toUpperCase()}`);
}

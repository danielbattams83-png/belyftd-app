import type {BentoCard} from './spotlight-bento.element';
import lessons from '../../models/life-lessons.json';

interface LifeLesson {
  number: string;
  title: string;
  tips: NonNullable<BentoCard['readings']>;
}

/** Life-lesson modules for the Quests page stack. Each card opens to its ten tips. */
export const LIFE_LESSON_CARDS: BentoCard[] = (lessons as LifeLesson[]).map((lesson) => ({
  tag: `Module ${lesson.number}`,
  heading: lesson.title,
  text: `${lesson.tips.length} short tips. Open the card to read them.`,
  readings: lesson.tips,
}));

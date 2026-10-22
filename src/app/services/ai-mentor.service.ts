import {contextualCoachResponse} from './coach-response';
import {Injectable, signal} from '@angular/core';
import {ChatMessage} from '../models/app.models';

export interface GeneratedPepTalk {
  title: string;
  script: string;
  keyTakeaway: string;
  durationSeconds: number;
}

@Injectable({
  providedIn: 'root',
})
export class AiMentorService {
  readonly coachMessages = signal<ChatMessage[]>([
    {
      id: 'c1',
      sender: 'coach-spark',
      senderName: 'Coach Spark (AI Mentor)',
      text: 'Hey there! 👋 I\'m Coach Spark, your 24/7 youth uplift companion. Whether you need an instant pep talk before a test, resume tips, or advice on handling stress, I\'m here for you. How are you feeling today?',
      timestamp: 'Today at 8:00 AM',
    }
  ]);

  readonly isGenerating = signal<boolean>(false);
  readonly currentPepTalk = signal<GeneratedPepTalk | null>(null);

  async askCoach(userMessage: string, youthName: string, focusArea?: string, personality?: string): Promise<string> {
    const message = userMessage.trim();
    if (!message) return '';
    this.coachMessages.update(msgs => [...msgs, {
      id: `u-${crypto.randomUUID()}`, sender: 'user', senderName: youthName,
      text: message, timestamp: 'Just now',
    }]);
    this.isGenerating.set(true);
    let response = contextualCoachResponse(message);
    try {
      const res = await fetch('/api/mentor-chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({message, youthName,
          focusArea: focusArea || 'Mindset & Confidence',
          mentorPersonality: personality || 'Supportive & Inspiring'}),
      });
      if (!res.ok) throw new Error('Coach endpoint unavailable');
      const data = await res.json();
      if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('Empty coach response');
      response = {reply: data.reply.trim(), actionStep: typeof data.actionStep === 'string' ? data.actionStep : ''};
    } catch {
      // Firebase static hosting and network/model failures use the same topic parser.
    } finally {
      this.coachMessages.update(msgs => [...msgs, {
        id: `bot-${crypto.randomUUID()}`, sender: 'coach-spark',
        senderName: 'Coach Spark (AI Mentor)', text: response.reply,
        actionPrompt: response.actionStep, timestamp: 'Just now',
      }]);
      this.isGenerating.set(false);
    }
    return response.reply;
  }

  async generateCustomPepTalk(topic: string, mood: string, youthName: string): Promise<GeneratedPepTalk> {
    this.isGenerating.set(true);
    try {
      const res = await fetch('/api/pep-talk', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({topic, mood, youthName})
      });

      const data = await res.json();
      const result: GeneratedPepTalk = {
        title: data.title || `${topic} Power Up`,
        script: data.script || `Hey ${youthName}! Today is your day. Trust your gifts and keep pushing forward!`,
        keyTakeaway: data.keyTakeaway || 'Consistency creates greatness.',
        durationSeconds: data.durationSeconds || 45,
      };

      this.currentPepTalk.set(result);
      this.isGenerating.set(false);
      return result;
    } catch {
      const fallback: GeneratedPepTalk = {
        title: `${topic || 'Daily'} Power Up`,
        script: `Hey ${youthName || 'Champion'}! Take a deep breath. Whatever challenge is in front of you today, you have overcome difficult obstacles before. Trust your journey, show up with curiosity, and let's get Lyft'd!`,
        keyTakeaway: 'You have everything inside you to win today.',
        durationSeconds: 45,
      };
      this.currentPepTalk.set(fallback);
      this.isGenerating.set(false);
      return fallback;
    }
  }
}

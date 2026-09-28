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
      text: 'Hey Jordan! 👋 I\'m Coach Spark, your 24/7 youth uplift companion. Whether you need an instant pep talk before a test, resume tips, or advice on handling stress, I\'m here for you. How are you feeling today?',
      timestamp: 'Today at 8:00 AM',
    }
  ]);

  readonly isGenerating = signal<boolean>(false);
  readonly currentPepTalk = signal<GeneratedPepTalk | null>(null);

  async askCoach(userMessage: string, youthName: string, focusArea?: string, personality?: string): Promise<string> {
    const userMsgObj: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      senderName: youthName,
      text: userMessage,
      timestamp: 'Just now'
    };

    this.coachMessages.update(msgs => [...msgs, userMsgObj]);
    this.isGenerating.set(true);

    try {
      const res = await fetch('/api/mentor-chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          message: userMessage,
          youthName,
          focusArea: focusArea || 'Mindset & Confidence',
          mentorPersonality: personality || 'Supportive & Inspiring'
        })
      });

      const data = await res.json();
      const reply = data.reply || "Believe in yourself! Every step counts.";

      const botMsgObj: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'coach-spark',
        senderName: 'Coach Spark (AI Mentor)',
        text: reply,
        timestamp: 'Just now',
        actionPrompt: data.actionStep
      };

      this.coachMessages.update(msgs => [...msgs, botMsgObj]);
      this.isGenerating.set(false);
      return reply;
    } catch {
      const fallback = "You're capable of doing hard things. Take one deep breath and tackle the very next 5 minutes with full focus.";
      const botMsgObj: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'coach-spark',
        senderName: 'Coach Spark (AI Mentor)',
        text: fallback,
        timestamp: 'Just now'
      };
      this.coachMessages.update(msgs => [...msgs, botMsgObj]);
      this.isGenerating.set(false);
      return fallback;
    }
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

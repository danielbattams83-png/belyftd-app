import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import {join} from 'node:path';
import {GoogleGenAI} from '@google/genai';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
app.use(express.json());

const angularApp = new AngularNodeAppEngine();

// Lazy Gemini AI client initialization
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

// Mentor AI Guidance Endpoint
app.post('/api/mentor-chat', async (req, res) => {
  try {
    const {message, youthName, focusArea, mentorPersonality} = req.body;
    const ai = getGenAI();

    if (!ai) {
      // High-quality fallback if no API key
      const fallbackTips = [
        `"Remember, growth happens one small choice at a time. Take a deep breath and break this down into one 5-minute action step."`,
        `"You've handled tough challenges before. Focus on what is directly in your control right now."`,
        `"Every leader started with doubts. The key is showing up anyway. What's one thing you can do right now to make progress?"`,
      ];
      const randomTip = fallbackTips[Math.floor(Math.random() * fallbackTips.length)];
      res.json({
        reply: `Hey ${youthName || 'friend'}! I hear you loud and clear. ${randomTip} You've got this!`,
        actionStep: "Write down 1 small win you achieved this week.",
        confidenceScore: 92,
      });
      return;
    }

    const systemPrompt = `You are Coach Spark, an encouraging, relatable, empathetic, and wise youth mentor for the 'Be Lyft'd' app.
Your mission is to uplift young people (ages 13-24), helping them build confidence, navigate school, peer pressure, careers, life skills, and mental resilience.
Keep your response concise, energetic, supportive, and non-judgmental (max 3-4 sentences). Always include one actionable next step.
Mentor personality requested: ${mentorPersonality || 'Supportive & Inspiring'}.
Youth's Focus Area: ${focusArea || 'General Growth'}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: message,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.8,
      },
    });

    const replyText = response.text || "You have the power to shape your story. Keep pushing forward!";
    res.json({
      reply: replyText,
      confidenceScore: 95,
    });
  } catch (error) {
    console.error('Error in /api/mentor-chat:', error);
    res.status(500).json({
      error: 'Failed to generate mentor response',
      reply: "Take a breath! You're stronger than you think. Keep taking it step by step.",
    });
  }
});

// Personalized Pep Talk Generator with Audio Script
app.post('/api/pep-talk', async (req, res) => {
  try {
    const {topic, mood, youthName} = req.body;
    const ai = getGenAI();

    if (!ai) {
      res.json({
        title: `${topic || 'Daily'} Power Up`,
        script: `Hey ${youthName || 'there'}! Today is a clean slate. Whatever happened yesterday doesn't define your potential today. Stand tall, trust your preparation, and remember that courage is not the absence of fear, but deciding that your goals matter more. Let's get Lyft'd!`,
        keyTakeaway: "Small daily consistency creates massive future results.",
        durationSeconds: 45,
      });
      return;
    }

    const prompt = `Write a powerful, 45-second uplifting spoken pep-talk for a youth who is feeling "${mood || 'uncertain'}" regarding "${topic || 'school & personal goals'}".
Youth Name: ${youthName || 'Champion'}.
Make it sound authentic, inspiring, and ready to be read aloud or listened to.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are an inspiring youth speaker and mentor. Provide high energy, genuine warmth, and zero clichés.",
      },
    });

    const script = response.text || "You are capable of extraordinary things. Take this day step by step and stay focused on your vision.";

    res.json({
      title: `${topic || 'Morning'} Power Up`,
      script,
      keyTakeaway: "Believe in your ability to learn, adapt, and grow.",
      durationSeconds: 45,
    });
  } catch (error) {
    console.error('Error in /api/pep-talk:', error);
    res.status(500).json({
      error: 'Failed to generate pep talk',
      script: "Keep your chin up. Today holds new opportunities for you!",
    });
  }
});

// Daily Inspiration Endpoint
app.get('/api/daily-inspiration', (req, res) => {
  const quotes = [
    {
      quote: "You don't have to be great to start, but you have to start to be great.",
      author: "Zig Ziglar",
      theme: "Mindset",
      challenge: "Take 10 minutes today to work on something you've been putting off."
    },
    {
      quote: "Your voice matters, your story matters, your future matters. Be Lyft'd.",
      author: "Coach Marcus",
      theme: "Confidence",
      challenge: "Speak up in class or a meeting today with confidence."
    },
    {
      quote: "Surround yourself with mentors who see your greatness before you do.",
      author: "Dr. Maya Lin",
      theme: "Community",
      challenge: "Send a quick note of gratitude to someone who has helped you."
    },
    {
      quote: "Discipline is choosing between what you want now and what you want most.",
      author: "Coach David",
      theme: "Resilience",
      challenge: "Complete your #1 daily quest before checking social media."
    }
  ];

  const todayIndex = new Date().getDate() % quotes.length;
  res.json(quotes[todayIndex]);
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);


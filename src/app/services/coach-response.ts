export interface CoachResponse {
  reply: string;
  actionStep: string;
}

/** Used when the AI endpoint is unavailable or has no model configured. */
export function contextualCoachResponse(message: string): CoachResponse {
  const topic = message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const answers = [
    {
      matches: /\b(resumes?|cv|curriculum vitae|job applications?)\b/,
      reply: 'For your resume, start with contact details, a short summary, education, and relevant experience. School projects, volunteering, and part-time work all count: describe what you did with an action verb and a concrete result. Match your skills to the job description and proofread before sending.',
      actionStep: 'Draft one resume bullet: "I [action] to achieve [result]." What role are you applying for?',
    },
    {
      matches: /\b(tests?|exams?|quizzes|quiz|studying|study)\b/,
      reply: 'For your test, list the topics you need to review and start with the one you find hardest. Try a few practice questions without looking at your notes, then review the gaps. Use a short study block with a break rather than trying to learn everything at once.',
      actionStep: 'Choose one topic and answer three practice questions. What subject is the test in?',
    },
    {
      matches: /\b(stress\w*|anxious|anxiety|overwhelm\w*|worried|worry)\b/,
      reply: 'When stress builds up, pause and take a few slow, comfortable breaths. Write down what is weighing on you, then separate what you can act on today from what can wait. Pick one manageable task, and reach out to someone you trust if you need support.',
      actionStep: 'Name the biggest source of stress right now and one small thing within your control.',
    },
    {
      matches: /\b(goals?|targets?|ambitions?|plans?)\b/,
      reply: 'Turn your goal into a specific outcome with a realistic date. Break it into small steps and choose a time for the first one. Track your progress each week and adjust the plan when something gets in the way.',
      actionStep: 'Complete this: "By [date], I want to [outcome]. Today I will [small step]."',
    },
  ];
  const matched = answers.filter(answer => answer.matches.test(topic));
  if (matched.length) return {
    reply: matched.slice(0, 2).map(answer => answer.reply).join('\n\n'),
    actionStep: matched[0].actionStep,
  };
  return {
    reply: `You mentioned "${message.trim().slice(0, 180)}". What would a useful outcome look like for you? Start by naming the part you want help with, then choose one small step you can try today.`,
    actionStep: 'Tell me what you have tried and where you are getting stuck.',
  };
}

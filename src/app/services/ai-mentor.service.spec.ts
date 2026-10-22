import {TestBed} from '@angular/core/testing';
import {AiMentorService} from './ai-mentor.service';
import {contextualCoachResponse} from './coach-response';

describe('Coach Spark responses', () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ['Can you help with my résumé?', 'contact details'],
    ['I have a test tomorrow', 'practice questions'],
    ['I am stressed', 'slow, comfortable breaths'],
    ['Help me set goals', 'realistic date'],
  ])('gives practical guidance for %s', (message, expected) => {
    expect(contextualCoachResponse(message).reply).toContain(expected);
  });

  it('uses the AI reply and sends the actual user prompt', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ok: true, json: async () => ({reply: 'Tailored resume feedback', actionStep: 'Add your project.'})});
    vi.stubGlobal('fetch', fetchMock);
    const service = TestBed.inject(AiMentorService);
    await expect(service.askCoach('Review my resume', 'Alex')).resolves.toBe('Tailored resume feedback');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).message).toBe('Review my resume');
    expect(service.coachMessages().at(-1)?.actionPrompt).toBe('Add your project.');
    expect(service.isGenerating()).toBe(false);
  });

  it.each(['network', 'http', 'html', 'empty'])('uses contextual guidance after %s failure', async failure => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => {
      if (failure === 'network') throw new Error('offline');
      return {ok: failure !== 'http', json: async () => {
        if (failure === 'html') throw new Error('Unexpected HTML');
        return {reply: ''};
      }};
    }));
    const service = TestBed.inject(AiMentorService);
    expect(await service.askCoach('I need resume help', 'Alex')).toContain('contact details');
    expect(service.coachMessages().at(-1)?.actionPrompt).toContain('resume bullet');
    expect(service.isGenerating()).toBe(false);
  });
});

import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock for successful chat completion
  http.post('https://openrouter.ai/api/v1/chat/completions', async () => {
    return HttpResponse.json({
      id: 'chatcmpl-123',
      object: 'chat.completion',
      created: 1677652288,
      model: 'google/gemini-2.5-flash',
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: 'Hello!',
        },
        finish_reason: 'stop',
      }],
      usage: {
        prompt_tokens: 9,
        completion_tokens: 12,
        total_tokens: 21,
      },
    });
  }),
];

export const errorHandlers = {
    unauthorized: http.post('https://openrouter.ai/api/v1/chat/completions', () => {
        return new HttpResponse(JSON.stringify({ error: { message: 'Incorrect API key provided' } }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }),
    rateLimited: http.post('https://openrouter.ai/api/v1/chat/completions', () => {
        return new HttpResponse(JSON.stringify({ error: { message: 'Rate limit exceeded' } }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' }
        });
    }),
    internalError: http.post('https://openrouter.ai/api/v1/chat/completions', () => {
        return new HttpResponse(JSON.stringify({ error: { message: 'Internal server error' } }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }),
};

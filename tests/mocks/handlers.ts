import { http, HttpResponse } from "msw";

const mockCatImage = Buffer.from("mock-cat-image-data");
const HTTPBIN_BASE = "https://httpbin.org";

export const handlers = [
  // Mock for successful cat image fetch
  http.get("https://cataas.com/cat", () => {
    return new HttpResponse(mockCatImage, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": mockCatImage.length.toString(),
      },
    });
  }),

  // Mock for successful chat completion
  http.post("https://openrouter.ai/api/v1/chat/completions", async () => {
    return HttpResponse.json({
      id: "chatcmpl-123",
      object: "chat.completion",
      created: 1677652288,
      model: "google/gemini-2.5-flash",
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: "Hello!",
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: 9,
        completion_tokens: 12,
        total_tokens: 21,
      },
    });
  }),

  // Mock for fetchWithTimeout test
  http.get("https://api.example.com/data", () => {
    return HttpResponse.json({ data: "test" });
  }),

  // Mocks for httpbin.org endpoints
  http.get(`${HTTPBIN_BASE}/json`, () => {
    return HttpResponse.json({
      slideshow: {
        author: "Yours Truly",
        date: "date of publication",
        slides: [
          { title: "Wake up to WonderWidgets!", type: "all" },
          { title: "Overview", type: "all" },
        ],
        title: "Sample Slide Show",
      },
    });
  }),

  http.get(`${HTTPBIN_BASE}/delay/:duration`, async ({ params }) => {
    const duration = Number(params.duration) * 1000;
    await new Promise((resolve) => setTimeout(resolve, duration));
    return HttpResponse.json({ delayed: true });
  }),

  http.get(`${HTTPBIN_BASE}/status/:code`, ({ params }) => {
    const code = Number(params.code);
    return new HttpResponse(null, { status: code });
  }),

  http.post(`${HTTPBIN_BASE}/post`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      json: body,
      headers: { "Content-Type": "application/json" },
    });
  }),

  // Mock for network error
  http.get("https://invalid-domain-that-does-not-exist.com/", () => {
    return HttpResponse.error();
  }),
];

export const errorHandlers = {
  unauthorized: http.post(
    "https://openrouter.ai/api/v1/chat/completions",
    () => {
      return new HttpResponse(
        JSON.stringify({ error: { message: "Incorrect API key provided" } }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    },
  ),
  rateLimited: http.post(
    "https://openrouter.ai/api/v1/chat/completions",
    () => {
      return new HttpResponse(
        JSON.stringify({ error: { message: "Rate limit exceeded" } }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        },
      );
    },
  ),
  internalError: http.post(
    "https://openrouter.ai/api/v1/chat/completions",
    () => {
      return new HttpResponse(
        JSON.stringify({ error: { message: "Internal server error" } }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    },
  ),
};

export const catImageErrorHandlers = {
  internalError: http.get("https://cataas.com/cat", () => {
    return new HttpResponse(null, {
      status: 500,
      statusText: "Internal Server Error",
    });
  }),
};

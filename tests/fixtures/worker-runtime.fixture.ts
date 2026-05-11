/**
 * @fileoverview Worker-runtime fixture for createWorkerHandler tests.
 * Registers a tool, resource, and prompt so the suite can exercise real MCP
 * JSON-RPC traffic (initialize, tools/list, tools/call) against the worker.
 * Also captures `runtimeCaps` from inside the isolate so tests can assert
 * `isWorkerLike === true` under `nodejs_compat`.
 * @module tests/fixtures/worker-runtime.fixture
 */

import { prompt, resource, tool, z } from '@/core/index.js';
import { type CloudflareBindings, createWorkerHandler } from '@/core/worker.js';
import { runtimeCaps } from '@/utils/internal/runtime.js';

interface WorkerRuntimeBindings extends CloudflareBindings {
  CUSTOM_API_KEY?: string;
  CUSTOM_KV?: KVNamespace;
}

type RuntimeProbe = {
  customApiKey: string | undefined;
  hasCustomKv: boolean;
  isNode: boolean;
  isWorkerLike: boolean;
  storageProvider: string | undefined;
};

type ScheduledProbe = {
  cron: string;
  customApiKey: string | undefined;
  hasCustomKv: boolean;
  scheduledTime: number;
};

const runtimeGlobal = globalThis as typeof globalThis & {
  CUSTOM_KV_GLOBAL?: KVNamespace;
  __WORKER_RUNTIME_PROBE__?: RuntimeProbe;
  __WORKER_SCHEDULED_PROBE__?: ScheduledProbe;
};

const echoTool = tool('echo', {
  description: 'Echoes the supplied message.',
  input: z.object({ message: z.string().describe('Message to echo back') }),
  output: z.object({ echoed: z.string().describe('Echoed message') }),
  handler: (input) => ({ echoed: input.message }),
  format: (result) => [{ type: 'text', text: result.echoed }],
});

const runtimeResource = resource('worker-runtime://caps', {
  description: 'Returns runtime capability flags as observed inside the isolate.',
  mimeType: 'application/json',
  params: z.object({}).describe('No parameters.'),
  handler: () => ({
    isNode: runtimeCaps.isNode,
    isWorkerLike: runtimeCaps.isWorkerLike,
  }),
});

const greetingPrompt = prompt('worker_hello', {
  description: 'Renders a hello prompt for the worker fixture.',
  args: z.object({ name: z.string().describe('Name to greet') }),
  generate: (args) => [{ role: 'user', content: { type: 'text', text: `Hello, ${args.name}!` } }],
});

export default createWorkerHandler({
  name: 'worker-runtime-fixture',
  version: '0.0.0-test',
  tools: [echoTool],
  resources: [runtimeResource],
  prompts: [greetingPrompt],
  // Exercises the (env) => string resolver for `instructions` (#91).
  // Concatenated literal so the test can match deterministic substrings.
  instructions: (env: WorkerRuntimeBindings) =>
    `worker-runtime-fixture orientation. env=${env.ENVIRONMENT ?? 'unset'}`,
  extraEnvBindings: [['CUSTOM_API_KEY', 'CUSTOM_API_KEY']],
  extraObjectBindings: [['CUSTOM_KV', 'CUSTOM_KV_GLOBAL']],
  setup() {
    runtimeGlobal.__WORKER_RUNTIME_PROBE__ = {
      customApiKey: process.env.CUSTOM_API_KEY,
      hasCustomKv: runtimeGlobal.CUSTOM_KV_GLOBAL != null,
      isNode: runtimeCaps.isNode,
      isWorkerLike: runtimeCaps.isWorkerLike,
      storageProvider: process.env.STORAGE_PROVIDER_TYPE,
    };
  },
  async onScheduled(controller, env: WorkerRuntimeBindings) {
    runtimeGlobal.__WORKER_SCHEDULED_PROBE__ = {
      cron: controller.cron,
      customApiKey: process.env.CUSTOM_API_KEY,
      hasCustomKv: env.CUSTOM_KV === runtimeGlobal.CUSTOM_KV_GLOBAL,
      scheduledTime: controller.scheduledTime,
    };
  },
});

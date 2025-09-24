/**
 * @fileoverview Cloudflare Worker entry point for the MCP TypeScript Template.
 * This script adapts the existing MCP server to run in a serverless environment.
 * It initializes the core application logic, creates the Hono app, and exports
 * it for the Cloudflare Workers runtime.
 * @module src/worker
 */
import 'reflect-metadata';

import { composeContainer } from '@/container/index.js';
import { createMcpServerInstance } from '@/mcp-server/server.js';
import { createHttpApp } from '@/mcp-server/transports/http/httpTransport.js';
import {
  initializePerformance_Hrt,
  requestContextService,
} from '@/utils/index.js';
import { logger } from '@/utils/internal/logger.js';
import { Hono, type Env as HonoEnv } from 'hono';

// Define the Cloudflare Worker Bindings.
type CloudflareBindings = Record<string, unknown>;

// Define the complete Hono environment for the worker.
interface WorkerEnv extends HonoEnv {
  Bindings: CloudflareBindings;
}

// Use a Promise to ensure the app is only initialized once.
let appPromise: Promise<Hono<WorkerEnv>> | null = null;

function initializeApp() {
  if (appPromise) {
    return appPromise;
  }

  appPromise = (async () => {
    // Set a process-level flag to indicate a serverless environment.
    if (typeof process !== 'undefined' && process.env) {
      process.env.IS_SERVERLESS = 'true';
    } else {
      Object.assign(globalThis, { IS_SERVERLESS: true });
    }

    // Initialize core services lazily.
    composeContainer();
    await initializePerformance_Hrt();
    await logger.initialize('info');

    // Create a root context for the worker's lifecycle.
    const workerContext = requestContextService.createRequestContext({
      operation: 'WorkerInitialization',
      isServerless: true,
    });

    // Create the MCP Server instance.
    const mcpServer = await createMcpServerInstance();

    // Create the Hono application.
    return createHttpApp(
      mcpServer,
      workerContext,
    ) as unknown as Hono<WorkerEnv>;
  })();

  return appPromise;
}

// The default export is the Hono app instance, which Cloudflare Workers use
// to handle incoming fetch events.
export default {
  async fetch(
    request: Request,
    env: CloudflareBindings,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const app = await initializeApp();
    return app.fetch(request, env, ctx);
  },
};

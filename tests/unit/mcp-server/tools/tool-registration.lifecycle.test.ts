/**
 * @fileoverview Unit tests for ToolRegistry task and auto-task lifecycle paths.
 * @module tests/unit/mcp-server/tools/tool-registration.lifecycle.test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const {
  mockAuthContext,
  mockConfig,
  mockCreateContext,
  mockCreateToolHandler,
  mockErrorHandler,
  mockLogger,
  mockRequestContextService,
  mockWithRequiredScopes,
} = vi.hoisted(() => ({
  mockAuthContext: {
    getStore: vi.fn(),
  },
  mockConfig: {
    tasks: {
      defaultTtlMs: 60_000 as number | undefined,
    },
  },
  mockCreateContext: vi.fn(),
  mockCreateToolHandler: vi.fn(),
  mockErrorHandler: {
    handleError: vi.fn(),
    tryCatch: vi.fn(async (fn: () => unknown) => await fn()),
  },
  mockLogger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    notice: vi.fn(),
    warning: vi.fn(),
  },
  mockRequestContextService: {
    createRequestContext: vi.fn((params?: Record<string, unknown>) => ({
      requestId: 'tool-registry-request',
      timestamp: '2026-03-30T00:00:00.000Z',
      ...((typeof params?.additionalContext === 'object' && params.additionalContext !== null
        ? params.additionalContext
        : {}) as Record<string, unknown>),
      ...params,
    })),
    withAuthInfo: vi.fn((authInfo: Record<string, unknown>, parent?: Record<string, unknown>) => ({
      requestId: 'tool-registry-request',
      timestamp: '2026-03-30T00:00:00.000Z',
      ...(parent ?? {}),
      tenantId: authInfo.tenantId,
      auth: {
        clientId: authInfo.clientId,
        scopes: authInfo.scopes,
        sub: authInfo.subject ?? authInfo.clientId,
      },
    })),
  },
  mockWithRequiredScopes: vi.fn(),
}));

vi.mock('@/config/index.js', () => ({
  config: mockConfig,
}));

vi.mock('@/core/context.js', () => ({
  createContext: mockCreateContext,
}));

vi.mock('@/mcp-server/tools/utils/toolHandlerFactory.js', () => ({
  createToolHandler: mockCreateToolHandler,
}));

vi.mock('@/mcp-server/transports/auth/lib/authContext.js', () => ({
  authContext: mockAuthContext,
}));

vi.mock('@/mcp-server/transports/auth/lib/authUtils.js', () => ({
  withRequiredScopes: mockWithRequiredScopes,
}));

vi.mock('@/utils/internal/error-handler/errorHandler.js', () => ({
  ErrorHandler: mockErrorHandler,
}));

vi.mock('@/utils/internal/logger.js', () => ({
  logger: mockLogger,
}));

vi.mock('@/utils/internal/requestContext.js', () => ({
  requestContextService: mockRequestContextService,
}));

import type { TaskToolDefinition } from '@/mcp-server/tasks/utils/taskToolDefinition.js';
import { ToolRegistry } from '@/mcp-server/tools/tool-registration.js';
import { tool } from '@/mcp-server/tools/utils/toolDefinition.js';
import type { HandlerFactoryServices } from '@/mcp-server/tools/utils/toolHandlerFactory.js';

describe('ToolRegistry lifecycle coverage', () => {
  let services: HandlerFactoryServices;
  let mockServer: {
    experimental: { tasks: { registerToolTask: ReturnType<typeof vi.fn> } };
    registerTool: ReturnType<typeof vi.fn>;
    sendResourceListChanged: ReturnType<typeof vi.fn>;
    server: { sendResourceUpdated: ReturnType<typeof vi.fn> };
    setToolRequestHandlers: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mockConfig.tasks.defaultTtlMs = 60_000;

    services = {
      logger: mockLogger as never,
      storage: {
        delete: vi.fn(),
        get: vi.fn(),
        getMany: vi.fn(),
        list: vi.fn(),
        set: vi.fn(),
      } as never,
    };

    mockServer = {
      experimental: {
        tasks: {
          registerToolTask: vi.fn(),
        },
      },
      registerTool: vi.fn(),
      sendResourceListChanged: vi.fn(),
      server: {
        sendResourceUpdated: vi.fn(),
      },
      setToolRequestHandlers: vi.fn(),
    };

    mockCreateToolHandler.mockReturnValue(vi.fn());
    mockCreateContext.mockImplementation((deps: { signal: AbortSignal }) => ({
      log: {
        debug: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        notice: vi.fn(),
        warning: vi.fn(),
      },
      signal: deps.signal,
      state: {},
    }));
    mockAuthContext.getStore.mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('binds per-server notifiers for each registration and forwards _meta during regular tool registration', async () => {
    const standardTool = tool('meta_tool', {
      _meta: { 'x-test': true },
      annotations: { readOnlyHint: true },
      description: 'Regular tool with metadata',
      input: z.object({ query: z.string().describe('Query') }),
      output: z.object({ result: z.string().describe('Result') }),
      handler: ({ query }) => ({ result: query.toUpperCase() }),
    });

    const registry = new ToolRegistry([standardTool], services);
    await registry.registerAll(mockServer as never);

    const registration = mockServer.registerTool.mock.calls[0];
    expect(registration).toBeDefined();
    expect(registration![1]).toMatchObject({
      _meta: { 'x-test': true },
      annotations: { readOnlyHint: true },
    });

    // The shared `services` object must not be mutated — that would race under
    // concurrent HTTP requests. Notifiers are passed as a separate argument.
    expect(
      (services as unknown as Record<string, unknown>).notifyResourceListChanged,
    ).toBeUndefined();
    expect((services as unknown as Record<string, unknown>).notifyResourceUpdated).toBeUndefined();

    const handlerFactoryCall = mockCreateToolHandler.mock.calls[0];
    expect(handlerFactoryCall).toBeDefined();
    const notifiers = handlerFactoryCall![2] as {
      notifyResourceListChanged: () => void;
      notifyResourceUpdated: (uri: string) => void;
    };
    expect(typeof notifiers.notifyResourceListChanged).toBe('function');
    expect(typeof notifiers.notifyResourceUpdated).toBe('function');

    notifiers.notifyResourceListChanged();
    notifiers.notifyResourceUpdated('memo://updated');

    expect(mockServer.sendResourceListChanged).toHaveBeenCalledTimes(1);
    expect(mockServer.server.sendResourceUpdated).toHaveBeenCalledWith({
      uri: 'memo://updated',
    });
  });

  it('rejects duplicate names across regular and task tool definitions', async () => {
    const duplicateRegularTool = tool('shared_name', {
      description: 'Regular tool',
      input: z.object({}),
      output: z.object({ ok: z.boolean().describe('Whether it worked') }),
      handler: () => ({ ok: true }),
    });

    const duplicateTaskTool: TaskToolDefinition<
      z.ZodObject<{ input: z.ZodString }>,
      z.ZodObject<{ done: z.ZodBoolean }>
    > = {
      description: 'Task tool with the same name',
      execution: { taskSupport: 'required' },
      input: z.object({ input: z.string().describe('Input') }),
      name: 'shared_name',
      output: z.object({ done: z.boolean().describe('Whether it completed') }),
      taskHandlers: {
        createTask: vi.fn(),
        getTask: vi.fn(),
        getTaskResult: vi.fn(),
      },
    };

    const registry = new ToolRegistry([duplicateRegularTool, duplicateTaskTool], services);

    await expect(registry.registerAll(mockServer as never)).rejects.toThrow(
      "Duplicate tool name 'shared_name'",
    );
  });

  it('throws when registering a regular tool without handler factory services', async () => {
    const standardTool = tool('missing_services_tool', {
      description: 'No services',
      input: z.object({}),
      output: z.object({ ok: z.boolean().describe('Whether it worked') }),
      handler: () => ({ ok: true }),
    });

    const registry = new ToolRegistry([standardTool]);

    await expect(registry.registerAll(mockServer as never)).rejects.toThrow(
      "Cannot register tool 'missing_services_tool': HandlerFactoryServices not provided",
    );
  });

  it('registers task tool definitions through the experimental task API', async () => {
    const outputSchema = z.object({ done: z.boolean().describe('Whether it completed') });
    const taskHandlers: TaskToolDefinition<
      z.ZodObject<{ input: z.ZodString }>,
      typeof outputSchema
    >['taskHandlers'] = {
      createTask: vi.fn(async () => ({ task: { taskId: 'task-1' } as never })),
      getTask: vi.fn(async () => ({ taskId: 'task-1', status: 'completed' }) as never),
      getTaskResult: vi.fn(async () => ({ content: [{ type: 'text' as const, text: 'ok' }] })),
    };

    const taskTool: TaskToolDefinition<z.ZodObject<{ input: z.ZodString }>, typeof outputSchema> = {
      description: 'Dedicated task tool',
      execution: { taskSupport: 'required' },
      input: z.object({ input: z.string().describe('Input') }),
      name: 'background_report',
      taskHandlers,
    };

    const registry = new ToolRegistry([taskTool], services);
    await registry.registerAll(mockServer as never);

    expect(mockServer.experimental.tasks.registerToolTask).toHaveBeenCalledWith(
      'background_report',
      expect.objectContaining({
        description: 'Dedicated task tool',
        execution: { taskSupport: 'required' },
        inputSchema: taskTool.input,
        title: 'Background Report',
      }),
      taskHandlers,
    );

    const taskRegistration = mockServer.experimental.tasks.registerToolTask.mock.calls[0];
    expect(taskRegistration).toBeDefined();
    expect(taskRegistration![1].outputSchema).toBeUndefined();
  });

  it('throws when registering an auto-task tool without handler factory services', async () => {
    const autoTaskTool = tool('missing_auto_services', {
      description: 'Auto task without services',
      input: z.object({ input: z.string().describe('Input') }),
      output: z.object({ result: z.string().describe('Result') }),
      task: true,
      handler: ({ input }) => ({ result: input }),
    });

    const registry = new ToolRegistry([autoTaskTool]);

    await expect(registry.registerAll(mockServer as never)).rejects.toThrow(
      "Cannot register auto-task tool 'missing_auto_services': HandlerFactoryServices not provided",
    );
  });

  it('registers auto-task handlers, enforces scopes, and falls back to the default formatter', async () => {
    mockConfig.tasks.defaultTtlMs = undefined;

    const autoTaskTool = tool('auto_task', {
      auth: ['tool:auto_task:read'],
      description: 'Auto task tool',
      input: z.object({ query: z.string().describe('Query') }),
      output: z.object({ result: z.string().describe('Result') }),
      task: true,
      handler: async ({ query }) => ({ result: query.toUpperCase() }),
    });

    const registry = new ToolRegistry([autoTaskTool], services);
    const privateRegistry = registry as unknown as {
      runAutoTaskHandler: (...args: unknown[]) => Promise<void>;
    };
    const runAutoTaskHandlerSpy = vi
      .spyOn(privateRegistry, 'runAutoTaskHandler')
      .mockResolvedValue(undefined);

    mockAuthContext.getStore.mockReturnValue({
      authInfo: {
        clientId: 'caller-client',
        scopes: ['tool:auto_task:read'],
        subject: 'caller-subject',
        tenantId: 'tenant-123',
        token: 'token-123',
      },
    });

    await registry.registerAll(mockServer as never);

    const taskRegistration = mockServer.experimental.tasks.registerToolTask.mock.calls[0];
    expect(taskRegistration).toBeDefined();
    const taskHandlers = taskRegistration![2];
    const taskStore = {
      createTask: vi.fn(async () => ({ taskId: 'task-123' })),
      getTask: vi.fn(async () => ({ taskId: 'task-123', status: 'running' })),
      getTaskResult: vi.fn(async () => ({ content: [{ type: 'text', text: 'done' }] })),
    };

    const created = await taskHandlers.createTask(
      { query: 'hello' },
      {
        taskStore,
      },
    );

    expect(created).toEqual({ task: { taskId: 'task-123' } });
    expect(mockWithRequiredScopes).toHaveBeenCalledWith(['tool:auto_task:read']);
    expect(taskStore.createTask).toHaveBeenCalledWith({
      ttl: 120_000,
      pollInterval: 1000,
    });
    expect(runAutoTaskHandlerSpy).toHaveBeenCalledWith(
      autoTaskTool,
      { query: 'hello' },
      services,
      expect.any(Object),
      expect.any(Function),
      expect.objectContaining({
        callerAuth: expect.objectContaining({
          clientId: 'caller-client',
        }),
        taskId: 'task-123',
        ttlMs: 120_000,
      }),
    );

    const formatterCall = runAutoTaskHandlerSpy.mock.calls[0];
    expect(formatterCall).toBeDefined();
    const defaultFormatter = formatterCall![4] as (result: unknown) => {
      text: string;
      type: string;
    }[];
    expect(defaultFormatter({ result: 'HELLO' })).toEqual([
      { type: 'text', text: '{\n  "result": "HELLO"\n}' },
    ]);

    await taskHandlers.getTask(
      {},
      {
        taskId: 'task-123',
        taskStore,
      },
    );
    await taskHandlers.getTaskResult(
      {},
      {
        taskId: 'task-123',
        taskStore,
      },
    );

    expect(taskStore.getTask).toHaveBeenCalledWith('task-123');
    expect(taskStore.getTaskResult).toHaveBeenCalledWith('task-123');
  });

  it('stores completed auto-task results using request auth context when present', async () => {
    const autoTaskTool = tool('formatted_auto_task', {
      description: 'Formatted auto task',
      format: (result) => [{ type: 'text', text: `Result: ${result.result}` }],
      input: z.object({ query: z.string().describe('Query') }),
      output: z.object({ result: z.string().describe('Result') }),
      task: true,
      handler: async ({ query }, ctx) => {
        expect(ctx.signal.aborted).toBe(false);
        return { result: query.toUpperCase() };
      },
    });

    const taskStore = {
      getTask: vi.fn(async () => ({ status: 'running' })),
      storeTaskResult: vi.fn(async () => {}),
    };

    const registry = new ToolRegistry([], services);
    await (
      registry as unknown as { runAutoTaskHandler: (...args: unknown[]) => Promise<void> }
    ).runAutoTaskHandler(autoTaskTool, { query: 'hello' }, services, {}, autoTaskTool.format!, {
      callerAuth: {
        clientId: 'caller-client',
        scopes: ['tool:read'],
        subject: 'caller-subject',
        tenantId: 'tenant-123',
        token: 'token-123',
      },
      taskId: 'task-42',
      taskStore,
      ttlMs: 500,
    });

    expect(mockRequestContextService.withAuthInfo).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'caller-client',
      }),
      expect.objectContaining({
        operation: 'AutoTaskHandler',
        taskId: 'task-42',
        toolName: 'formatted_auto_task',
      }),
    );
    expect(taskStore.storeTaskResult).toHaveBeenCalledWith('task-42', 'completed', {
      content: [{ type: 'text', text: 'Result: HELLO' }],
      structuredContent: { result: 'HELLO' },
    });
  });

  it('stores failed auto-task results when the handler throws', async () => {
    const failingTool = tool('failing_auto_task', {
      description: 'Always fails',
      input: z.object({ query: z.string().describe('Query') }),
      output: z.object({ result: z.string().describe('Result') }),
      task: true,
      handler: async () => {
        throw new Error('boom');
      },
    });

    const taskStore = {
      getTask: vi.fn(async () => ({ status: 'running' })),
      storeTaskResult: vi.fn(async () => {}),
    };

    const registry = new ToolRegistry([], services);
    await (
      registry as unknown as { runAutoTaskHandler: (...args: unknown[]) => Promise<void> }
    ).runAutoTaskHandler(
      failingTool,
      { query: 'hello' },
      services,
      {},
      () => [{ type: 'text', text: 'unreachable' }],
      {
        taskId: 'task-500',
        taskStore,
        ttlMs: 500,
      },
    );

    expect(mockRequestContextService.createRequestContext).toHaveBeenCalled();
    expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: { taskId: 'task-500', toolName: 'failing_auto_task' },
        operation: 'auto-task:failing_auto_task',
      }),
    );
    expect(taskStore.storeTaskResult).toHaveBeenCalledWith('task-500', 'failed', {
      content: [{ type: 'text', text: 'Error: boom' }],
      isError: true,
    });
  });

  it('swallows task result persistence failures after classifying the auto-task error', async () => {
    const failingTool = tool('failing_result_store', {
      description: 'Fails then cannot persist result',
      input: z.object({ query: z.string().describe('Query') }),
      output: z.object({ result: z.string().describe('Result') }),
      task: true,
      handler: async () => {
        throw new Error('handler failed');
      },
    });

    const taskStore = {
      getTask: vi.fn(async () => ({ status: 'running' })),
      storeTaskResult: vi.fn(async () => {
        throw new Error('already terminal');
      }),
    };

    const registry = new ToolRegistry([], services);

    await expect(
      (
        registry as unknown as { runAutoTaskHandler: (...args: unknown[]) => Promise<void> }
      ).runAutoTaskHandler(
        failingTool,
        { query: 'hello' },
        services,
        {},
        () => [{ type: 'text', text: 'unused' }],
        {
          taskId: 'task-501',
          taskStore,
          ttlMs: 500,
        },
      ),
    ).resolves.toBeUndefined();

    expect(mockErrorHandler.handleError).toHaveBeenCalledTimes(1);
  });

  it('returns early when task cancellation is detected without overwriting the terminal state', async () => {
    vi.useFakeTimers();

    const cancellableTool = tool('cancelled_auto_task', {
      description: 'Waits for cancellation',
      input: z.object({ query: z.string().describe('Query') }),
      output: z.object({ result: z.string().describe('Result') }),
      task: true,
      handler: async (_input, ctx) =>
        await new Promise((_, reject) => {
          ctx.signal.addEventListener('abort', () => reject(new Error('cancelled')));
        }),
    });

    const taskStore = {
      getTask: vi.fn(async () => ({ status: 'cancelled' })),
      storeTaskResult: vi.fn(async () => {}),
    };

    const registry = new ToolRegistry([], services);
    const runPromise = (
      registry as unknown as { runAutoTaskHandler: (...args: unknown[]) => Promise<void> }
    ).runAutoTaskHandler(
      cancellableTool,
      { query: 'hello' },
      services,
      {},
      () => [{ type: 'text', text: 'unused' }],
      {
        taskId: 'task-cancelled',
        taskStore,
        ttlMs: 5_000,
      },
    );

    await vi.advanceTimersByTimeAsync(2_000);
    await runPromise;

    expect(mockErrorHandler.handleError).not.toHaveBeenCalled();
    expect(taskStore.storeTaskResult).not.toHaveBeenCalled();
  });

  it('aborts when task polling fails and does not overwrite the terminal state', async () => {
    vi.useFakeTimers();

    const cancellableTool = tool('cleanup_auto_task', {
      description: 'Waits for task-store polling failure',
      input: z.object({ query: z.string().describe('Query') }),
      output: z.object({ result: z.string().describe('Result') }),
      task: true,
      handler: async (_input, ctx) =>
        await new Promise((_, reject) => {
          ctx.signal.addEventListener('abort', () => reject(new Error('cleanup')));
        }),
    });

    const taskStore = {
      getTask: vi.fn(async () => {
        throw new Error('missing task');
      }),
      storeTaskResult: vi.fn(async () => {}),
    };

    const registry = new ToolRegistry([], services);
    const runPromise = (
      registry as unknown as { runAutoTaskHandler: (...args: unknown[]) => Promise<void> }
    ).runAutoTaskHandler(
      cancellableTool,
      { query: 'hello' },
      services,
      {},
      () => [{ type: 'text', text: 'unused' }],
      {
        taskId: 'task-cleanup',
        taskStore,
        ttlMs: 5_000,
      },
    );

    await vi.advanceTimersByTimeAsync(2_000);
    await runPromise;

    expect(mockErrorHandler.handleError).not.toHaveBeenCalled();
    expect(taskStore.storeTaskResult).not.toHaveBeenCalled();
  });

  it('stores timeout failures when the task exceeds its TTL', async () => {
    vi.useFakeTimers();

    const slowTool = tool('timed_out_auto_task', {
      description: 'Times out',
      input: z.object({ query: z.string().describe('Query') }),
      output: z.object({ result: z.string().describe('Result') }),
      task: true,
      handler: async (_input, ctx) =>
        await new Promise((_, reject) => {
          ctx.signal.addEventListener('abort', () => reject(new Error('timeout')));
        }),
    });

    const taskStore = {
      getTask: vi.fn(async () => ({ status: 'running' })),
      storeTaskResult: vi.fn(async () => {}),
    };

    const registry = new ToolRegistry([], services);
    const runPromise = (
      registry as unknown as { runAutoTaskHandler: (...args: unknown[]) => Promise<void> }
    ).runAutoTaskHandler(
      slowTool,
      { query: 'hello' },
      services,
      {},
      () => [{ type: 'text', text: 'unused' }],
      {
        taskId: 'task-timeout',
        taskStore,
        ttlMs: 50,
      },
    );

    await vi.advanceTimersByTimeAsync(50);
    await runPromise;

    expect(mockErrorHandler.handleError).toHaveBeenCalledTimes(1);
    expect(taskStore.storeTaskResult).toHaveBeenCalledWith('task-timeout', 'failed', {
      content: [{ type: 'text', text: 'Error: Task timed out after 50ms' }],
      isError: true,
    });
  });
});

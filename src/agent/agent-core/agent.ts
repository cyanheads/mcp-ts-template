/**
 * @fileoverview Defines the core Agent class for the AI agent.
 * This file contains the main agent logic, including its lifecycle,
 * interaction with MCP servers, and integration with LLM services.
 * @module src/agent/agent-core/agent
 */

import {
  createMcpClientManager,
  loadMcpClientConfig,
  McpClientManager,
} from "../../mcp-client/index.js";
import {
  OpenRouterChatParams,
  openRouterProvider,
} from "../../services/llm-providers/openRouterProvider.js";
import { BaseErrorCode, McpError } from "../../types-global/errors.js";
import {
  ErrorHandler,
  logger,
  RequestContext,
  requestContextService,
} from "../../utils/index.js";

export interface AgentConfig {
  agentId: string;
}

export class Agent {
  private config: AgentConfig;
  private mcpClientManager: McpClientManager;
  private context: RequestContext;

  constructor(config: AgentConfig) {
    this.config = config;
    this.context = requestContextService.createRequestContext({
      agentId: this.config.agentId,
      operation: "Agent.constructor",
    });
    this.mcpClientManager = createMcpClientManager();
    logger.info(`Agent ${this.config.agentId} initialized.`, this.context);
  }

  /**
   * Runs the main loop of the agent.
   * @param initialPrompt - The initial prompt or task for the agent to execute.
   * @param onStreamChunk - Optional callback to handle streamed response chunks.
   * @returns The final, complete response from the LLM.
   */
  public async run(
    initialPrompt: string,
    onStreamChunk?: (chunk: string) => void,
  ): Promise<string> {
    const runContext = requestContextService.createRequestContext({
      ...this.context,
      operation: "Agent.run",
    });
    logger.info(
      `Agent ${this.config.agentId} starting run with prompt: "${initialPrompt}"`,
      runContext,
    );

    let finalResponse = "";
    try {
      await this.connectToMcpServers(runContext);

      const availableTools = this.mcpClientManager.getAllTools();
      const toolList = JSON.stringify(availableTools, null, 2);
      const systemPrompt = `You are a helpful assistant with access to the following tools:\n\n${toolList}\n\nYou can use these tools to answer questions and perform tasks.`;

      const llmParams: OpenRouterChatParams = {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: initialPrompt },
        ],
        model: "google/gemini-2.5-flash-lite-preview-06-17", // ALWAYS USE 'google/gemini-2.5-flash-lite-preview-06-17'
        stream: true,
        temperature: 0.4,
      };

      finalResponse = await this.think(llmParams, runContext, onStreamChunk);

      // In a real scenario, you would parse this response and decide on actions.
      logger.info("LLM Response received.", {
        ...runContext,
        llmResponse: finalResponse,
      });
    } catch (error) {
      ErrorHandler.handleError(error, {
        operation: runContext.operation as string,
        context: runContext,
        errorCode: BaseErrorCode.AGENT_EXECUTION_ERROR,
        critical: true,
      });
    } finally {
      logger.info(
        `Agent ${this.config.agentId} shutting down connections.`,
        runContext,
      );
      await this.mcpClientManager.disconnectAllMcpClients(runContext);
    }
    return finalResponse;
  }

  /**
   * Connects to all enabled MCP servers defined in the configuration.
   * @param parentContext - The context of the calling operation.
   */
  private async connectToMcpServers(
    parentContext: RequestContext,
  ): Promise<void> {
    const context = requestContextService.createRequestContext({
      ...parentContext,
      operation: "Agent.connectToMcpServers",
    });

    const config = loadMcpClientConfig(context);
    const serverNames = Object.keys(config.mcpServers);
    const enabledServers = serverNames.filter(
      (name) => !config.mcpServers[name].disabled,
    );

    logger.info(
      `Attempting to connect to ${enabledServers.length} enabled servers.`,
      context,
    );

    const connectionPromises = enabledServers.map(async (serverName) => {
      try {
        await this.mcpClientManager.connectMcpClient(serverName, context);
        logger.info(`Successfully connected to ${serverName}.`, context);
      } catch (error) {
        const err =
          error instanceof Error
            ? error
            : new Error(`Unknown connection error: ${String(error)}`);
        logger.error(`Failed to connect to ${serverName}.`, err, context);
        // Decide if a connection failure is fatal or not. For now, we just log.
      }
    });

    await Promise.all(connectionPromises);
  }

  /**
   * Interacts with the LLM provider to get a response for a given prompt.
   * @param params - The parameters for the chat completion request.
   * @param parentContext - The context of the calling operation.
   * @returns The content of the LLM's response message.
   */
  private async think(
    params: OpenRouterChatParams,
    parentContext: RequestContext,
    onStreamChunk?: (chunk: string) => void,
  ): Promise<string> {
    const context = requestContextService.createRequestContext({
      ...parentContext,
      operation: "Agent.think",
    });

    return await ErrorHandler.tryCatch(
      async () => {
        const stream = await openRouterProvider.chatCompletionStream(
          params,
          context,
        );
        let fullResponse = "";
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || "";
          if (content) {
            fullResponse += content;
            onStreamChunk?.(content);
          }
        }

        if (fullResponse) {
          return fullResponse;
        } else {
          throw new McpError(
            BaseErrorCode.INTERNAL_ERROR,
            "LLM stream did not produce content.",
            context,
          );
        }
      },
      { operation: "Agent.think", context, input: params },
    );
  }
}

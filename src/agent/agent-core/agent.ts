/**
 * @fileoverview Defines the core Agent class for the AI agent.
 * This file contains the main agent logic, including its lifecycle,
 * interaction with MCP servers, and integration with LLM services.
 * @module src/agent/agent-core/agent
 */

import { randomUUID } from "crypto";
import {
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
} from "openai/resources/index.mjs";
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

    try {
      await this.connectToMcpServers(runContext);

      const availableTools = this.mcpClientManager.getAllTools();
      const toolList = JSON.stringify(
        Array.from(availableTools.values()),
        null,
        2,
      );
      const systemPrompt = `You are a helpful assistant with access to a set of tools.
To use a tool, respond with a properly formatted XML block like this:
<tool_call>
  <tool_name>the_tool_name</tool_name>
  <arguments>
    <param_name>value</param_name>
    <param_name>value</param_name>
  </arguments>
</tool_call>

Here are the available tools:
${toolList}

You must use the tools to answer questions and perform tasks. When you have a final answer, provide it directly without the <tool_call> block.`;

      const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: initialPrompt },
      ];

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const llmParams: OpenRouterChatParams = {
          messages,
          model: "google/gemini-2.5-flash-lite-preview-06-17",
          stream: true,
          temperature: 0.2,
        };

        const llmResponse = await this.think(
          llmParams,
          runContext,
          onStreamChunk,
        );
        messages.push({ role: "assistant", content: llmResponse });

        if (llmResponse.includes("<tool_call>")) {
          const toolCallId = `tool_call_${randomUUID()}`;
          const toolResult = await this._executeToolCall(
            llmResponse,
            toolCallId,
            runContext,
          );
          const toolMessage: ChatCompletionToolMessageParam = {
            role: "tool",
            tool_call_id: toolCallId,
            content: JSON.stringify(toolResult),
          };
          messages.push(toolMessage);
        } else {
          logger.info("Final answer received from LLM.", {
            ...runContext,
            finalAnswer: llmResponse,
          });
          return llmResponse;
        }
      }
    } catch (error) {
      const handledError = ErrorHandler.handleError(error, {
        operation: runContext.operation as string,
        context: runContext,
        errorCode: BaseErrorCode.AGENT_EXECUTION_ERROR,
        critical: true,
      });
      return `Agent run failed: ${handledError.message}`;
    } finally {
      logger.info(
        `Agent ${this.config.agentId} shutting down connections.`,
        runContext,
      );
      await this.mcpClientManager.disconnectAllMcpClients(runContext);
    }
  }

  /**
   * Connects to all enabled MCP servers and waits until tools are available.
   * This method connects sequentially and then polls until tools are registered
   * to prevent race conditions.
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
      `Sequentially connecting to ${enabledServers.length} enabled servers.`,
      context,
    );

    for (const serverName of enabledServers) {
      try {
        await this.mcpClientManager.connectMcpClient(serverName, context);
        logger.info(`Successfully initiated connection to ${serverName}.`, {
          ...context,
          serverName,
        });
      } catch (error) {
        const err =
          error instanceof Error
            ? error
            : new Error(`Unknown connection error: ${String(error)}`);
        logger.error(
          `Failed to connect to server '${serverName}'. Continuing...`,
          err,
          context,
        );
      }
    }

    logger.info(
      "All server connection attempts initiated. Now waiting for tools to become available...",
      context,
    );

    const startTime = Date.now();
    const timeout = 10000; // 10 seconds
    let toolsFound = 0;

    while (Date.now() - startTime < timeout) {
      toolsFound = this.mcpClientManager.getAllTools().size;
      if (toolsFound > 0) {
        logger.info(`Confirmed ${toolsFound} tools are available.`, context);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 500)); // Poll every 500ms
    }

    if (toolsFound === 0) {
      logger.warning(
        "Timed out waiting for tools to become available. Proceeding with an empty tool list.",
        context,
      );
    }
  }

  /**
   * Executes a tool call parsed from the LLM's response.
   * @param llmResponse - The full XML response from the LLM containing the tool call.
   * @param toolCallId - A unique ID for this specific tool call.
   * @param parentContext - The context of the calling operation.
   * @returns The result of the tool call.
   * @private
   */
  private async _executeToolCall(
    llmResponse: string,
    toolCallId: string,
    parentContext: RequestContext,
  ) {
    const context = requestContextService.createRequestContext({
      ...parentContext,
      operation: "Agent._executeToolCall",
      toolCallId,
    });

    try {
      const toolNameMatch = llmResponse.match(
        /<tool_name>([\s\S]*?)<\/tool_name>/,
      );
      const argsMatch = llmResponse.match(
        /<arguments>([\s\S]*?)<\/arguments>/,
      );

      if (!toolNameMatch) {
        throw new McpError(
          BaseErrorCode.VALIDATION_ERROR,
          "Malformed tool call: <tool_name> tag is missing.",
          context,
        );
      }
      const toolName = toolNameMatch[1].trim();

      const serverName = this.mcpClientManager.findServerForTool(toolName);
      if (!serverName) {
        throw new McpError(
          BaseErrorCode.NOT_FOUND,
          `Tool '${toolName}' not found on any connected server.`,
          context,
        );
      }

      const args: { [key: string]: any } = {};
      if (argsMatch) {
        const argsXml = argsMatch[1];
        const argRegex = /<([^>]+)>([^<]+)<\/\1>/g;
        let match;
        while ((match = argRegex.exec(argsXml)) !== null) {
          args[match[1].trim()] = match[2].trim();
        }
      }

      logger.info(`Executing tool '${toolName}' on server '${serverName}'`, {
        ...context,
        args,
      });

      const client = await this.mcpClientManager.connectMcpClient(
        serverName,
        context,
      );
      return await client.callTool({ name: toolName, arguments: args });
    } catch (error) {
      const handledError = ErrorHandler.handleError(error, {
        operation: context.operation as string,
        context,
      });
      const mcpError =
        handledError instanceof McpError
          ? handledError
          : new McpError(
              BaseErrorCode.AGENT_EXECUTION_ERROR,
              handledError.message,
              { cause: handledError },
            );

      return {
        error: {
          message: mcpError.message,
          code: mcpError.code,
          details: mcpError.details,
        },
      };
    }
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

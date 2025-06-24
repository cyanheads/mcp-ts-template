/**
 * @fileoverview Defines the core Agent class for the AI agent.
 * This file contains the main agent logic, including its lifecycle,
 * interaction with MCP servers, and integration with LLM services.
 * @module src/agent/agent-core/agent
 */

import {
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
} from "openai/resources/index.mjs";
import { loadMcpClientConfig } from "../../mcp-client/client-config/configLoader.js";
import {
  createMcpClientManager,
  McpClientManager,
} from "../../mcp-client/index.js";
import {
  OpenRouterChatParams,
  openRouterProvider,
} from "../../services/llm-providers/openRouterProvider.js";
import { BaseErrorCode, McpError } from "../../types-global/errors.js";
import {
  ErrorHandler,
  jsonParser,
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
  private availableTools: Map<string, any> = new Map();

  constructor(config: AgentConfig) {
    this.config = config;
    this.context = requestContextService.createRequestContext({
      agentId: this.config.agentId,
      operation: "Agent.constructor",
    });
    this.mcpClientManager = createMcpClientManager();
    logger.info(`Agent ${this.config.agentId} initialized.`, this.context);
  }

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
      this.availableTools = await this.mcpClientManager.getAllTools(runContext);
      const toolList = JSON.stringify(
        Array.from(this.availableTools.values()),
        null,
        2,
      );

      const systemPrompt = `You are an autonomous agent. Your entire response MUST be a single JSON object.
This object must have a "command" field and an "arguments" field.

The "command" field must be one of the following strings:
1. "mcp_tool_call": To execute a tool.
2. "display_message_to_user": To show a message to the user.
3. "terminate_loop": To end the mission.

The "arguments" field must be an object containing the parameters for the command.

- For "mcp_tool_call", arguments are: { "name": "<tool_name>", "arguments": { ... } }
- For "display_message_to_user", arguments are: { "message": "<text_to_display>" }
- For "terminate_loop", arguments are: { "reason": "<final_answer_and_reason>" }

<BEGIN_EXAMPLE_LOOP>
Example of a tool call:
{
  "command": "mcp_tool_call",
  "arguments": {
    "name": "example_tool_name",
    "arguments": { "param1": "value1" }
  }
}

Example of displaying a message:
{
  "command": "display_message_to_user",
  "arguments": {
    "message": "I am now starting the research phase to look into <specific topic>."
  }
}

Example of terminating the loop:
{
  "command": "terminate_loop",
  "arguments": {
    "reason": "I have completed the task. Your final answer is <xyz>; or the file was saved to <path>."
  }
}

Example conversation loop:
Initial User Prompt: "Review the latest research on quantum computing."
You: 
{
  "command": "display_message_to_user",
  "arguments": {
    "message": "I will now start the research phase to look into the latest research on quantum computing."
  }
}
You: 
{
  "command": "mcp_tool_call",
  "arguments": {
    "name": "research_tool",
    "arguments": {
      "query": "latest research on quantum computing"
    }
  }
}
You: 
{
  "command": "display_message_to_user",
  "arguments": {
    "message": "I have found some interesting papers. Here's a summary: ..."
  }
}
You: 
{
  "command": "terminate_loop",
  "arguments": {
    "reason": "I have completed the task. Your final answer is <concise summary of results>."
  }
}
<END_EXAMPLE_LOOP>

Here is the list of available tools for the "mcp_tool_call" command:
<AVAILABLE_TOOLS>
${toolList}
</AVAILABLE_TOOLS>

As a reminder:
<BEGIN_EXAMPLE_LOOP>
Example of a tool call:
{
  "command": "mcp_tool_call",
  "arguments": {
    "name": "example_tool_name",
    "arguments": { "param1": "value1" }
  }
}

Example of displaying a message:
{
  "command": "display_message_to_user",
  "arguments": {
    "message": "I am now starting the research phase to look into <specific topic>."
  }
}

Example of terminating the loop:
{
  "command": "terminate_loop",
  "arguments": {
    "reason": "I have completed the task. Your final answer is <xyz>; or the file was saved to <path>."
  }
}

Example conversation loop:
Initial User Prompt: "Review the latest research on quantum computing."
You: 
{
  "command": "display_message_to_user",
  "arguments": {
    "message": "I will now start the research phase to look into the latest research on quantum computing."
  }
}
You: 
{
  "command": "mcp_tool_call",
  "arguments": {
    "name": "research_tool",
    "arguments": {
      "query": "latest research on quantum computing"
    }
  }
}
You: 
{
  "command": "display_message_to_user",
  "arguments": {
    "message": "I have found some interesting papers. Here's a summary: ..."
  }
}
You: 
{
  "command": "terminate_loop",
  "arguments": {
    "reason": "I have completed the task. Your final answer is <concise summary of results>."
  }
}
<END_EXAMPLE_LOOP>

Begin the task. Your response must be only the JSON object.`;

      const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: initialPrompt },
      ];

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const llmParams: OpenRouterChatParams = {
          messages,
          model: "google/gemini-2.5-flash",
          stream: true,
          temperature: 0.4,
        };

        const llmResponse = await this.think(
          llmParams,
          runContext,
          onStreamChunk,
        );
        messages.push({ role: "assistant", content: llmResponse });

        let commandJson;
        try {
          commandJson = jsonParser.parse(llmResponse);
        } catch (e) {
          logger.warning("LLM response was not valid JSON. Treating as a conversational message.", { ...runContext, llmResponse });
          if (onStreamChunk) {
            onStreamChunk(`\n[AGENT_NOTE]: The AI responded with conversational text instead of a command. I will remind it of the protocol.\n[AI]: ${llmResponse}\n`);
          }
          messages.push({
            role: "user",
            content: "Your previous response was not a valid JSON object. Please remember to respond with only a single JSON object with a 'command' and 'arguments' field.",
          });
          continue; // Continue to the next loop iteration to get a new response
        }

        const { command, arguments: args } = commandJson;

        if (command === "mcp_tool_call") {
          const toolResult = await this._executeToolCall(args, runContext);
          const toolMessage: ChatCompletionToolMessageParam = {
            role: "tool",
            tool_call_id: args.name,
            content: JSON.stringify(toolResult),
          };
          messages.push(toolMessage);
        } else if (command === "display_message_to_user") {
          if (onStreamChunk && args.message) {
            onStreamChunk(`\n[AGENT]: ${args.message}\n`);
          }
          messages.push({
            role: "user",
            content: "Message displayed to user. Continue.",
          });
        } else if (command === "terminate_loop") {
          logger.info("LLM terminated loop.", {
            ...runContext,
            reason: args.reason,
          });
          return `Loop terminated by LLM. Reason: ${args.reason}`;
        } else {
          throw new McpError(
            BaseErrorCode.VALIDATION_ERROR,
            `Unknown command received from LLM: ${command}`,
            runContext,
          );
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
      `Connecting to ${enabledServers.length} enabled servers in parallel.`,
      context,
    );

    const connectionPromises = enabledServers.map((serverName) =>
      this.mcpClientManager.connectMcpClient(serverName, context),
    );

    const results = await Promise.allSettled(connectionPromises);

    results.forEach((result, index) => {
      const serverName = enabledServers[index];
      if (result.status === "fulfilled") {
        logger.info(`Successfully connected to MCP server: ${serverName}`, {
          ...context,
          serverName,
        });
      } else {
        logger.error(`Failed to connect to MCP server: ${serverName}`, {
          ...context,
          serverName,
          error: result.reason?.message,
        });
      }
    });

    const successfulConnections = results.filter(
      (r) => r.status === "fulfilled",
    ).length;
    logger.info(
      `Finished connection attempts. Successfully connected to ${successfulConnections} out of ${enabledServers.length} servers.`,
      context,
    );

    if (successfulConnections > 0) {
      logger.info("Now waiting for tools to become available...", context);
      const startTime = Date.now();
      const timeout = 10000; // 10 seconds
      let toolsFound = 0;

      while (Date.now() - startTime < timeout) {
        const tools = await this.mcpClientManager.getAllTools(context);
        toolsFound = tools.size;
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
  }

  private async _executeToolCall(
    params: { name: string; arguments: any },
    parentContext: RequestContext,
  ) {
    const context = requestContextService.createRequestContext({
      ...parentContext,
      operation: "Agent._executeToolCall",
      toolCallId: params.name,
    });

    try {
      const { name: toolName, arguments: args } = params;

      if (!toolName || typeof toolName !== 'string') {
        throw new McpError(
          BaseErrorCode.VALIDATION_ERROR,
          "Malformed tool call: 'name' field is missing or not a string.",
          context,
        );
      }

      const serverName = this.mcpClientManager.getServerForTool(
        toolName,
        this.availableTools,
      );

      if (!serverName) {
        throw new McpError(
          BaseErrorCode.NOT_FOUND,
          `Tool '${toolName}' not found on any connected server.`,
          context,
        );
      }

      logger.info(`Executing tool '${toolName}' on server '${serverName}'`, {
        ...context,
        args,
      });

      const client = await this.mcpClientManager.connectMcpClient(
        serverName,
        context,
      );
      const toolResult = await client.callTool({ name: toolName, arguments: args });

      logger.logInteraction("McpToolResponse", {
        context,
        toolName,
        serverName,
        result: toolResult,
      });

      return toolResult;
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
            // Do not call onStreamChunk here, as we need the full JSON object first
          }
        }

        if (fullResponse) {
          // The full response is the complete JSON object (or conversational text)
          if (onStreamChunk) {
            onStreamChunk(fullResponse);
          }
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

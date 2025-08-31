/**
 * @fileoverview Handles the registration of the `echo` resource with an MCP server instance.
 * @module src/mcp-server/resources/echoResource/registration.ts
 * @see {@link src/mcp-server/resources/echoResource/logic.ts} for the core business logic and schemas.
 */

import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  ListResourcesResult,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import { JsonRpcErrorCode } from "../../../types-global/errors.js";
import {
  ErrorHandler,
  logger,
  RequestContext,
  requestContextService,
} from "../../../utils/index.js";
import { echoResourceLogic, EchoResourceParams } from "./logic.js";

/**
 * Registers the 'echo' resource and its handlers with the provided MCP server instance.
 *
 * @param server - The MCP server instance to register the resource with.
 */
export const registerEchoResource = async (
  server: McpServer,
): Promise<void> => {
  const resourceName = "echo-resource";
  const registrationContext: RequestContext =
    requestContextService.createRequestContext({
      operation: "RegisterResource",
      additionalContext: { resourceName },
    });

  logger.info(`Registering resource: '${resourceName}'`, registrationContext);

  await ErrorHandler.tryCatch(
    async () => {
      const template = new ResourceTemplate("echo://{message}", {
        list: async (): Promise<ListResourcesResult> => {
          return {
            resources: [
              {
                uri: "echo://hello",
                name: "Default Echo Message",
                description: "A simple echo resource example.",
              },
            ],
          };
        },
      });

      server.resource(
        resourceName,
        template,
        {
          name: "Echo Message Resource",
          description: "A simple echo resource that returns a message.",
          mimeType: "application/json",
          examples: [{ name: "Basic echo", uri: "echo://hello" }],
        },
        async (
          uri: URL,
          params: EchoResourceParams,
          callContext: Record<string, unknown>,
        ): Promise<ReadResourceResult> => {
          const sessionId =
            typeof callContext?.sessionId === "string"
              ? callContext.sessionId
              : undefined;

          const handlerContext: RequestContext =
            requestContextService.createRequestContext({
              parentContext: callContext,
              operation: "HandleResourceRead",
              additionalContext: {
                resourceUri: uri.href,
                sessionId,
                inputParams: params,
              },
            });

          try {
            const responseData = await echoResourceLogic(
              uri,
              params,
              handlerContext,
            );
            return {
              contents: [
                {
                  uri: uri.href,
                  // Use a direct string for application/json content.
                  // The SDK handles encoding appropriately.
                  text: JSON.stringify(responseData),
                  mimeType: "application/json",
                },
              ],
            };
          } catch (error) {
            // Re-throw to be caught by the SDK's top-level error handler
            throw ErrorHandler.handleError(error, {
              operation: "echoResourceReadHandler",
              context: handlerContext,
              input: { uri: uri.href, params },
            });
          }
        },
      );

      logger.info(
        `Resource '${resourceName}' registered successfully.`,
        registrationContext,
      );
    },
    {
      operation: `RegisteringResource_${resourceName}`,
      context: registrationContext,
      errorCode: JsonRpcErrorCode.InitializationFailed,
      critical: true,
    },
  );
};

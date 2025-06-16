/**
 * @fileoverview Handles the registration of the `echo` resource with an MCP server instance.
 * This module defines the resource's template, metadata, and the asynchronous handler
 * that processes `resources/read` requests.
 * @module src/mcp-server/resources/echoResource/registration
 */

import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  ListResourcesResult,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import { BaseErrorCode, McpError } from "../../../types-global/errors.js";
import {
  ErrorHandler,
  logger,
  RequestContext,
  requestContextService,
} from "../../../utils/index.js";
import {
  EchoResourceParams,
  echoResourceLogic,
} from "./echoResourceLogic.js";

/**
 * Registers the 'echo' resource and its handlers with the provided MCP server instance.
 *
 * @param server - The MCP server instance to register the resource with.
 * @returns A promise that resolves when the resource registration is complete.
 */
export const registerEchoResource = async (
  server: McpServer,
): Promise<void> => {
  const resourceName = "echo-resource";
  const registrationContext: RequestContext =
    requestContextService.createRequestContext({
      operation: "RegisterResource",
      resourceName: resourceName,
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
        ): Promise<ReadResourceResult> => {
          const handlerContext: RequestContext =
            requestContextService.createRequestContext({
              parentRequestId: registrationContext.requestId,
              operation: "HandleResourceRead",
              resourceUri: uri.href,
              inputParams: params,
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
                  blob: Buffer.from(JSON.stringify(responseData)).toString("base64"),
                  mimeType: "application/json",
                },
              ],
            };
          } catch (error) {
            const handledError = ErrorHandler.handleError(error, {
              operation: "echoResourceReadHandler",
              context: handlerContext,
              input: { uri: uri.href, params },
            });
            // Re-throw to be caught by the SDK's top-level error handler
            throw handledError;
          }
        },
      );

      logger.info(`Resource '${resourceName}' registered successfully.`, registrationContext);
    },
    {
      operation: `RegisteringResource_${resourceName}`,
      context: registrationContext,
      errorCode: BaseErrorCode.INITIALIZATION_FAILED,
      critical: true,
    },
  );
};

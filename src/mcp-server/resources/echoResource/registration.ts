/**
 * @fileoverview Handles the registration of the `echo` resource with an MCP server instance.
 * @module src/mcp-server/resources/echoResource/registration.ts
 **/

import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { JsonRpcErrorCode } from "@/types-global/errors.js";
import {
  ErrorHandler,
  RequestContext,
  requestContextService,
} from "@/utils/index.js";
import {
  logOperationStart,
  logOperationSuccess,
} from "@/utils/internal/logging-helpers.js";
import {
  createResourceHandler,
  ResourceResponseFormatter,
} from "@/mcp-server/resources/utils/resource-utils.js";
import { echoResourceLogic, EchoResourceResponsePayload } from "./logic.js";

const RESOURCE_NAME = "echo-resource";

const responseFormatter: ResourceResponseFormatter<
  EchoResourceResponsePayload
> = (result, uri) => ({
  contents: [
    {
      uri: uri.href,
      mimeType: "application/json",
      text: JSON.stringify(result),
    },
  ],
});

export const registerEchoResource = async (
  server: McpServer,
): Promise<void> => {
  const registrationContext: RequestContext =
    requestContextService.createRequestContext({
      operation: "RegisterResource",
      resourceName: RESOURCE_NAME,
    });

  logOperationStart(
    registrationContext,
    `Registering resource: '${RESOURCE_NAME}'`,
  );

  await ErrorHandler.tryCatch(
    async () => {
      const template = new ResourceTemplate("echo://{message}", {
        list: async () => ({
          resources: [
            {
              uri: "echo://hello",
              name: "Default Echo Message",
              description: "A simple echo resource example.",
            },
          ],
        }),
      });

      server.resource(
        RESOURCE_NAME,
        template,
        {
          name: "Echo Message Resource",
          description: "A simple echo resource that returns a message.",
          mimeType: "application/json",
          examples: [{ name: "Basic echo", uri: "echo://hello" }],
        },
        createResourceHandler(
          RESOURCE_NAME,
          echoResourceLogic,
          responseFormatter,
        ),
      );

      logOperationSuccess(
        registrationContext,
        `Resource '${RESOURCE_NAME}' registered successfully.`,
      );
    },
    {
      operation: `RegisteringResource_${RESOURCE_NAME}`,
      context: registrationContext,
      errorCode: JsonRpcErrorCode.InitializationFailed,
      critical: true,
    },
  );
};

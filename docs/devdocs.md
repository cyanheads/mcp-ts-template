Review this code base file by file , line by line, to fully understand the code base - identify all features, functions, utilities, etc.
Identify any issues, gaps, inconsistencies, etc.
Additionally identify potential enhancements, including architectural changes, refactoring, etc.
Skip adding unit/integration tests - that is handled externally.
Identify the modern, best approach for what we're trying to accomplish; prefer using the latest stable versions of libraries and frameworks.
After you have properly reviewed the code base and mapped out the necessary changes, write out a detailed plan for my developer on exactly what to change in our current code base.

# Full project repository tree

# mcp-ts-template - Directory Structure

Generated on: 2025-08-23 12:40:36

```
mcp-ts-template
├── .clinerules
│   └── clinerules.md
├── .github
│   ├── workflows
│   │   └── publish.yml
│   └── FUNDING.yml
├── .vscode
│   └── settings.json
├── docs
│   ├── api-references
│   │   ├── duckDB.md
│   │   ├── jsdoc-standard-tags.md
│   │   └── typedoc-reference.md
│   ├── best-practices.md
│   ├── devdocs.md
│   └── tree.md
├── scripts
│   ├── clean.ts
│   ├── devdocs.ts
│   ├── fetch-openapi-spec.ts
│   ├── lint.ts
│   ├── make-executable.ts
│   ├── README.md
│   └── tree.ts
├── src
│   ├── config
│   │   └── index.ts
│   ├── mcp-server
│   │   ├── resources
│   │   │   └── echoResource
│   │   │       ├── index.ts
│   │   │       ├── logic.ts
│   │   │       └── registration.ts
│   │   ├── tools
│   │   │   ├── catFactFetcher
│   │   │   │   ├── index.ts
│   │   │   │   ├── logic.ts
│   │   │   │   └── registration.ts
│   │   │   ├── echoTool
│   │   │   │   ├── index.ts
│   │   │   │   ├── logic.ts
│   │   │   │   └── registration.ts
│   │   │   └── imageTest
│   │   │       ├── index.ts
│   │   │       ├── logic.ts
│   │   │       └── registration.ts
│   │   ├── transports
│   │   │   ├── auth
│   │   │   │   ├── lib
│   │   │   │   │   ├── authContext.ts
│   │   │   │   │   ├── authTypes.ts
│   │   │   │   │   └── authUtils.ts
│   │   │   │   ├── strategies
│   │   │   │   │   ├── authStrategy.ts
│   │   │   │   │   ├── jwtStrategy.ts
│   │   │   │   │   └── oauthStrategy.ts
│   │   │   │   ├── authFactory.ts
│   │   │   │   ├── authMiddleware.ts
│   │   │   │   └── index.ts
│   │   │   ├── core
│   │   │   │   ├── baseTransportManager.ts
│   │   │   │   ├── headerUtils.ts
│   │   │   │   ├── honoNodeBridge.ts
│   │   │   │   ├── statefulTransportManager.ts
│   │   │   │   ├── statelessTransportManager.ts
│   │   │   │   └── transportTypes.ts
│   │   │   ├── http
│   │   │   │   ├── httpErrorHandler.ts
│   │   │   │   ├── httpTransport.ts
│   │   │   │   ├── httpTypes.ts
│   │   │   │   ├── index.ts
│   │   │   │   └── mcpTransportMiddleware.ts
│   │   │   └── stdio
│   │   │       ├── index.ts
│   │   │       └── stdioTransport.ts
│   │   └── server.ts
│   ├── services
│   │   ├── duck-db
│   │   │   ├── duckDBConnectionManager.ts
│   │   │   ├── duckDBQueryExecutor.ts
│   │   │   ├── duckDBService.ts
│   │   │   └── types.ts
│   │   ├── llm-providers
│   │   │   └── openRouterProvider.ts
│   │   └── supabase
│   │       └── supabaseClient.ts
│   ├── storage
│   │   └── duckdbExample.ts
│   ├── types-global
│   │   └── errors.ts
│   ├── utils
│   │   ├── internal
│   │   │   ├── asyncContext.ts
│   │   │   ├── errorHandler.ts
│   │   │   ├── index.ts
│   │   │   ├── logger.ts
│   │   │   ├── performance.ts
│   │   │   └── requestContext.ts
│   │   ├── metrics
│   │   │   ├── index.ts
│   │   │   └── tokenCounter.ts
│   │   ├── network
│   │   │   ├── fetchWithTimeout.ts
│   │   │   └── index.ts
│   │   ├── parsing
│   │   │   ├── dateParser.ts
│   │   │   ├── index.ts
│   │   │   ├── jsonParser.ts
│   │   │   └── zodToMcpSchema.ts
│   │   ├── scheduling
│   │   │   ├── index.ts
│   │   │   └── scheduler.ts
│   │   ├── security
│   │   │   ├── idGenerator.ts
│   │   │   ├── index.ts
│   │   │   ├── rateLimiter.ts
│   │   │   └── sanitization.ts
│   │   ├── telemetry
│   │   │   ├── instrumentation.ts
│   │   │   └── semconv.ts
│   │   └── index.ts
│   ├── index.ts
│   └── README.md
├── tests
│   ├── mcp-server
│   │   ├── tools
│   │   │   ├── catFactFetcher
│   │   │   │   ├── logic.test.ts
│   │   │   │   └── registration.test.ts
│   │   │   ├── echoTool
│   │   │   │   ├── logic.test.ts
│   │   │   │   └── registration.test.ts
│   │   │   └── imageTest
│   │   │       └── registration.test.ts
│   │   ├── transports
│   │   │   ├── auth
│   │   │   │   ├── lib
│   │   │   │   │   └── authUtils.test.ts
│   │   │   │   ├── strategies
│   │   │   │   │   ├── jwtStrategy.test.ts
│   │   │   │   │   └── oauthStrategy.test.ts
│   │   │   │   └── auth.test.ts
│   │   │   └── stdio
│   │   │       └── stdioTransport.test.ts
│   │   └── server.test.ts
│   ├── mocks
│   │   ├── handlers.ts
│   │   └── server.ts
│   ├── services
│   │   ├── duck-db
│   │   │   ├── duckDBConnectionManager.test.ts
│   │   │   ├── duckDBQueryExecutor.test.ts
│   │   │   └── duckDBService.test.ts
│   │   ├── llm-providers
│   │   │   └── openRouterProvider.test.ts
│   │   └── supabase
│   │       └── supabaseClient.test.ts
│   ├── utils
│   │   ├── internal
│   │   │   ├── errorHandler.test.ts
│   │   │   ├── logger.test.ts
│   │   │   └── requestContext.test.ts
│   │   ├── metrics
│   │   │   └── tokenCounter.test.ts
│   │   ├── network
│   │   │   └── fetchWithTimeout.test.ts
│   │   ├── parsing
│   │   │   ├── dateParser.test.ts
│   │   │   └── jsonParser.test.ts
│   │   ├── scheduling
│   │   │   └── scheduler.test.ts
│   │   ├── security
│   │   │   ├── idGenerator.test.ts
│   │   │   ├── rateLimiter.test.ts
│   │   │   └── sanitization.test.ts
│   │   └── telemetry
│   │       └── instrumentation.test.ts
│   └── setup.ts
├── .dockerignore
├── .env.example
├── .gitignore
├── .ncurc.json
├── CHANGELOG.md
├── CLAUDE.md
├── Dockerfile
├── eslint.config.js
├── LICENSE
├── package-lock.json
├── package.json
├── README.md
├── repomix.config.json
├── smithery.yaml
├── tsconfig.json
├── tsconfig.typedoc.json
├── tsconfig.vitest.json
├── tsdoc.json
├── typedoc.json
└── vitest.config.ts
```

_Note: This tree excludes files and directories matched by .gitignore and default patterns._

---

# Let's focus on the following section of our code base.

This file is a merged representation of the entire codebase, combining all repository files into a single document.
Generated by Repomix on: 2025-08-23T12:40:37.623Z

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:

1. This summary section
2. Repository information
3. Repository structure
4. Repository files, each consisting of:

- File path as an attribute
- Full contents of the file
  </file_format>

<usage_guidelines>

- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
  </usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's
  configuration.
- Binary files are not included in this packed representation. Please refer to
  the Repository Structure section for a complete list of file paths, including
  binary files.
</notes>

<additional_info>

For more information about Repomix, visit: https://github.com/yamadashy/repomix
</additional_info>

</file_summary>

<repository_structure>
catFactFetcher/
index.ts
logic.ts
registration.ts
echoTool/
index.ts
logic.ts
registration.ts
imageTest/
index.ts
logic.ts
registration.ts
</repository_structure>

<repository_files>
This section contains the contents of the repository's files.

<file path="catFactFetcher/index.ts">
/**
 * @fileoverview Barrel file for the `catFactFetcher` tool.
 * This file serves as the public interface for the cat fact fetcher tool module,
 * primarily exporting the `registerCatFactFetcherTool` function.
 * @module src/mcp-server/tools/catFactFetcher/index
 */

export { registerCatFactFetcherTool } from "./registration.js";
</file>

<file path="catFactFetcher/logic.ts">
/**
 * @fileoverview Defines the core logic, schemas, and types for the `get_random_cat_fact` tool.
 * This tool fetches a random cat fact from the public Cat Fact Ninja API.
 * @module src/mcp-server/tools/catFactFetcher/logic
 * @see {@link src/mcp-server/tools/catFactFetcher/registration.ts} for the handler and registration logic.
 */

import { z } from "zod";
import { JsonRpcErrorCode, McpError } from "../../../types-global/errors.js";
import {
fetchWithTimeout,
getRequestContext,
logger,
} from "../../../utils/index.js";

/\*\*

- Zod schema for the raw response from the Cat Fact Ninja API.
- @internal
  \*/
  const CatFactApiSchema = z.object({
  fact: z.string(),
  length: z.number(),
  });

/\*\*

- Zod schema for validating input arguments for the `get_random_cat_fact` tool.
  \*/
  export const CatFactFetcherInputSchema = z.object({
  maxLength: z
  .number()
  .int("Max length must be an integer.")
  .min(1, "Max length must be at least 1.")
  .optional()
  .describe(
  "Optional: The maximum character length of the cat fact to retrieve.",
  ),
  });

/\*\*

- TypeScript type inferred from `CatFactFetcherInputSchema`.
  \*/
  export type CatFactFetcherInput = z.infer<typeof CatFactFetcherInputSchema>;

/\*\*

- Zod schema for the successful response of the `get_random_cat_fact` tool.
  \*/
  export const CatFactFetcherResponseSchema = z.object({
  fact: z.string().describe("The retrieved cat fact."),
  length: z.number().int().describe("The character length of the cat fact."),
  requestedMaxLength: z
  .number()
  .int()
  .optional()
  .describe("The maximum length that was requested for the fact."),
  timestamp: z
  .string()
  .datetime()
  .describe("ISO 8601 timestamp of when the response was generated."),
  });

/\*\*

- Defines the structure of the JSON payload returned by the `get_random_cat_fact` tool handler.
  \*/
  export type CatFactFetcherResponse = z.infer<
  typeof CatFactFetcherResponseSchema
  > ;

/\*\*

- Processes the core logic for the `get_random_cat_fact` tool.
- It calls the Cat Fact Ninja API and returns the fetched fact.
- @param params - The validated input parameters for the tool.
- @returns A promise that resolves to an object containing the cat fact data.
- @throws {McpError} If the API request fails or returns an error.
  \*/
  export async function catFactFetcherLogic(
  params: CatFactFetcherInput,
  ): Promise<CatFactFetcherResponse> {
  const context = getRequestContext();
  logger.debug("Processing get_random_cat_fact logic.", {
  ...context,
  toolInput: params,
  });

let apiUrl = "https://catfact.ninja/fact";
if (params.maxLength !== undefined) {
apiUrl += `?max_length=${params.maxLength}`;
}

logger.info(`Fetching random cat fact from: ${apiUrl}`, context);

const CAT_FACT_API_TIMEOUT_MS = 5000;

const response = await fetchWithTimeout(
apiUrl,
CAT_FACT_API_TIMEOUT_MS,
context!,
);

if (!response.ok) {
const errorText = await response.text();
throw new McpError(
JsonRpcErrorCode.ServiceUnavailable,
`Cat Fact API request failed: ${response.status} ${response.statusText}`,
{
...context,
httpStatusCode: response.status,
responseBody: errorText,
},
);
}

const rawData = await response.json();

try {
const data = CatFactApiSchema.parse(rawData);

    const toolResponse: CatFactFetcherResponse = {
      fact: data.fact,
      length: data.length,
      requestedMaxLength: params.maxLength,
      timestamp: new Date().toISOString(),
    };

    logger.notice("Random cat fact fetched and processed successfully.", {
      ...context,
      factLength: toolResponse.length,
    });

    return toolResponse;

} catch (validationError) {
logger.error("Cat Fact API response validation failed", {
...context,
error: validationError as Error,
receivedData: rawData,
});
throw new McpError(
JsonRpcErrorCode.ServiceUnavailable,
"Cat Fact API returned unexpected data format.",
{
...context,
cause: validationError,
},
);
}
}
</file>

<file path="catFactFetcher/registration.ts">
/**
 * @fileoverview Handles the registration of the `get_random_cat_fact` tool.
 * This module acts as the "handler" layer, connecting the pure business logic to the
 * MCP server and ensuring all outcomes (success or failure) are handled gracefully.
 * @module src/mcp-server/tools/catFactFetcher/registration
 * @see {@link src/mcp-server/tools/catFactFetcher/logic.ts} for the core business logic and schemas.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { JsonRpcErrorCode, McpError } from "../../../types-global/errors.js";
import {
ErrorHandler,
getRequestContext,
logger,
measureToolExecution,
requestContextService,
} from "../../../utils/index.js";
import {
CatFactFetcherInput,
CatFactFetcherInputSchema,
catFactFetcherLogic,
CatFactFetcherResponseSchema,
} from "./logic.js";

/\*\*

- The unique name for the tool, used for registration and identification.
- Include the server's namespace if applicable, e.g., "pubmed_fetch_article".
  \*/
  const TOOL_NAME = "get_random_cat_fact";

/\*\*

- Detailed description for the MCP Client (LLM), explaining the tool's purpose, expectations,
- and behavior. This follows the best practice of providing rich context to the MCP Client (LLM) model. Use concise, authoritative language.
  \*/
  const TOOL_DESCRIPTION =
  "Fetches a random cat fact from a public API. Optionally, a maximum length for the fact can be specified.";

/\*\*

- Registers the 'get_random_cat_fact' tool and its handler with the MCP server.
-
- @param server - The MCP server instance to register the tool with.
  \*/
  export const registerCatFactFetcherTool = async (
  server: McpServer,
  ): Promise<void> => {
  const registrationContext = requestContextService.createRequestContext({
  operation: "RegisterTool",
  toolName: TOOL_NAME,
  });

logger.info(`Registering tool: '${TOOL_NAME}'`, registrationContext);

await ErrorHandler.tryCatch(
async () => {
server.registerTool(
TOOL_NAME,
{
title: "Get Random Cat Fact",
description: TOOL_DESCRIPTION,
inputSchema: CatFactFetcherInputSchema.shape,
outputSchema: CatFactFetcherResponseSchema.shape,
annotations: {
readOnlyHint: true,
openWorldHint: true, // This tool interacts with an external API.
},
},
async (params: CatFactFetcherInput) => {
try {
const result = await measureToolExecution(
TOOL_NAME,
() => catFactFetcherLogic(params),
params,
);
return {
structuredContent: result,
content: [
{ type: "text", text: JSON.stringify(result, null, 2) },
],
};
} catch (error) {
const mcpError = ErrorHandler.handleError(error, {
operation: `tool:${TOOL_NAME}`,
context: getRequestContext(),
input: params,
}) as McpError;

            return {
              isError: true,
              content: [{ type: "text", text: `Error: ${mcpError.message}` }],
              structuredContent: {
                code: mcpError.code,
                message: mcpError.message,
                details: mcpError.details,
              },
            };
          }
        },
      );

      logger.info(
        `Tool '${TOOL_NAME}' registered successfully.`,
        registrationContext,
      );
    },
    {
      operation: `RegisteringTool_${TOOL_NAME}`,
      context: registrationContext,
      errorCode: JsonRpcErrorCode.InitializationFailed,
      critical: true,
    },

);
};
</file>

<file path="echoTool/index.ts">
/**
 * @fileoverview Barrel file for the `echo_message` tool.
 * This file serves as the public interface for the echo tool module,
 * primarily exporting the `registerEchoTool` function. This function is
 * responsible for registering the echo tool with an MCP server instance,
 * making it available for invocation by clients.
 *
 * Consuming modules should import from this barrel file to access
 * the echo tool's registration capabilities.
 * @module src/mcp-server/tools/echoTool/index
 */

export { registerEchoTool } from "./registration.js";
</file>

<file path="echoTool/logic.ts">
/**
 * @fileoverview Defines the core logic, schemas, and types for the `echo_message` tool.
 * This module is the single source of truth for the tool's data contracts (Zod schemas)
 * and its pure business logic.
 * @module src/mcp-server/tools/echoTool/logic
 * @see {@link src/mcp-server/tools/echoTool/registration.ts} for the handler and registration logic.
 */

import { z } from "zod";
import { JsonRpcErrorCode, McpError } from "../../../types-global/errors.js";
import { getRequestContext, logger } from "../../../utils/index.js";

/\*\*

- Defines the valid formatting modes for the echo tool operation.
  \*/
  export const ECHO_MODES = ["standard", "uppercase", "lowercase"] as const;

/\*\*

- A constant for the magic string used to trigger a test error.
- This improves maintainability by avoiding hardcoded strings.
  \*/
  const TEST_ERROR_TRIGGER_MESSAGE = "fail";

/\*\*

- Zod schema defining the input parameters for the `echo_message` tool.
- CRITICAL: The descriptions are sent to the LLM and must be clear.
  \*/
  export const EchoToolInputSchema = z.object({
  message: z
  .string()
  .min(1, "Message cannot be empty.")
  .max(1000, "Message cannot exceed 1000 characters.")
  .describe(
  `The message to echo back. To trigger a test error, provide the exact message '${TEST_ERROR_TRIGGER_MESSAGE}'.`,
  ),
  mode: z
  .enum(ECHO_MODES)
  .optional()
  .default("standard")
  .describe(
  "Specifies how the message should be formatted. Defaults to 'standard'.",
  ),
  repeat: z
  .number()
  .int()
  .min(1)
  .max(10)
  .optional()
  .default(1)
  .describe("The number of times to repeat the message. Defaults to 1."),
  includeTimestamp: z
  .boolean()
  .optional()
  .default(true)
  .describe(
  "Whether to include an ISO 8601 timestamp in the response. Defaults to true.",
  ),
  });

/\*\*

- Zod schema for the successful response of the `echo_message` tool.
  \*/
  export const EchoToolResponseSchema = z.object({
  originalMessage: z
  .string()
  .describe("The original message provided in the input."),
  formattedMessage: z
  .string()
  .describe("The message after applying the specified formatting mode."),
  repeatedMessage: z
  .string()
  .describe("The formatted message repeated the specified number of times."),
  mode: z.enum(ECHO_MODES).describe("The formatting mode that was applied."),
  repeatCount: z
  .number()
  .int()
  .min(1)
  .describe("The number of times the message was repeated."),
  timestamp: z
  .string()
  .datetime()
  .optional()
  .describe(
  "Optional ISO 8601 timestamp of when the response was generated.",
  ),
  });

// Inferred TypeScript types
export type EchoToolInput = z.infer<typeof EchoToolInputSchema>;
export type EchoToolResponse = z.infer<typeof EchoToolResponseSchema>;

/\*\*

- Processes the core logic for the `echo_message` tool.
- This function is pure; it processes inputs and returns a result or throws an error.
- It retrieves the request context from AsyncLocalStorage.
-
- @param params - The validated input parameters.
- @returns A promise resolving with the structured response data.
- @throws {McpError} If the logic encounters an unrecoverable issue.
  \*/
  export async function echoToolLogic(
  params: EchoToolInput,
  ): Promise<EchoToolResponse> {
  const context = getRequestContext();
  logger.debug("Processing echo message logic.", {
  ...context,
  toolInput: params,
  });

// The logic layer MUST throw a structured error on failure.
if (params.message === TEST_ERROR_TRIGGER_MESSAGE) {
throw new McpError(
JsonRpcErrorCode.ValidationError,
`Deliberate failure triggered: the message was '${TEST_ERROR_TRIGGER_MESSAGE}'.`,
{ toolName: "echo_message" },
);
}

let formattedMessage = params.message;
switch (params.mode) {
case "uppercase":
formattedMessage = params.message.toUpperCase();
break;
case "lowercase":
formattedMessage = params.message.toLowerCase();
break;
}

const repeatedMessage = Array(params.repeat).fill(formattedMessage).join(" ");

const response: EchoToolResponse = {
originalMessage: params.message,
formattedMessage,
repeatedMessage,
mode: params.mode,
repeatCount: params.repeat,
};

if (params.includeTimestamp) {
response.timestamp = new Date().toISOString();
}

logger.debug("Echo message processed successfully.", {
...context,
responseSummary: {
messageLength: response.repeatedMessage.length,
timestampGenerated: !!response.timestamp,
},
});

return response;
}
</file>

<file path="echoTool/registration.ts">
/**
 * @fileoverview Handles registration and error handling for the `echo_message` tool.
 * This module acts as the "handler" layer, connecting the pure business logic to the
 * MCP server and ensuring all outcomes (success or failure) are handled gracefully.
 * @module src/mcp-server/tools/echoTool/registration
 * @see {@link src/mcp-server/tools/echoTool/logic.ts} for the core business logic and schemas.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { JsonRpcErrorCode, McpError } from "../../../types-global/errors.js";
import {
ErrorHandler,
getRequestContext,
logger,
measureToolExecution,
requestContextService,
} from "../../../utils/index.js";
import {
EchoToolInput,
EchoToolInputSchema,
echoToolLogic,
EchoToolResponseSchema,
} from "./logic.js";

/\*\*

- The unique name for the tool, used for registration and identification.
- Include the server's namespace if applicable, e.g., "pubmed_fetch_article".
  \*/
  const TOOL_NAME = "echo_message";

/\*\*

- Detailed description for the MCP Client (LLM), explaining the tool's purpose, expectations,
- and behavior. This follows the best practice of providing rich context to the MCP Client (LLM) model. Use concise, authoritative language.
  \*/
  const TOOL_DESCRIPTION =
  "Echoes a message back with optional formatting and repetition.";

/\*\*

- Registers the 'echo_message' tool and its handler with the provided MCP server instance.
-
- @param server - The MCP server instance to register the tool with.
  \*/
  export const registerEchoTool = async (server: McpServer): Promise<void> => {
  const registrationContext = requestContextService.createRequestContext({
  operation: "RegisterTool",
  toolName: TOOL_NAME,
  });

logger.info(`Registering tool: '${TOOL_NAME}'`, registrationContext);

await ErrorHandler.tryCatch(
async () => {
server.registerTool(
TOOL_NAME,
{
title: "Echo Message",
description: TOOL_DESCRIPTION,
inputSchema: EchoToolInputSchema.shape,
outputSchema: EchoToolResponseSchema.shape,
annotations: {
readOnlyHint: true, // This tool does not modify state.
openWorldHint: false, // This tool does not interact with external, unpredictable systems.
},
},
// This is the runtime handler for the tool.
async (params: EchoToolInput) => {
try {
// 1. WRAP the logic call with the performance measurement utility.
const result = await measureToolExecution(
TOOL_NAME,
() => echoToolLogic(params),
params, // Pass input payload for size metrics
);

            // 2. FORMAT the SUCCESS response.
            return {
              structuredContent: result,
              content: [
                {
                  type: "text",
                  text: `Success: ${JSON.stringify(result, null, 2)}`,
                },
              ],
            };
            // 3. CATCH any error re-thrown by the measurement utility.
          } catch (error) {
            // 4. PROCESS the error using the centralized ErrorHandler.
            const mcpError = ErrorHandler.handleError(error, {
              operation: `tool:${TOOL_NAME}`,
              context: getRequestContext(), // Retrieve context for error logging
              input: params,
            }) as McpError;

            // 5. FORMAT the ERROR response.
            return {
              isError: true,
              content: [{ type: "text", text: `Error: ${mcpError.message}` }],
              structuredContent: {
                code: mcpError.code,
                message: mcpError.message,
                details: mcpError.details,
              },
            };
          }
        },
      );

      logger.info(
        `Tool '${TOOL_NAME}' registered successfully.`,
        registrationContext,
      );
    },
    {
      operation: `RegisteringTool_${TOOL_NAME}`,
      context: registrationContext,
      errorCode: JsonRpcErrorCode.InitializationFailed,
      critical: true, // A failure to register a tool is a critical startup error.
    },

);
};
</file>

<file path="imageTest/index.ts">
/**
 * @fileoverview Barrel file for the fetch_image_test tool.
 * Exports the tool's registration function.
 * @module src/mcp-server/tools/imageTest/index
 */

export { registerFetchImageTestTool } from "./registration.js";
</file>

<file path="imageTest/logic.ts">
/**
 * @fileoverview Defines the core logic, schemas, and types for the `fetch_image_test` tool.
 * This tool fetches a random cat image from the public cataas.com API.
 * @module src/mcp-server/tools/imageTest/logic
 * @see {@link src/mcp-server/tools/imageTest/registration.ts} for the handler and registration logic.
 */
import { z } from "zod";
import { JsonRpcErrorCode, McpError } from "../../../types-global/errors.js";
import {
  fetchWithTimeout,
  getRequestContext,
  logger,
} from "../../../utils/index.js";

export const FetchImageTestInputSchema = z.object({
trigger: z
.boolean()
.optional()
.default(true)
.describe("A trigger to invoke the tool and fetch a new cat image."),
});

export type FetchImageTestInput = z.infer<typeof FetchImageTestInputSchema>;

export const FetchImageTestResponseSchema = z.object({
data: z.string().describe("Base64 encoded image data."),
mimeType: z
.string()
.describe("The MIME type of the image (e.g., 'image/jpeg')."),
});

export type FetchImageTestResponse = z.infer<
typeof FetchImageTestResponseSchema

> ;

const CAT_API_URL = "https://cataas.com/cat";

export async function fetchImageTestLogic(
input: FetchImageTestInput,
): Promise<FetchImageTestResponse> {
const context = getRequestContext();
logger.info(
`Executing 'fetch_image_test'. Trigger: ${input.trigger}`,
context,
);

const response = await fetchWithTimeout(CAT_API_URL, 5000, context!);

if (!response.ok) {
throw new McpError(
JsonRpcErrorCode.ServiceUnavailable,
`Image API request failed: ${response.status} ${response.statusText}`,
context,
);
}

const contentType = response.headers.get("content-type") || "";
if (!contentType.startsWith("image/")) {
throw new McpError(
JsonRpcErrorCode.ServiceUnavailable,
"Image API returned a non-image response.",
{ ...context, contentType },
);
}

const imageBuffer = Buffer.from(await response.arrayBuffer());

return {
data: imageBuffer.toString("base64"),
mimeType: contentType,
};
}
</file>

<file path="imageTest/registration.ts">
/**
 * @fileoverview Handles registration of the `fetch_image_test` tool.
 * This module acts as the "handler" layer, connecting the pure business logic to the
 * MCP server and ensuring all outcomes (success or failure) are handled gracefully.
 * @module src/mcp-server/tools/imageTest/registration
 * @see {@link src/mcp-server/tools/imageTest/logic.ts} for the core business logic and schemas.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { JsonRpcErrorCode, McpError } from "../../../types-global/errors.js";
import {
ErrorHandler,
getRequestContext,
logger,
measureToolExecution,
requestContextService,
} from "../../../utils/index.js";
import {
FetchImageTestInput,
FetchImageTestInputSchema,
fetchImageTestLogic,
FetchImageTestResponseSchema,
} from "./logic.js";

/\*\*

- The unique name for the tool, used for registration and identification.
- Include the server's namespace if applicable, e.g., "pubmed_fetch_article".
  \*/
  const TOOL_NAME = "fetch_image_test";

/\*\*

- Detailed description for the MCP Client (LLM), explaining the tool's purpose, expectations,
- and behavior. This follows the best practice of providing rich context to the MCP Client (LLM) model. Use concise, authoritative language.
  \*/
  const TOOL_DESCRIPTION =
  "Fetches a random cat image from an external API (cataas.com) and returns it as a blob. Useful for testing image handling capabilities.";

/\*\*

- Registers the fetch_image_test tool with the MCP server.
- @param server - The McpServer instance.
  \*/
  export const registerFetchImageTestTool = async (
  server: McpServer,
  ): Promise<void> => {
  const registrationContext = requestContextService.createRequestContext({
  operation: "RegisterTool",
  toolName: TOOL_NAME,
  });

logger.info(`Registering tool: '${TOOL_NAME}'`, registrationContext);

await ErrorHandler.tryCatch(
async () => {
server.registerTool(
TOOL_NAME,
{
title: "Fetch Cat Image",
description: TOOL_DESCRIPTION,
inputSchema: FetchImageTestInputSchema.shape,
outputSchema: FetchImageTestResponseSchema.shape,
annotations: {
readOnlyHint: true,
openWorldHint: true,
},
},
async (input: FetchImageTestInput) => {
try {
const result = await measureToolExecution(
TOOL_NAME,
() => fetchImageTestLogic(input),
input,
);
return {
structuredContent: result,
content: [
{
type: "image",
data: result.data,
mimeType: result.mimeType,
},
],
};
} catch (error) {
const mcpError = ErrorHandler.handleError(error, {
operation: `tool:${TOOL_NAME}`,
context: getRequestContext(),
input,
}) as McpError;

            return {
              isError: true,
              content: [{ type: "text", text: `Error: ${mcpError.message}` }],
              structuredContent: {
                code: mcpError.code,
                message: mcpError.message,
                details: mcpError.details,
              },
            };
          }
        },
      );
      logger.notice(`Tool '${TOOL_NAME}' registered.`, registrationContext);
    },
    {
      operation: `RegisteringTool_${TOOL_NAME}`,
      context: registrationContext,
      errorCode: JsonRpcErrorCode.InitializationFailed,
      critical: true,
    },

);
};
</file>

</repository_files>

---

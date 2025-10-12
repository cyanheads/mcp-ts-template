/**
 * @fileoverview Complete, declarative definition for the 'template_madlibs_elicitation' tool.
 * This tool demonstrates how to use the MCP Elicitation feature to request missing
 * information from the user during a tool's execution.
 * @module src/mcp-server/tools/definitions/template-madlibs-elicitation.tool
 */
import type { ContentBlock } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import type {
  SdkContext,
  ToolAnnotations,
  ToolDefinition,
} from '@/mcp-server/tools/utils/index.js';
import { withToolAuth } from '@/mcp-server/transports/auth/lib/withAuth.js';
import { JsonRpcErrorCode, McpError } from '@/types-global/errors.js';
import { type RequestContext, logger } from '@/utils/index.js';

const TOOL_NAME = 'template_madlibs_elicitation';
const TOOL_TITLE = 'Mad Libs Elicitation Game';
const TOOL_DESCRIPTION =
  'Plays a game of Mad Libs. If any parts of speech (noun, verb, adjective) are missing, it will use elicitation to ask the user for them.';

const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  idempotentHint: false,
  openWorldHint: false,
};

// --- Schemas ---
const InputSchema = z
  .object({
    noun: z.string().optional().describe('A noun for the story.'),
    verb: z.string().optional().describe('A verb (past tense) for the story.'),
    adjective: z.string().optional().describe('An adjective for the story.'),
  })
  .describe(
    'Inputs for the Mad Libs game. Any missing fields will be elicited.',
  );

const OutputSchema = z
  .object({
    story: z.string().describe('The final, generated Mad Libs story.'),
    noun: z.string().describe('The noun used in the story.'),
    verb: z.string().describe('The verb used in the story.'),
    adjective: z.string().describe('The adjective used in the story.'),
  })
  .describe('The completed Mad Libs story and the words used.');

type MadlibsToolInput = z.infer<typeof InputSchema>;
type MadlibsToolResponse = z.infer<typeof OutputSchema>;

// --- Elicitation Logic ---
// We check against the SdkContext, which is where elicitInput lives.
type ElicitableSdkContext = SdkContext & {
  elicitInput: (args: { message: string; schema: unknown }) => Promise<unknown>;
};

function hasElicitInput(ctx: SdkContext): ctx is ElicitableSdkContext {
  return typeof (ctx as ElicitableSdkContext)?.elicitInput === 'function';
}

async function elicitAndValidate(
  partOfSpeech: 'noun' | 'verb' | 'adjective',
  sdkContext: SdkContext,
): Promise<string> {
  if (!hasElicitInput(sdkContext)) {
    throw new McpError(
      JsonRpcErrorCode.InvalidRequest,
      'Elicitation is not available in the current context.',
      { requestId: sdkContext.requestId, operation: 'madlibs.elicit' },
    );
  }

  const elicitedUnknown: unknown = await sdkContext.elicitInput({
    message: `I need a ${partOfSpeech}.`,
    schema: { type: 'string' },
  });

  const validation = z.string().min(1).safeParse(elicitedUnknown);
  if (!validation.success) {
    throw new McpError(
      JsonRpcErrorCode.InvalidParams,
      `Invalid ${partOfSpeech} received from user.`,
      { provided: elicitedUnknown },
    );
  }
  return validation.data;
}

// --- Pure business logic ---
async function madlibsToolLogic(
  input: MadlibsToolInput,
  appContext: RequestContext,
  sdkContext: SdkContext, // This signature now correctly matches the ToolDefinition and withToolAuth expectations.
): Promise<MadlibsToolResponse> {
  logger.debug('Processing Mad Libs logic.', {
    ...appContext,
    toolInput: input,
  });

  // No cast is needed; sdkContext is already the correct type.
  const noun = input.noun ?? (await elicitAndValidate('noun', sdkContext));
  const verb = input.verb ?? (await elicitAndValidate('verb', sdkContext));
  const adjective =
    input.adjective ?? (await elicitAndValidate('adjective', sdkContext));

  const story = `The ${adjective} ${noun} ${verb} over the lazy dog.`;

  const response: MadlibsToolResponse = {
    story,
    noun,
    verb,
    adjective,
  };

  return Promise.resolve(response);
}

// --- Response Formatter ---
function responseFormatter(result: MadlibsToolResponse): ContentBlock[] {
  return [
    {
      type: 'text',
      text: result.story,
    },
    {
      type: 'text',
      text: JSON.stringify(
        {
          noun: result.noun,
          verb: result.verb,
          adjective: result.adjective,
        },
        null,
        2,
      ),
    },
  ];
}

// --- Tool Definition ---
export const madlibsElicitationTool: ToolDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  name: TOOL_NAME,
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  annotations: TOOL_ANNOTATIONS,
  logic: withToolAuth(['tool:madlibs:play'], madlibsToolLogic),
  responseFormatter,
};

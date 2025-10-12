/**
 * @fileoverview Complete, declarative definition for the 'template_code_review_sampling' tool.
 * This tool demonstrates how to use the MCP Sampling capability to request LLM completions
 * from clients during tool execution.
 *
 * MCP Sampling Specification:
 * @see {@link https://modelcontextprotocol.io/specification/2025-06-18/basic/sampling | MCP Sampling}
 * @module src/mcp-server/tools/definitions/template-code-review-sampling.tool
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

const TOOL_NAME = 'template_code_review_sampling';
const TOOL_TITLE = 'Code Review with Sampling';
const TOOL_DESCRIPTION =
  "Demonstrates MCP sampling by requesting an LLM to review code snippets. The tool uses the client's LLM to generate a code review summary.";

const TOOL_ANNOTATIONS: ToolAnnotations = {
  readOnlyHint: true,
  idempotentHint: false,
  openWorldHint: true, // Uses external LLM via client
};

// --- Schemas ---
const InputSchema = z
  .object({
    code: z
      .string()
      .min(1, 'Code snippet cannot be empty.')
      .max(10000, 'Code snippet too large (max 10000 characters).')
      .describe('The code snippet to review.'),
    language: z
      .string()
      .optional()
      .describe(
        'Programming language of the code (e.g., "typescript", "python").',
      ),
    focus: z
      .enum(['security', 'performance', 'style', 'general'])
      .default('general')
      .describe('The focus area for the code review.'),
    maxTokens: z
      .number()
      .int()
      .min(100)
      .max(2000)
      .default(500)
      .describe('Maximum tokens for the LLM response.'),
  })
  .describe('Request an LLM-powered code review via sampling.');

const OutputSchema = z
  .object({
    code: z.string().describe('The original code snippet.'),
    language: z.string().optional().describe('The programming language.'),
    focus: z.string().describe('The review focus area.'),
    review: z.string().describe('The LLM-generated code review summary.'),
    tokenUsage: z
      .object({
        requested: z.number().describe('Requested max tokens.'),
        actual: z
          .number()
          .optional()
          .describe('Actual tokens used (if available).'),
      })
      .optional()
      .describe('Token usage information.'),
  })
  .describe('Code review tool response payload.');

type CodeReviewToolInput = z.infer<typeof InputSchema>;
type CodeReviewToolResponse = z.infer<typeof OutputSchema>;

// --- Sampling Helper ---
type SamplingSdkContext = SdkContext & {
  createMessage: (args: {
    messages: Array<{
      role: 'user' | 'assistant';
      content: { type: 'text'; text: string };
    }>;
    maxTokens?: number;
    temperature?: number;
    modelPreferences?: {
      hints?: Array<{ name: string }>;
      costPriority?: number;
      speedPriority?: number;
      intelligencePriority?: number;
    };
  }) => Promise<{
    role: 'assistant';
    content: { type: 'text'; text: string };
    model: string;
    stopReason?: string;
  }>;
};

function hasSamplingCapability(ctx: SdkContext): ctx is SamplingSdkContext {
  return typeof (ctx as SamplingSdkContext)?.createMessage === 'function';
}

// --- Pure business logic ---
async function codeReviewToolLogic(
  input: CodeReviewToolInput,
  appContext: RequestContext,
  sdkContext: SdkContext,
): Promise<CodeReviewToolResponse> {
  logger.debug('Processing code review with sampling.', {
    ...appContext,
    toolInput: { ...input, code: `${input.code.substring(0, 100)}...` },
  });

  if (!hasSamplingCapability(sdkContext)) {
    throw new McpError(
      JsonRpcErrorCode.InvalidRequest,
      'Sampling capability is not available. The client does not support MCP sampling.',
      { requestId: appContext.requestId, operation: 'codeReview.sample' },
    );
  }

  // Build the prompt for the LLM
  const focusInstructions = {
    security:
      'Focus on security vulnerabilities, input validation, and potential exploits.',
    performance:
      'Focus on performance bottlenecks, algorithmic complexity, and optimization opportunities.',
    style:
      'Focus on code style, readability, naming conventions, and best practices.',
    general:
      'Provide a comprehensive review covering security, performance, and code quality.',
  };

  const prompt = `You are an expert code reviewer. Please review the following ${input.language || 'code'} snippet.

${focusInstructions[input.focus]}

Provide a concise, structured review with:
1. Summary (2-3 sentences)
2. Key findings (bullet points)
3. Recommendations (if applicable)

Code to review:
\`\`\`${input.language || ''}
${input.code}
\`\`\`

Your review:`;

  logger.debug('Requesting LLM completion via sampling...', {
    ...appContext,
    maxTokens: input.maxTokens,
    focus: input.focus,
  });

  try {
    const samplingResult = await sdkContext.createMessage({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: prompt,
          },
        },
      ],
      maxTokens: input.maxTokens,
      temperature: 0.3, // Lower temperature for more consistent reviews
      modelPreferences: {
        hints: [{ name: 'claude-3-5-sonnet-20241022' }],
        intelligencePriority: 0.8,
        speedPriority: 0.2,
      },
    });

    logger.info('Sampling completed successfully.', {
      ...appContext,
      model: samplingResult.model,
      stopReason: samplingResult.stopReason,
    });

    const response: CodeReviewToolResponse = {
      code: input.code,
      language: input.language,
      focus: input.focus,
      review: samplingResult.content.text,
      tokenUsage: {
        requested: input.maxTokens,
        // Note: actual token usage might not be available from all clients
      },
    };

    return response;
  } catch (error) {
    logger.error('Sampling request failed.', {
      ...appContext,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new McpError(
      JsonRpcErrorCode.InternalError,
      `Failed to complete sampling request: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { requestId: appContext.requestId, operation: 'codeReview.sample' },
    );
  }
}

// --- Response Formatter ---
function responseFormatter(result: CodeReviewToolResponse): ContentBlock[] {
  return [
    {
      type: 'text',
      text: `# Code Review (${result.focus})\n\n${result.review}`,
    },
  ];
}

// --- Tool Definition ---
export const codeReviewSamplingTool: ToolDefinition<
  typeof InputSchema,
  typeof OutputSchema
> = {
  name: TOOL_NAME,
  title: TOOL_TITLE,
  description: TOOL_DESCRIPTION,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  annotations: TOOL_ANNOTATIONS,
  logic: withToolAuth(['tool:code-review:use'], codeReviewToolLogic),
  responseFormatter,
};

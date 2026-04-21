/**
 * @fileoverview Template code review tool — demonstrates MCP Sampling capability.
 * Requests an LLM completion from the client to review code snippets.
 * @module examples/mcp-server/tools/definitions/template-code-review-sampling.tool
 */

import { tool, z } from '@cyanheads/mcp-ts-core';

const InputSchema = z.object({
  code: z
    .string()
    .min(1, 'Code snippet cannot be empty.')
    .max(10000, 'Code snippet too large (max 10000 characters).')
    .describe('The code snippet to review.'),
  language: z
    .string()
    .optional()
    .describe('Programming language of the code (e.g., "typescript", "python").'),
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
});

const OutputSchema = z.object({
  code: z.string().describe('The original code snippet.'),
  language: z.string().optional().describe('The programming language.'),
  focus: z.string().describe('The review focus area.'),
  review: z.string().describe('The LLM-generated code review summary.'),
  tokenUsage: z
    .object({
      requested: z.number().describe('Requested max tokens.'),
      actual: z.number().optional().describe('Actual tokens used (if available).'),
    })
    .optional()
    .describe('Token usage information.'),
});

const FOCUS_INSTRUCTIONS: Record<string, string> = {
  security: 'Focus on security vulnerabilities, input validation, and potential exploits.',
  performance:
    'Focus on performance bottlenecks, algorithmic complexity, and optimization opportunities.',
  style: 'Focus on code style, readability, naming conventions, and best practices.',
  general: 'Provide a comprehensive review covering security, performance, and code quality.',
};

export const codeReviewSamplingTool = tool('template_code_review_sampling', {
  title: 'Code Review with Sampling',
  description:
    "Demonstrates MCP sampling by requesting an LLM to review code snippets. The tool uses the client's LLM to generate a code review summary.",
  input: InputSchema,
  output: OutputSchema,
  auth: ['tool:code-review:use'],
  annotations: {
    readOnlyHint: true,
    openWorldHint: true,
  },

  async handler(input, ctx) {
    if (!ctx.sample) {
      throw new Error('Sampling capability is not available. The client does not support MCP sampling.');
    }

    ctx.log.debug('Processing code review with sampling.', {
      codePreview: `${input.code.substring(0, 100)}...`,
      focus: input.focus,
    });

    const prompt = `You are an expert code reviewer. Please review the following ${input.language || 'code'} snippet.

${FOCUS_INSTRUCTIONS[input.focus]}

Provide a concise, structured review with:
1. Summary (2-3 sentences)
2. Key findings (bullet points)
3. Recommendations (if applicable)

Code to review:
\`\`\`${input.language || ''}
${input.code}
\`\`\`

Your review:`;

    ctx.log.debug('Requesting LLM completion via sampling...', {
      maxTokens: input.maxTokens,
      focus: input.focus,
    });

    const samplingResult = await ctx.sample(
      [{ role: 'user', content: { type: 'text', text: prompt } }],
      {
        maxTokens: input.maxTokens,
        temperature: 0.3,
        modelPreferences: {
          hints: [{ name: 'claude-3-5-sonnet-20241022' }],
          intelligencePriority: 0.8,
          speedPriority: 0.2,
        },
      },
    );

    const reviewText =
      samplingResult.content.type === 'text' ? samplingResult.content.text : '[non-text response]';

    ctx.log.info('Sampling completed successfully.', {
      model: samplingResult.model,
      stopReason: samplingResult.stopReason,
    });

    return {
      code: input.code,
      language: input.language,
      focus: input.focus,
      review: reviewText,
      tokenUsage: { requested: input.maxTokens },
    };
  },

  format(result) {
    const lines = [
      `# Code Review (focus: ${result.focus})`,
      '',
      `**language:** ${result.language ?? 'unspecified'}`,
      `**tokenUsage.requested:** ${result.tokenUsage?.requested ?? 'n/a'}`,
      `**tokenUsage.actual:** ${result.tokenUsage?.actual ?? 'n/a'}`,
      '',
      '## Review',
      result.review,
      '',
      '## Reviewed Code',
      '```' + (result.language ?? ''),
      result.code,
      '```',
    ];
    return [{ type: 'text', text: lines.join('\n') }];
  },
});

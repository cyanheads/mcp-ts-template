/**
 * @fileoverview Template Mad Libs tool — demonstrates MCP Elicitation capability.
 * Uses elicitation to request missing input from the user during execution.
 * @module examples/mcp-server/tools/definitions/template-madlibs-elicitation.tool
 */

import { type Context, tool, z } from '@cyanheads/mcp-ts-core';

const InputSchema = z.object({
  noun: z.string().optional().describe('A noun for the story.'),
  verb: z.string().optional().describe('A verb (past tense) for the story.'),
  adjective: z.string().optional().describe('An adjective for the story.'),
});

const OutputSchema = z.object({
  story: z.string().describe('The final, generated Mad Libs story.'),
  noun: z.string().describe('The noun used in the story.'),
  verb: z.string().describe('The verb used in the story.'),
  adjective: z.string().describe('The adjective used in the story.'),
});

async function elicitWord(partOfSpeech: string, ctx: Context): Promise<string> {
  if (!ctx.elicit) {
    throw new Error('Elicitation is not available in the current context.');
  }

  const result = await ctx.elicit(
    `I need a ${partOfSpeech}. Please provide one below.`,
    z.object({
      value: z.string().describe(`A ${partOfSpeech} for the Mad Libs story`),
    }),
  );

  if (result.action !== 'accept') {
    throw new Error(`User ${result.action} the ${partOfSpeech} elicitation.`);
  }

  const value = result.content?.value;
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid ${partOfSpeech} received from user.`);
  }

  return value;
}

export const madlibsElicitationTool = tool('template_madlibs_elicitation', {
  title: 'Mad Libs Elicitation Game',
  description:
    'Plays a game of Mad Libs. If any parts of speech (noun, verb, adjective) are missing, it will use elicitation to ask the user for them.',
  input: InputSchema,
  output: OutputSchema,
  auth: ['tool:madlibs:play'],
  annotations: {
    readOnlyHint: true,
    idempotentHint: false,
    openWorldHint: false,
  },

  async handler(input, ctx) {
    ctx.log.debug('Processing Mad Libs', { toolInput: input });

    const noun = input.noun ?? (await elicitWord('noun', ctx));
    const verb = input.verb ?? (await elicitWord('verb', ctx));
    const adjective = input.adjective ?? (await elicitWord('adjective', ctx));

    const story = `The ${adjective} ${noun} ${verb} over the lazy dog.`;
    return { story, noun, verb, adjective };
  },

  format(result) {
    return [
      { type: 'text', text: result.story },
      {
        type: 'text',
        text: JSON.stringify(
          { noun: result.noun, verb: result.verb, adjective: result.adjective },
          null,
          2,
        ),
      },
    ];
  },
});

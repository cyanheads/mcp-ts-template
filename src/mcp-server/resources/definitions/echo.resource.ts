/**
 * @fileoverview Echo resource definition using the new-style `resource()` builder.
 * Returns a simple echo of the message from the URI template parameter.
 * @module src/mcp-server/resources/definitions/echo.resource
 */
import { z } from 'zod';

import { resource } from '@/mcp-server/resources/utils/newResourceDefinition.js';

const ParamsSchema = z
  .object({
    message: z
      .string()
      .optional()
      .describe(
        'Optional message to echo back. If omitted, it may be derived from the URI path/host.',
      ),
  })
  .describe('Echo resource parameters.');

const OutputSchema = z
  .object({
    message: z.string().describe('The echoed message.'),
    timestamp: z
      .string()
      .datetime()
      .describe('ISO 8601 timestamp when the response was generated.'),
    requestUri: z.string().url().describe('The request URI used to fetch this resource.'),
  })
  .describe('Echo resource response payload.');

export const echoResourceDefinition = resource('echo://{message}', {
  name: 'echo-resource',
  title: 'Echo Message Resource',
  description: 'A simple echo resource that returns a message.',
  params: ParamsSchema,
  output: OutputSchema,
  mimeType: 'application/json',
  examples: [{ name: 'Basic echo', uri: 'echo://hello' }],
  annotations: { audience: ['user', 'assistant'] },
  auth: ['resource:echo:read'],

  handler(params, ctx) {
    // biome-ignore lint/style/noNonNullAssertion: uri is always present in resource handlers
    const uri = ctx.uri!;
    const messageFromPath = uri.hostname || uri.pathname.replace(/^\/+/, '');
    const messageToEcho = params.message || messageFromPath || 'Default echo message';

    ctx.log.debug('Processing echo resource.', {
      resourceUri: uri.href,
      extractedMessage: messageToEcho,
    });

    return {
      message: messageToEcho,
      timestamp: new Date().toISOString(),
      requestUri: uri.href,
    };
  },

  list: () => ({
    resources: [
      {
        uri: 'echo://hello',
        name: 'Default Echo Message',
        description: 'A simple echo resource example.',
      },
    ],
  }),
});

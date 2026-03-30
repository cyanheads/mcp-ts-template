#!/usr/bin/env node
/**
 * @fileoverview Minimal HTTP MCP fixture server for auth end-to-end tests.
 * Exposes one public tool and one scoped tool so integration tests can verify
 * endpoint auth and per-tool authorization against the built package output.
 * @module tests/fixtures/auth-scoped-server
 */

import { createApp, tool, z } from '../../dist/core/index.js';

const openEchoTool = tool('open_echo', {
  description: 'Echoes a message without additional scope checks.',
  input: z.object({
    message: z.string().describe('Message to echo.'),
  }),
  output: z.object({
    echoed: z.string().describe('Echoed message.'),
    visibility: z.literal('public').describe('Visibility label for the response.'),
  }),
  async handler(input) {
    return {
      echoed: input.message,
      visibility: 'public',
    };
  },
});

const scopedEchoTool = tool('scoped_echo', {
  description: 'Echoes a message when the caller has the scoped echo permission.',
  input: z.object({
    message: z.string().describe('Message to echo.'),
  }),
  output: z.object({
    echoed: z.string().describe('Echoed message.'),
    visibility: z.literal('protected').describe('Visibility label for the response.'),
  }),
  auth: ['tool:scoped_echo:read'],
  async handler(input) {
    return {
      echoed: input.message,
      visibility: 'protected',
    };
  },
});

await createApp({
  name: 'auth-scoped-fixture',
  version: '0.0.0-test',
  tools: [openEchoTool, scopedEchoTool],
});

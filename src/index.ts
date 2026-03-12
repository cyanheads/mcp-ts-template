#!/usr/bin/env node
/**
 * @fileoverview Core library entry point. Starts an empty server for development
 * and build verification. Consumer servers provide their own definitions.
 * @module src/index
 */

import { createApp } from '@/app.js';

await createApp();

/**
 * @fileoverview Bun test preload script
 * Ensures Zod is loaded by Bun's native ESM loader before Vitest's transform
 * to avoid Vite SSR transform issues with Zod 4.
 */

// Force Bun to load Zod natively before Vitest's Vite transform tries to handle it
import 'zod';

// Then load the main setup
import './setup.js';

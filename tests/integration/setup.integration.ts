/**
 * @fileoverview Setup file for integration tests.
 * This file is executed before any integration test suites. It's responsible for:
 * 1. Importing 'reflect-metadata' for dependency injection (tsyringe).
 * 2. Setting up the test environment (e.g., environment variables).
 * 3. Defining global hooks for setup and teardown.
 */
import 'reflect-metadata';

// Set an environment variable to signal that we are running integration tests.
// This MUST be set before importing the main setup file.
process.env.INTEGRATION = '1';

// Import the common setup file which includes vitest-bun shims
import '../setup.js';

import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Set an environment variable to signal that we are running integration tests.
// Global hooks for all integration tests
beforeAll(() => {
  // Global setup for all integration tests can go here.
  // For example, initializing a test database or starting a mock server.
});

afterEach(() => {
  // Clean up between tests to ensure isolation.
  vi.restoreAllMocks();
});

afterAll(() => {
  // Global teardown logic, like closing database connections.
});

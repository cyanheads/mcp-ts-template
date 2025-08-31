/**
 * @fileoverview Integration tests for the FileSystemProvider.
 * @module tests/storage/providers/fileSystem/fileSystemProvider.test
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FileSystemProvider } from "../../../../src/storage/providers/fileSystem/fileSystemProvider.js";
import { storageProviderTests } from "../../storageProviderCompliance.js";
import { rm } from "fs/promises";
import path from "path";
import {
  JsonRpcErrorCode,
  McpError,
} from "../../../../src/types-global/errors.js";
import { requestContextService } from "../../../../src/utils/index.js";

const TEST_STORAGE_PATH = path.resolve(
  process.cwd(),
  ".storage",
  "test-storage",
);

// Setup and Teardown for file system operations
const setup = async () => {
  // The provider creates the directory, so we just need to ensure it's clean
  await rm(TEST_STORAGE_PATH, { recursive: true, force: true });
};

const teardown = async () => {
  await rm(TEST_STORAGE_PATH, { recursive: true, force: true });
};

// Run the compliance tests for FileSystemProvider
storageProviderTests(
  () => new FileSystemProvider(TEST_STORAGE_PATH),
  "FileSystemProvider",
  setup,
  teardown,
);

// Add specific tests for FileSystemProvider
describe("FileSystemProvider Specific Tests", () => {
  const context = requestContextService.createRequestContext({
    operation: "test",
  });

  beforeEach(async () => {
    await setup();
  });

  afterEach(async () => {
    await teardown();
  });

  it("should throw an error for an invalid storage path", () => {
    expect(() => new FileSystemProvider("")).toThrow(
      new McpError(
        JsonRpcErrorCode.ConfigurationError,
        "FileSystemProvider requires a valid storagePath.",
      ),
    );
  });

  it("should correctly sanitize and use complex keys", async () => {
    const provider = new FileSystemProvider(TEST_STORAGE_PATH);
    const complexKey = "user:123/profile?query=string#hash";
    const value = { name: "test" };
    await provider.set(complexKey, value, context);
    const result = await provider.get(complexKey, context);
    expect(result).toEqual(value);
  });
});

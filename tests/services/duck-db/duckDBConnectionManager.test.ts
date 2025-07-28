/**
 * @fileoverview Tests for the DuckDB connection manager.
 * @module tests/services/duck-db/duckDBConnectionManager.test
 */

import * as duckdb from "@duckdb/node-api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DuckDBConnectionManager } from "../../../src/services/duck-db/duckDBConnectionManager.js";
import { McpError } from "../../../src/types-global/errors.js";
import { RequestContext } from "../../../src/utils/internal/requestContext.js";

// Mock the DuckDB library
vi.mock("@duckdb/node-api");

describe("DuckDBConnectionManager", () => {
  let connectionManager: DuckDBConnectionManager;
  let mockInstance: Partial<duckdb.DuckDBInstance>;
  let mockConnection: Partial<duckdb.DuckDBConnection>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mocks
    mockConnection = {
      run: vi.fn().mockResolvedValue({} as duckdb.DuckDBMaterializedResult),
      closeSync: vi.fn(),
    };

    mockInstance = {
      connect: vi.fn().mockResolvedValue(mockConnection),
      closeSync: vi.fn(),
    };

    // Mock the static create method
    vi.mocked(duckdb.DuckDBInstance).create = vi.fn().mockResolvedValue(mockInstance);

    connectionManager = new DuckDBConnectionManager();
  });

  describe("initialize", () => {
    it("should initialize with default configuration", async () => {
      await connectionManager.initialize();

      expect(duckdb.DuckDBInstance.create).toHaveBeenCalledWith(":memory:", {});
      expect(mockInstance.connect).toHaveBeenCalled();
      expect(connectionManager.isServiceInitialized).toBe(true);
    });

    it("should initialize with custom database path", async () => {
      const config = { dbPath: "/tmp/test.db" };

      await connectionManager.initialize(config);

      expect(duckdb.DuckDBInstance.create).toHaveBeenCalledWith("/tmp/test.db", {});
      expect(connectionManager.isServiceInitialized).toBe(true);
    });

    it("should initialize with launch configuration", async () => {
      const config = {
        dbPath: ":memory:",
        launchConfig: { allow_unsigned_extensions: "true" },
      };

      await connectionManager.initialize(config);

      expect(duckdb.DuckDBInstance.create).toHaveBeenCalledWith(":memory:", {
        allow_unsigned_extensions: "true",
      });
    });

    it("should load extensions during initialization", async () => {
      const config = {
        extensions: ["httpfs", "json"],
      };

      await connectionManager.initialize(config);

      expect(mockConnection.run).toHaveBeenCalledWith("INSTALL 'httpfs'");
      expect(mockConnection.run).toHaveBeenCalledWith("LOAD 'httpfs'");
      expect(mockConnection.run).toHaveBeenCalledWith("INSTALL 'json'");
      expect(mockConnection.run).toHaveBeenCalledWith("LOAD 'json'");
    });

    it("should not reinitialize if already initialized", async () => {
      await connectionManager.initialize();
      vi.clearAllMocks();

      await connectionManager.initialize();

      expect(duckdb.DuckDBInstance.create).not.toHaveBeenCalled();
      expect(mockInstance.connect).not.toHaveBeenCalled();
    });

    it("should handle initialization errors", async () => {
      const error = new Error("Failed to create instance");
      vi.mocked(duckdb.DuckDBInstance.create).mockRejectedValue(error);

      await expect(connectionManager.initialize()).rejects.toThrow(McpError);
      expect(connectionManager.isServiceInitialized).toBe(false);
    });
  });

  describe("loadExtension", () => {
    beforeEach(async () => {
      await connectionManager.initialize();
      vi.clearAllMocks();
    });

    it("should install and load extension", async () => {
      const extensionName = "spatial";
      const mockContext: RequestContext = { requestId: "test-123", timestamp: new Date().toISOString() };

      await connectionManager.loadExtension(extensionName, mockContext);

      expect(mockConnection.run).toHaveBeenCalledWith("INSTALL 'spatial'");
      expect(mockConnection.run).toHaveBeenCalledWith("LOAD 'spatial'");
    });

    it("should escape single quotes in extension names", async () => {
      const extensionName = "test'extension";
      const mockContext: RequestContext = { requestId: "test-123", timestamp: new Date().toISOString() };

      await connectionManager.loadExtension(extensionName, mockContext);

      expect(mockConnection.run).toHaveBeenCalledWith("INSTALL 'test''extension'");
      expect(mockConnection.run).toHaveBeenCalledWith("LOAD 'test''extension'");
    });

    it("should throw if not initialized", async () => {
      const uninitializedManager = new DuckDBConnectionManager();
      const mockContext: RequestContext = { requestId: "test-123", timestamp: new Date().toISOString() };

      await expect(
        uninitializedManager.loadExtension("test", mockContext)
      ).rejects.toThrow(McpError);
    });

    it("should handle extension loading errors", async () => {
      const error = new Error("Extension not found");
      vi.mocked(mockConnection.run!).mockRejectedValue(error);
      const mockContext: RequestContext = { requestId: "test-123", timestamp: new Date().toISOString() };

      await expect(
        connectionManager.loadExtension("nonexistent", mockContext)
      ).rejects.toThrow(McpError);
    });
  });

  describe("close", () => {
    it("should close connection and instance", async () => {
      await connectionManager.initialize();

      await connectionManager.close();

      expect(mockConnection.closeSync).toHaveBeenCalled();
      expect(mockInstance.closeSync).toHaveBeenCalled();
      expect(connectionManager.isServiceInitialized).toBe(false);
    });

    it("should handle close when not initialized", async () => {
      await expect(connectionManager.close()).resolves.not.toThrow();
    });

    it("should handle close errors gracefully", async () => {
      await connectionManager.initialize();
      vi.mocked(mockConnection.closeSync!).mockImplementation(() => {
        throw new Error("Close error");
      });

      await expect(connectionManager.close()).rejects.toThrow(McpError);
    });
  });

  describe("ensureInitialized", () => {
    it("should not throw when initialized", async () => {
      await connectionManager.initialize();
      const mockContext: RequestContext = { requestId: "test-123", timestamp: new Date().toISOString() };

      expect(() => connectionManager.ensureInitialized(mockContext)).not.toThrow();
    });

    it("should throw when not initialized", () => {
      const mockContext: RequestContext = { requestId: "test-123", timestamp: new Date().toISOString() };

      expect(() => connectionManager.ensureInitialized(mockContext)).toThrow(McpError);
      expect(() => connectionManager.ensureInitialized(mockContext)).toThrow(
        "DuckDBConnectionManager is not initialized"
      );
    });
  });

  describe("getConnection", () => {
    it("should return connection when initialized", async () => {
      await connectionManager.initialize();

      const connection = connectionManager.getConnection();

      expect(connection).toBe(mockConnection);
    });

    it("should throw when not initialized", () => {
      expect(() => connectionManager.getConnection()).toThrow(McpError);
    });
  });

  describe("getInstance", () => {
    it("should return instance when initialized", async () => {
      await connectionManager.initialize();

      const instance = connectionManager.getInstance();

      expect(instance).toBe(mockInstance);
    });

    it("should throw when not initialized", () => {
      expect(() => connectionManager.getInstance()).toThrow(McpError);
    });
  });

  describe("isServiceInitialized", () => {
    it("should return false initially", () => {
      expect(connectionManager.isServiceInitialized).toBe(false);
    });

    it("should return true after initialization", async () => {
      await connectionManager.initialize();

      expect(connectionManager.isServiceInitialized).toBe(true);
    });

    it("should return false after close", async () => {
      await connectionManager.initialize();
      await connectionManager.close();

      expect(connectionManager.isServiceInitialized).toBe(false);
    });
  });
});

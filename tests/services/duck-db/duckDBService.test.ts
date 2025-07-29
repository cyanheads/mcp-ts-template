/**
 * @fileoverview Tests for the main DuckDB service.
 * @module tests/services/duck-db/duckDBService.test
 */

import * as duckdb from "@duckdb/node-api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DuckDBService } from "../../../src/services/duck-db/duckDBService.js";
import { DuckDBConnectionManager } from "../../../src/services/duck-db/duckDBConnectionManager.js";
import { DuckDBQueryExecutor } from "../../../src/services/duck-db/duckDBQueryExecutor.js";
import { McpError, BaseErrorCode } from "../../../src/types-global/errors.js";

// Mock the dependencies
vi.mock("../../../src/services/duck-db/duckDBConnectionManager.js");
vi.mock("../../../src/services/duck-db/duckDBQueryExecutor.js");
vi.mock("@duckdb/node-api");

describe("DuckDBService", () => {
  let duckDBService: DuckDBService;
  let mockConnectionManager: Partial<DuckDBConnectionManager>;
  let mockQueryExecutor: Partial<DuckDBQueryExecutor>;
  let mockConnection: Partial<duckdb.DuckDBConnection>;
  let mockInstance: Partial<duckdb.DuckDBInstance>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mocks
    mockConnection = { run: vi.fn() };
    mockInstance = { connect: vi.fn() };

    mockQueryExecutor = {
      run: vi.fn(),
      query: vi.fn(),
      stream: vi.fn(),
      prepare: vi.fn(),
      beginTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
    };

    mockConnectionManager = {
      initialize: vi.fn(),
      getConnection: vi.fn().mockReturnValue(mockConnection),
      getInstance: vi.fn().mockReturnValue(mockInstance),
      ensureInitialized: vi.fn(),
      loadExtension: vi.fn(),
      close: vi.fn(),
      isServiceInitialized: true,
    };

    // Mock the constructors
    vi.mocked(DuckDBConnectionManager).mockImplementation(
      () => mockConnectionManager as DuckDBConnectionManager,
    );
    vi.mocked(DuckDBQueryExecutor).mockImplementation(
      () => mockQueryExecutor as DuckDBQueryExecutor,
    );

    duckDBService = new DuckDBService();
  });

  describe("initialize", () => {
    it("should initialize the service with default configuration", async () => {
      await duckDBService.initialize();

      expect(mockConnectionManager.initialize).toHaveBeenCalledWith(undefined);
      expect(DuckDBQueryExecutor).toHaveBeenCalledWith(mockConnection);
    });

    it("should initialize the service with custom configuration", async () => {
      const config = {
        dbPath: "/tmp/test.db",
        launchConfig: { allow_unsigned_extensions: "true" },
        extensions: ["httpfs"],
      };

      await duckDBService.initialize(config);

      expect(mockConnectionManager.initialize).toHaveBeenCalledWith(config);
    });

    it("should not reinitialize if already initialized", async () => {
      await duckDBService.initialize();
      vi.clearAllMocks();

      await duckDBService.initialize();

      expect(mockConnectionManager.initialize).not.toHaveBeenCalled();
    });

    it("should handle initialization errors", async () => {
      const error = new Error("Initialization failed");
      vi.mocked(mockConnectionManager.initialize!).mockRejectedValue(error);

      await expect(duckDBService.initialize()).rejects.toThrow(McpError);
    });
  });

  describe("run", () => {
    beforeEach(async () => {
      await duckDBService.initialize();
    });

    it("should execute SQL without parameters", async () => {
      const sql = "CREATE TABLE test (id INTEGER)";
      vi.mocked(mockQueryExecutor.run!).mockResolvedValue(undefined);

      await duckDBService.run(sql);

      expect(mockConnectionManager.ensureInitialized).toHaveBeenCalled();
      expect(mockQueryExecutor.run).toHaveBeenCalledWith(sql, undefined);
    });

    it("should execute SQL with parameters", async () => {
      const sql = "INSERT INTO test VALUES (?)";
      const params = [1];
      vi.mocked(mockQueryExecutor.run!).mockResolvedValue(undefined);

      await duckDBService.run(sql, params);

      expect(mockQueryExecutor.run).toHaveBeenCalledWith(sql, params);
    });

    it("should throw error for non-array parameters", async () => {
      const sql = "SELECT * FROM test";
      const params = { id: 1 } as unknown as unknown[];

      await expect(duckDBService.run(sql, params)).rejects.toThrow(McpError);
      await expect(duckDBService.run(sql, params)).rejects.toThrow(
        "DuckDB service only supports array-style parameters",
      );
    });

    it("should throw if not initialized", async () => {
      const uninitializedService = new DuckDBService();
      vi.mocked(mockConnectionManager.ensureInitialized!).mockImplementation(
        () => {
          throw new McpError(
            BaseErrorCode.SERVICE_NOT_INITIALIZED,
            "Service not initialized",
          );
        },
      );

      await expect(uninitializedService.run("SELECT 1")).rejects.toThrow(
        McpError,
      );
    });
  });

  describe("query", () => {
    beforeEach(async () => {
      await duckDBService.initialize();
    });

    it("should execute query and return results", async () => {
      const sql = "SELECT * FROM test";
      const expectedResult = {
        rows: [{ id: 1, name: "test" }],
        columnNames: ["id", "name"],
        columnTypes: [duckdb.DuckDBTypeId.INTEGER, duckdb.DuckDBTypeId.VARCHAR],
        rowCount: 1,
      };

      vi.mocked(mockQueryExecutor.query!).mockResolvedValue(expectedResult);

      const result = await duckDBService.query(sql);

      expect(mockQueryExecutor.query).toHaveBeenCalledWith(sql, undefined);
      expect(result).toEqual(expectedResult);
    });

    it("should execute query with parameters", async () => {
      const sql = "SELECT * FROM test WHERE id = ?";
      const params = [1];
      const expectedResult = {
        rows: [{ id: 1, name: "test" }],
        columnNames: ["id", "name"],
        columnTypes: [duckdb.DuckDBTypeId.INTEGER, duckdb.DuckDBTypeId.VARCHAR],
        rowCount: 1,
      };

      vi.mocked(mockQueryExecutor.query!).mockResolvedValue(expectedResult);

      const result = await duckDBService.query(sql, params);

      expect(mockQueryExecutor.query).toHaveBeenCalledWith(sql, params);
      expect(result).toEqual(expectedResult);
    });

    it("should validate parameters", async () => {
      const sql = "SELECT * FROM test";
      const params = { id: 1 } as unknown as unknown[];

      await expect(duckDBService.query(sql, params)).rejects.toThrow(McpError);
    });
  });

  describe("stream", () => {
    beforeEach(async () => {
      await duckDBService.initialize();
    });

    it("should return streaming result", async () => {
      const sql = "SELECT * FROM large_table";
      const mockStreamResult = {
        stream: "result",
      } as unknown as duckdb.DuckDBResult;

      vi.mocked(mockQueryExecutor.stream!).mockResolvedValue(mockStreamResult);

      const result = await duckDBService.stream(sql);

      expect(mockQueryExecutor.stream).toHaveBeenCalledWith(sql, undefined);
      expect(result).toBe(mockStreamResult);
    });

    it("should handle streaming with parameters", async () => {
      const sql = "SELECT * FROM large_table WHERE id > ?";
      const params = [100];
      const mockStreamResult = {
        stream: "result",
      } as unknown as duckdb.DuckDBResult;

      vi.mocked(mockQueryExecutor.stream!).mockResolvedValue(mockStreamResult);

      const result = await duckDBService.stream(sql, params);

      expect(mockQueryExecutor.stream).toHaveBeenCalledWith(sql, params);
      expect(result).toBe(mockStreamResult);
    });
  });

  describe("prepare", () => {
    beforeEach(async () => {
      await duckDBService.initialize();
    });

    it("should prepare a statement", async () => {
      const sql = "SELECT * FROM test WHERE id = ?";
      const mockPreparedStatement = {
        prepared: true,
      } as unknown as duckdb.DuckDBPreparedStatement;

      vi.mocked(mockQueryExecutor.prepare!).mockResolvedValue(
        mockPreparedStatement,
      );

      const result = await duckDBService.prepare(sql);

      expect(mockQueryExecutor.prepare).toHaveBeenCalledWith(sql);
      expect(result).toBe(mockPreparedStatement);
    });
  });

  describe("Transaction Management", () => {
    beforeEach(async () => {
      await duckDBService.initialize();
      vi.mocked(mockQueryExecutor.beginTransaction!).mockResolvedValue(
        undefined,
      );
      vi.mocked(mockQueryExecutor.commitTransaction!).mockResolvedValue(
        undefined,
      );
      vi.mocked(mockQueryExecutor.rollbackTransaction!).mockResolvedValue(
        undefined,
      );
    });

    it("should begin transaction", async () => {
      await duckDBService.beginTransaction();

      expect(mockQueryExecutor.beginTransaction).toHaveBeenCalled();
    });

    it("should commit transaction", async () => {
      await duckDBService.commitTransaction();

      expect(mockQueryExecutor.commitTransaction).toHaveBeenCalled();
    });

    it("should rollback transaction", async () => {
      await duckDBService.rollbackTransaction();

      expect(mockQueryExecutor.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe("loadExtension", () => {
    beforeEach(async () => {
      await duckDBService.initialize();
    });

    it("should load extension", async () => {
      const extensionName = "spatial";
      vi.mocked(mockConnectionManager.loadExtension!).mockResolvedValue(
        undefined,
      );

      await duckDBService.loadExtension(extensionName);

      expect(mockConnectionManager.loadExtension).toHaveBeenCalledWith(
        extensionName,
        expect.objectContaining({ operation: "DuckDBService.loadExtension" }),
      );
    });
  });

  describe("close", () => {
    beforeEach(async () => {
      await duckDBService.initialize();
    });

    it("should close the service", async () => {
      vi.mocked(mockConnectionManager.close!).mockResolvedValue(undefined);

      await duckDBService.close();

      expect(mockConnectionManager.close).toHaveBeenCalled();
    });

    it("should handle close errors", async () => {
      const error = new Error("Close failed");
      vi.mocked(mockConnectionManager.close!).mockRejectedValue(error);

      await expect(duckDBService.close()).rejects.toThrow(McpError);
    });
  });

  describe("Raw Access Methods", () => {
    it("should return raw connection when initialized", async () => {
      await duckDBService.initialize();

      const connection = duckDBService.getRawConnection();

      expect(connection).toBe(mockConnection);
    });

    it("should return null when not initialized", () => {
      const uninitializedService = new DuckDBService();
      Object.defineProperty(mockConnectionManager, "isServiceInitialized", {
        get: vi.fn(() => false),
        configurable: true,
      });

      const connection = uninitializedService.getRawConnection();

      expect(connection).toBeNull();
    });

    it("should return raw instance when initialized", async () => {
      await duckDBService.initialize();

      const instance = duckDBService.getRawInstance();

      expect(instance).toBe(mockInstance);
    });

    it("should return null instance when not initialized", () => {
      const uninitializedService = new DuckDBService();
      Object.defineProperty(mockConnectionManager, "isServiceInitialized", {
        get: vi.fn(() => false),
        configurable: true,
      });

      const instance = uninitializedService.getRawInstance();

      expect(instance).toBeNull();
    });
  });

  describe("Error Handling", () => {
    it("should handle ensureInitialized throwing service not initialized", async () => {
      await duckDBService.initialize();
      vi.mocked(mockConnectionManager.ensureInitialized!).mockImplementation(
        () => {
          throw new McpError(
            BaseErrorCode.SERVICE_NOT_INITIALIZED,
            "Service not initialized",
          );
        },
      );

      await expect(duckDBService.run("SELECT 1")).rejects.toThrow(McpError);
    });

    it("should handle missing query executor", async () => {
      const service = new DuckDBService();
      // Simulate partially initialized state
      (
        service as unknown as { isInitialized: boolean; queryExecutor: null }
      ).isInitialized = true;
      (
        service as unknown as { isInitialized: boolean; queryExecutor: null }
      ).queryExecutor = null;

      await expect(service.run("SELECT 1")).rejects.toThrow(McpError);
      await expect(service.run("SELECT 1")).rejects.toThrow(
        "DuckDBQueryExecutor not available",
      );
    });
  });
});

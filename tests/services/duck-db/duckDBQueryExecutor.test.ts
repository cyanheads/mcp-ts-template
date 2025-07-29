/**
 * @fileoverview Tests for the DuckDB query executor.
 * @module tests/services/duck-db/duckDBQueryExecutor.test
 */

import * as duckdb from "@duckdb/node-api";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DuckDBQueryExecutor } from "../../../src/services/duck-db/duckDBQueryExecutor.js";
import { McpError } from "../../../src/types-global/errors.js";

// Mock the DuckDB library
vi.mock("@duckdb/node-api");

describe("DuckDBQueryExecutor", () => {
  let mockConnection: Partial<duckdb.DuckDBConnection>;
  let queryExecutor: DuckDBQueryExecutor;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create a mock connection
    mockConnection = {
      run: vi.fn(),
      stream: vi.fn(),
      prepare: vi.fn(),
    };

    queryExecutor = new DuckDBQueryExecutor(
      mockConnection as duckdb.DuckDBConnection,
    );
  });

  describe("run", () => {
    it("should execute SQL without parameters", async () => {
      const sql = "CREATE TABLE test (id INTEGER)";
      vi.mocked(mockConnection.run!).mockResolvedValue(
        {} as duckdb.DuckDBMaterializedResult,
      );

      await queryExecutor.run(sql);

      expect(mockConnection.run).toHaveBeenCalledWith(sql);
      expect(mockConnection.run).toHaveBeenCalledTimes(1);
    });

    it("should execute SQL with parameters", async () => {
      const sql = "INSERT INTO test VALUES (?)";
      const params = [1];
      vi.mocked(mockConnection.run!).mockResolvedValue(
        {} as duckdb.DuckDBMaterializedResult,
      );

      await queryExecutor.run(sql, params);

      expect(mockConnection.run).toHaveBeenCalledWith(sql, params);
      expect(mockConnection.run).toHaveBeenCalledTimes(1);
    });

    it("should throw McpError when SQL execution fails", async () => {
      const sql = "INVALID SQL";
      const error = new Error("SQL syntax error");
      vi.mocked(mockConnection.run!).mockRejectedValue(error);

      await expect(queryExecutor.run(sql)).rejects.toThrow(McpError);
      await expect(queryExecutor.run(sql)).rejects.toThrow(
        "Error in DuckDBQueryExecutor.run",
      );
    });
  });

  describe("query", () => {
    it("should execute query and return formatted results", async () => {
      const sql = "SELECT * FROM test";
      const mockRows = [{ id: 1, name: "test" }];
      const mockColumnNames = ["id", "name"];
      const mockColumnTypes = [
        { typeId: duckdb.DuckDBTypeId.INTEGER },
        { typeId: duckdb.DuckDBTypeId.VARCHAR },
      ];

      const mockResult = {
        getRows: vi.fn().mockResolvedValue(mockRows),
        columnNames: vi.fn().mockReturnValue(mockColumnNames),
        columnTypes: vi.fn().mockReturnValue(mockColumnTypes),
      };

      vi.mocked(mockConnection.stream!).mockResolvedValue(
        mockResult as unknown as duckdb.DuckDBResult,
      );

      const result = await queryExecutor.query(sql);

      expect(result).toEqual({
        rows: mockRows,
        columnNames: mockColumnNames,
        columnTypes: [duckdb.DuckDBTypeId.INTEGER, duckdb.DuckDBTypeId.VARCHAR],
        rowCount: 1,
      });
    });

    it("should execute query with parameters", async () => {
      const sql = "SELECT * FROM test WHERE id = ?";
      const params = [1];
      const mockRows = [{ id: 1, name: "test" }];

      const mockResult = {
        getRows: vi.fn().mockResolvedValue(mockRows),
        columnNames: vi.fn().mockReturnValue(["id", "name"]),
        columnTypes: vi
          .fn()
          .mockReturnValue([
            { typeId: duckdb.DuckDBTypeId.INTEGER },
            { typeId: duckdb.DuckDBTypeId.VARCHAR },
          ]),
      };

      vi.mocked(mockConnection.stream!).mockResolvedValue(
        mockResult as unknown as duckdb.DuckDBResult,
      );

      const result = await queryExecutor.query(sql, params);

      expect(mockConnection.stream).toHaveBeenCalledWith(sql, params);
      expect(result.rowCount).toBe(1);
    });

    it("should handle empty result sets", async () => {
      const sql = "SELECT * FROM empty_table";
      const mockResult = {
        getRows: vi.fn().mockResolvedValue([]),
        columnNames: vi.fn().mockReturnValue(["id"]),
        columnTypes: vi
          .fn()
          .mockReturnValue([{ typeId: duckdb.DuckDBTypeId.INTEGER }]),
      };

      vi.mocked(mockConnection.stream!).mockResolvedValue(
        mockResult as unknown as duckdb.DuckDBResult,
      );

      const result = await queryExecutor.query(sql);

      expect(result.rows).toEqual([]);
      expect(result.rowCount).toBe(0);
    });
  });

  describe("stream", () => {
    it("should return streaming result without parameters", async () => {
      const sql = "SELECT * FROM large_table";
      const mockResult = { stream: "result" };
      vi.mocked(mockConnection.stream!).mockResolvedValue(
        mockResult as unknown as duckdb.DuckDBResult,
      );

      const result = await queryExecutor.stream(sql);

      expect(mockConnection.stream).toHaveBeenCalledWith(sql);
      expect(result).toBe(mockResult);
    });

    it("should return streaming result with parameters", async () => {
      const sql = "SELECT * FROM large_table WHERE id > ?";
      const params = [100];
      const mockResult = { stream: "result" };
      vi.mocked(mockConnection.stream!).mockResolvedValue(
        mockResult as unknown as duckdb.DuckDBResult,
      );

      const result = await queryExecutor.stream(sql, params);

      expect(mockConnection.stream).toHaveBeenCalledWith(sql, params);
      expect(result).toBe(mockResult);
    });
  });

  describe("prepare", () => {
    it("should prepare a statement", async () => {
      const sql = "SELECT * FROM test WHERE id = ?";
      const mockPreparedStatement = { prepared: true };
      vi.mocked(mockConnection.prepare!).mockResolvedValue(
        mockPreparedStatement as unknown as duckdb.DuckDBPreparedStatement,
      );

      const result = await queryExecutor.prepare(sql);

      expect(mockConnection.prepare).toHaveBeenCalledWith(sql);
      expect(result).toBe(mockPreparedStatement);
    });

    it("should throw McpError when prepare fails", async () => {
      const sql = "INVALID PREPARE SQL";
      const error = new Error("Prepare failed");
      vi.mocked(mockConnection.prepare!).mockRejectedValue(error);

      await expect(queryExecutor.prepare(sql)).rejects.toThrow(McpError);
    });
  });

  describe("Transaction Management", () => {
    beforeEach(() => {
      vi.mocked(mockConnection.run!).mockResolvedValue(
        {} as duckdb.DuckDBMaterializedResult,
      );
    });

    it("should begin transaction", async () => {
      await queryExecutor.beginTransaction();

      expect(mockConnection.run).toHaveBeenCalledWith("BEGIN TRANSACTION");
    });

    it("should commit transaction", async () => {
      await queryExecutor.commitTransaction();

      expect(mockConnection.run).toHaveBeenCalledWith("COMMIT");
    });

    it("should rollback transaction", async () => {
      await queryExecutor.rollbackTransaction();

      expect(mockConnection.run).toHaveBeenCalledWith("ROLLBACK");
    });

    it("should handle transaction errors", async () => {
      const error = new Error("Transaction failed");
      vi.mocked(mockConnection.run!).mockRejectedValue(error);

      await expect(queryExecutor.beginTransaction()).rejects.toThrow(McpError);
      await expect(queryExecutor.commitTransaction()).rejects.toThrow(McpError);
      await expect(queryExecutor.rollbackTransaction()).rejects.toThrow(
        McpError,
      );
    });
  });
});

/**
 * @fileoverview Tests for the IdGenerator utility.
 * @module tests/utils/security/idGenerator.test
 */
import { describe, it, expect } from "vitest";
import {
  IdGenerator,
  generateUUID,
} from "../../../src/utils/security/idGenerator";
import { McpError, BaseErrorCode } from "../../../src/types-global/errors";

describe("IdGenerator and UUID", () => {
  describe("generateUUID", () => {
    it("should generate a valid v4 UUID", () => {
      const uuid = generateUUID();
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });
  });

  describe("IdGenerator", () => {
    const entityPrefixes = {
      user: "USR",
      project: "PROJ",
    };
    const idGenerator = new IdGenerator(entityPrefixes);

    it("should generate a random string of default length", () => {
      const randomStr = idGenerator.generateRandomString();
      expect(randomStr).toHaveLength(6);
    });

    it("should generate a random string of specified length and charset", () => {
      const randomStr = idGenerator.generateRandomString(10, "abc");
      expect(randomStr).toHaveLength(10);
      expect(randomStr).toMatch(/^[a-c]{10}$/);
    });

    it("should generate a simple ID without a prefix", () => {
      const id = idGenerator.generate();
      expect(id).toHaveLength(6);
    });

    it("should generate an ID with a custom prefix", () => {
      const id = idGenerator.generate("CUSTOM");
      expect(id).toMatch(/^CUSTOM_/);
      expect(id).toHaveLength(13); // CUSTOM_ + 6 chars
    });

    it("should generate an ID for a registered entity", () => {
      const userId = idGenerator.generateForEntity("user");
      expect(userId).toMatch(/^USR_/);
    });

    it("should throw an error when generating for an unknown entity", () => {
      expect(() => idGenerator.generateForEntity("unknown")).toThrow(McpError);
      try {
        idGenerator.generateForEntity("unknown");
      } catch (error) {
        const mcpError = error as McpError;
        expect(mcpError.code).toBe(BaseErrorCode.VALIDATION_ERROR);
      }
    });

    it("should validate a correct ID", () => {
      const userId = idGenerator.generateForEntity("user");
      expect(idGenerator.isValid(userId, "user")).toBe(true);
    });

    it("should invalidate an incorrect ID", () => {
      expect(idGenerator.isValid("USR_123", "user")).toBe(false); // Wrong length
      expect(idGenerator.isValid("PROJ_ABCDEF", "user")).toBe(false); // Wrong prefix
    });

    it("should strip the prefix from an ID", () => {
      const userId = "USR_ABC123";
      expect(idGenerator.stripPrefix(userId)).toBe("ABC123");
    });

    it("should get the entity type from an ID", () => {
      const projId = "PROJ_XYZ789";
      expect(idGenerator.getEntityType(projId)).toBe("project");
    });

    it("should throw an error for an unknown prefix when getting entity type", () => {
      expect(() => idGenerator.getEntityType("UNK_123")).toThrow(McpError);
    });

    it("should normalize an ID", () => {
      const lowerCaseId = "usr_abc123";
      expect(idGenerator.normalize(lowerCaseId)).toBe("USR_ABC123");
    });

    it("should handle custom separators", () => {
      const customGenerator = new IdGenerator({ test: "TEST" });
      const options = { separator: "-" };
      const id = customGenerator.generate("TEST", options);
      expect(id).toContain("-");
      expect(customGenerator.stripPrefix(id, "-")).not.toContain("-");
      expect(customGenerator.getEntityType(id, "-")).toBe("test");
    });
  });
});

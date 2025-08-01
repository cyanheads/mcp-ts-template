/**
 * @fileoverview Defines a wrapper around the McpServer class to provide
 * extended functionality, such as metadata introspection, without needing
 * to access private properties of the underlying SDK class.
 * @module src/mcp-server/core/managedMcpServer
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// By using Parameters and ReturnType, we can get the exact types from the
// McpServer class without needing to import them directly. This makes our
// wrapper more resilient to SDK changes.
type RegisterToolParameters = Parameters<McpServer["registerTool"]>;
type ToolSpec = RegisterToolParameters[1];
type ToolImplementation = RegisterToolParameters[2];
type RegisteredToolReturn = ReturnType<McpServer["registerTool"]>;

type ServerIdentity = ConstructorParameters<typeof McpServer>[0];
type McpServerOptions = NonNullable<ConstructorParameters<typeof McpServer>[1]>;

interface StoredTool {
  name: string;
  spec: ToolSpec;
}

/**
 * A wrapper around the McpServer that captures registration metadata
 * to make it available for status endpoints and other diagnostics.
 * It acts as a full pass-through for all McpServer functionality.
 */
export class ManagedMcpServer extends McpServer {
  private readonly storedTools: StoredTool[] = [];

  public readonly serverIdentity: ServerIdentity;
  public readonly serverOptions?: McpServerOptions;

  constructor(identity: ServerIdentity, options?: McpServerOptions) {
    super(identity, options);
    this.serverIdentity = identity;
    this.serverOptions = options;
  }

  override registerTool(
    name: string,
    spec: ToolSpec,
    implementation: ToolImplementation,
  ): RegisteredToolReturn {
    this.storedTools.push({ name, spec });
    return super.registerTool(name, spec, implementation);
  }

  /**
   * Retrieves the metadata for all registered tools.
   */
  public getTools(): {
    name: string;
    description?: string;
    inputSchema: unknown;
    outputSchema?: unknown;
  }[] {
    return this.storedTools.map((t) => ({
      name: t.name,
      description: t.spec.description,
      inputSchema: t.spec.inputSchema,
      outputSchema: t.spec.outputSchema,
    }));
  }

  /**
   * Gets the server's name from its identity.
   */
  public get name(): string {
    return this.serverIdentity.name;
  }

  /**
   * Gets the server's version from its identity.
   */
  public get version(): string {
    return this.serverIdentity.version;
  }

  /**
   * Gets the server's capabilities from its options.
   */
  public get capabilities(): McpServerOptions["capabilities"] | undefined {
    // The type inference for McpServerOptions is imperfect, so we cast to a
    // known shape as a pragmatic solution, knowing the property exists at runtime.
    return (
      this.serverOptions as {
        capabilities?: McpServerOptions["capabilities"];
      }
    )?.capabilities;
  }
}

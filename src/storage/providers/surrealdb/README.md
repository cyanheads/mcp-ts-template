# SurrealDB Storage Provider

This directory contains a comprehensive, production-grade storage provider for SurrealDB. It leverages the advanced features of SurrealDB to offer capabilities far beyond simple key-value storage, including multi-tenancy, graph operations, transactional integrity, and schema management.

## ✨ Features

- **Centralized Client (`SurrealDbClient`)**: A single entry point for all SurrealDB interactions, managing connections and providing access to specialized feature managers.
- **Connection Management**: Robust WebSocket connection handling with automatic reconnection and health checks.
- **Transactional Integrity**: A `TransactionManager` that wraps operations in `BEGIN`/`COMMIT`/`CANCEL` blocks to ensure atomicity.
- **Advanced Authentication (`AuthManager`)**:
  - Declarative setup for database access policies using `DEFINE ACCESS`.
  - Supports JWT-based and record-based authentication strategies.
  - Helpers for defining table permissions (`PermissionHelper`) and common auth scopes (`ScopeDefinitions`).
- **Full Graph Database Capabilities**:
  - **Graph Operations**: Create, traverse, and manage graph edges and vertices.
  - **Relationship Management**: High-level API for creating, updating, and querying relationships with metadata.
  - **Pathfinding**: Implements algorithms for shortest path, all paths, cycle detection, and degree calculation.
- **Schema Introspection & Migrations**:
  - **Introspector**: A utility to inspect tables, fields, indexes, and events at runtime.
  - **Migration Runner**: A version-controlled schema migration system with `up`/`down` scripts and rollback support.
- **Events & Custom Functions**:
  - **Event Manager**: Define and manage database triggers (`DEFINE EVENT`) for auditing, webhooks, or cascade operations.
  - **Custom Functions**: Create and manage reusable SurrealQL functions (`DEFINE FUNCTION`) for complex logic.
- **Fluent Query Builders**:
  - Type-safe builders for constructing complex `SELECT` queries, `WHERE` clauses, `FOR` loops, and nested subqueries, reducing the risk of syntax errors.
- **KV Storage Abstraction (`SurrealKvProvider`)**:
  - Implements the core `IStorageProvider` interface for key-value operations.
  - Built-in support for multi-tenancy, TTL expiration, batch operations, and secure cursor-based pagination.

## architectural-philosophy

The provider's design is guided by the **Single Responsibility Principle** and **Composition over Inheritance**. Each major feature (Auth, Graph, Events, etc.) is encapsulated in its own manager class. The `SurrealDbClient` acts as a service locator or factory, providing access to these managers while abstracting away the underlying `surrealdb.js` driver instance. This decoupled architecture makes the system easier to maintain, test, and extend.

## 🚀 Getting Started

1.  **Configuration**: Set the required `SURREALDB_*` environment variables in your `.env` file as detailed in the root `README.md`.
2.  **Schema Initialization**: Before first use, apply the base database schema located in `schemas/surrealdb/surrealdb-schema.surql`.
3.  **Client Instantiation**: The `SurrealDbClient` and `SurrealKvProvider` are automatically registered in the DI container. Inject `IStorageProvider` (or the client directly) into your services as needed.

    ```ts
    // In a service class
    constructor(
      @inject(Storage) private readonly storage: IStorageProvider,
      @inject(SurrealdbClient) private readonly dbClient: Surreal
    ) {}
    ```

4.  **Using Advanced Features**: Access specialized managers directly from the client instance.

    ```ts
    // Example: Create a graph edge
    await this.dbClient.graph().createEdge(from, 'manages', to, { context });

    // Example: Define a table event
    await this.dbClient.events().defineEvent({ ... }, context);
    ```

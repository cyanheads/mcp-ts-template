/**
 * @fileoverview Defines local OpenTelemetry semantic convention constants to ensure
 * stability and avoid dependency conflicts with different versions of
 * `@opentelemetry/semantic-conventions`.
 *
 * This module provides both standard OTEL conventions (aligned with 1.37+) and
 * custom MCP-specific attributes for tool execution and resource monitoring.
 *
 * @module src/utils/telemetry/semconv
 */

// ============================================================================
// Standard OpenTelemetry Semantic Conventions (Stable)
// ============================================================================

/**
 * Logical name of the service (e.g., `my-mcp-server`).
 * @see https://opentelemetry.io/docs/specs/semconv/resource/#service
 */
export const ATTR_SERVICE_NAME = 'service.name';

/** Semantic version of the service (e.g., `1.2.3`). */
export const ATTR_SERVICE_VERSION = 'service.version';

/** Unique ID of the running service instance (e.g., a UUID or pod name). */
export const ATTR_SERVICE_INSTANCE_ID = 'service.instance.id';

/**
 * Name of the deployment environment (e.g., `production`, `staging`, `development`).
 * @see https://opentelemetry.io/docs/specs/semconv/resource/deployment-environment/
 */
export const ATTR_DEPLOYMENT_ENVIRONMENT_NAME = 'deployment.environment.name';

/**
 * Name of the cloud provider (e.g., `aws`, `gcp`, `azure`, `cloudflare`).
 * @see https://opentelemetry.io/docs/specs/semconv/resource/cloud/
 */
export const ATTR_CLOUD_PROVIDER = 'cloud.provider';

/** Cloud platform within the provider (e.g., `aws_lambda`, `gcp_cloud_run`, `cloudflare_workers`). */
export const ATTR_CLOUD_PLATFORM = 'cloud.platform';

/** Geographic region of the cloud resource (e.g., `us-east-1`). */
export const ATTR_CLOUD_REGION = 'cloud.region';

/** Availability zone within the cloud region. */
export const ATTR_CLOUD_AVAILABILITY_ZONE = 'cloud.availability_zone';

/** Cloud account or project ID that owns the resource. */
export const ATTR_CLOUD_ACCOUNT_ID = 'cloud.account.id';

/**
 * HTTP request method (e.g., `GET`, `POST`).
 * @see https://opentelemetry.io/docs/specs/semconv/http/
 */
export const ATTR_HTTP_REQUEST_METHOD = 'http.request.method';

/** HTTP response status code (e.g., `200`, `404`). */
export const ATTR_HTTP_RESPONSE_STATUS_CODE = 'http.response.status_code';

/** HTTP route template matched by the server (e.g., `/users/:id`). */
export const ATTR_HTTP_ROUTE = 'http.route';

/** Size of the HTTP request body in bytes. */
export const ATTR_HTTP_REQUEST_BODY_SIZE = 'http.request.body.size';

/** Size of the HTTP response body in bytes. */
export const ATTR_HTTP_RESPONSE_BODY_SIZE = 'http.response.body.size';

/** Full URL of the request including scheme, host, path, and query. */
export const ATTR_URL_FULL = 'url.full';

/** URL path component (e.g., `/api/users`). */
export const ATTR_URL_PATH = 'url.path';

/** URL query string (e.g., `?limit=10&offset=0`). */
export const ATTR_URL_QUERY = 'url.query';

/** URL scheme (e.g., `http`, `https`). */
export const ATTR_URL_SCHEME = 'url.scheme';

/**
 * Describes the class or type of error (e.g., `TimeoutError`, `500`).
 * @see https://opentelemetry.io/docs/specs/semconv/exceptions/
 */
export const ATTR_ERROR_TYPE = 'error.type';

/** Fully qualified exception class name (e.g., `java.io.IOException`). */
export const ATTR_EXCEPTION_TYPE = 'exception.type';

/** Exception message string. */
export const ATTR_EXCEPTION_MESSAGE = 'exception.message';

/** Full exception stack trace as a string. */
export const ATTR_EXCEPTION_STACKTRACE = 'exception.stacktrace';

/**
 * Name of the function or method being instrumented.
 * @see https://opentelemetry.io/docs/specs/semconv/general/attributes/
 */
export const ATTR_CODE_FUNCTION = 'code.function';

/** Fully qualified namespace or module containing the function (e.g., `com.example.MyClass`). */
export const ATTR_CODE_NAMESPACE = 'code.namespace';

/** Source file path containing the instrumented code. */
export const ATTR_CODE_FILEPATH = 'code.filepath';

/** Line number in the source file where the instrumented code starts. */
export const ATTR_CODE_LINENO = 'code.lineno';

/**
 * IP address or hostname of the remote peer.
 * @see https://opentelemetry.io/docs/specs/semconv/general/attributes/
 */
export const ATTR_NETWORK_PEER_ADDRESS = 'network.peer.address';

/** Port number of the remote peer. */
export const ATTR_NETWORK_PEER_PORT = 'network.peer.port';

/** Application-layer protocol name (e.g., `http`, `grpc`, `amqp`). */
export const ATTR_NETWORK_PROTOCOL_NAME = 'network.protocol.name';

/** Version of the application-layer protocol (e.g., `1.1`, `2`). */
export const ATTR_NETWORK_PROTOCOL_VERSION = 'network.protocol.version';

/**
 * Unparsed `User-Agent` header value from the HTTP request.
 */
export const ATTR_USER_AGENT_ORIGINAL = 'user_agent.original';

// ============================================================================
// Custom MCP Tool Execution Attributes
// ============================================================================

/**
 * Registered name of the MCP tool being invoked (e.g., `echo_message`).
 * Custom attribute specific to MCP tool invocations.
 */
export const ATTR_MCP_TOOL_NAME = 'mcp.tool.name';

/** Serialized byte size of the tool's input arguments. */
export const ATTR_MCP_TOOL_INPUT_BYTES = 'mcp.tool.input_bytes';

/** Serialized byte size of the tool's output result. */
export const ATTR_MCP_TOOL_OUTPUT_BYTES = 'mcp.tool.output_bytes';

/** Wall-clock execution duration of the tool handler in milliseconds. */
export const ATTR_MCP_TOOL_DURATION_MS = 'mcp.tool.duration_ms';

/** Whether the tool handler completed successfully (`true`) or with an error (`false`). */
export const ATTR_MCP_TOOL_SUCCESS = 'mcp.tool.success';

/** JSON-RPC error code from the thrown `McpError`, present when `mcp.tool.success` is `false`. */
export const ATTR_MCP_TOOL_ERROR_CODE = 'mcp.tool.error_code';

/**
 * Process Resident Set Size (RSS) in bytes immediately before tool handler execution.
 */
export const ATTR_MCP_TOOL_MEMORY_RSS_BEFORE = 'mcp.tool.memory_rss_bytes.before';

/** Process RSS in bytes immediately after tool handler execution. */
export const ATTR_MCP_TOOL_MEMORY_RSS_AFTER = 'mcp.tool.memory_rss_bytes.after';

/** Change in process RSS (after minus before) during tool handler execution. */
export const ATTR_MCP_TOOL_MEMORY_RSS_DELTA = 'mcp.tool.memory_rss_bytes.delta';

/**
 * V8 heap memory used in bytes immediately before tool handler execution.
 */
export const ATTR_MCP_TOOL_MEMORY_HEAP_USED_BEFORE = 'mcp.tool.memory_heap_used_bytes.before';

/** V8 heap memory used in bytes immediately after tool handler execution. */
export const ATTR_MCP_TOOL_MEMORY_HEAP_USED_AFTER = 'mcp.tool.memory_heap_used_bytes.after';

/** Change in V8 heap used (after minus before) during tool handler execution. */
export const ATTR_MCP_TOOL_MEMORY_HEAP_USED_DELTA = 'mcp.tool.memory_heap_used_bytes.delta';

// ============================================================================
// Custom MCP Resource Attributes
// ============================================================================

/**
 * Full URI identifying the MCP resource being accessed (e.g., `myscheme://items/123`).
 */
export const ATTR_MCP_RESOURCE_URI = 'mcp.resource.uri';

/** MIME type of the resource content (e.g., `application/json`, `text/plain`). */
export const ATTR_MCP_RESOURCE_MIME_TYPE = 'mcp.resource.mime_type';

/** Byte size of the resource content returned by the handler. */
export const ATTR_MCP_RESOURCE_SIZE_BYTES = 'mcp.resource.size_bytes';

// ============================================================================
// Custom MCP Request Context Attributes
// ============================================================================

/**
 * Unique identifier for the MCP request, auto-generated per invocation.
 */
export const ATTR_MCP_REQUEST_ID = 'mcp.request.id';

/** Name of the MCP operation being performed (e.g., `tools/call`, `resources/read`). */
export const ATTR_MCP_OPERATION_NAME = 'mcp.operation.name';

/** Tenant identifier from the JWT `tid` claim, used for multi-tenant storage scoping. */
export const ATTR_MCP_TENANT_ID = 'mcp.tenant.id';

/** OAuth client identifier from the JWT `cid` or `client_id` claim. */
export const ATTR_MCP_CLIENT_ID = 'mcp.client.id';

/** MCP transport session identifier, scoped to a single client connection. */
export const ATTR_MCP_SESSION_ID = 'mcp.session.id';

// ============================================================================
// Custom MCP Prompt Attributes
// ============================================================================

/** Registered name of the MCP prompt being generated (e.g., `code_review`). */
export const ATTR_MCP_PROMPT_NAME = 'mcp.prompt.name';

/** Wall-clock duration of the prompt generate function in milliseconds. */
export const ATTR_MCP_PROMPT_DURATION_MS = 'mcp.prompt.duration_ms';

/** Whether the prompt generation completed successfully. */
export const ATTR_MCP_PROMPT_SUCCESS = 'mcp.prompt.success';

/** Number of messages returned by the prompt generate function. */
export const ATTR_MCP_PROMPT_MESSAGE_COUNT = 'mcp.prompt.message_count';

// ============================================================================
// Custom MCP Resource Execution Attributes
// ============================================================================

/** Wall-clock duration of the resource handler in milliseconds. */
export const ATTR_MCP_RESOURCE_DURATION_MS = 'mcp.resource.duration_ms';

/** Whether the resource handler completed successfully. */
export const ATTR_MCP_RESOURCE_SUCCESS = 'mcp.resource.success';

/** JSON-RPC error code from the thrown error, present when `mcp.resource.success` is `false`. */
export const ATTR_MCP_RESOURCE_ERROR_CODE = 'mcp.resource.error_code';

// ============================================================================
// Custom MCP Storage Attributes
// ============================================================================

/** Storage operation name (e.g., `get`, `set`, `delete`, `list`, `getMany`, `setMany`). */
export const ATTR_MCP_STORAGE_OPERATION = 'mcp.storage.operation';

/** Number of keys involved in batch storage operations (getMany, setMany, deleteMany). */
export const ATTR_MCP_STORAGE_KEY_COUNT = 'mcp.storage.key_count';

/** Wall-clock duration of the storage operation in milliseconds. */
export const ATTR_MCP_STORAGE_DURATION_MS = 'mcp.storage.duration_ms';

/** Whether the storage operation completed successfully. */
export const ATTR_MCP_STORAGE_SUCCESS = 'mcp.storage.success';

// ============================================================================
// OpenTelemetry Generative AI Semantic Conventions
// @see https://opentelemetry.io/docs/specs/semconv/gen-ai/
// ============================================================================

/** Name of the GenAI system/provider (e.g., `openrouter`, `openai`, `anthropic`). */
export const ATTR_GEN_AI_SYSTEM = 'gen_ai.system';

/** Model name requested in the API call (e.g., `openai/gpt-4o`). */
export const ATTR_GEN_AI_REQUEST_MODEL = 'gen_ai.request.model';

/** Maximum number of tokens the model can generate. */
export const ATTR_GEN_AI_REQUEST_MAX_TOKENS = 'gen_ai.request.max_tokens';

/** Sampling temperature requested. */
export const ATTR_GEN_AI_REQUEST_TEMPERATURE = 'gen_ai.request.temperature';

/** Top-p (nucleus) sampling parameter. */
export const ATTR_GEN_AI_REQUEST_TOP_P = 'gen_ai.request.top_p';

/** Whether the request is a streaming completion. */
export const ATTR_GEN_AI_REQUEST_STREAMING = 'gen_ai.request.streaming';

/** Model name returned in the API response (may differ from request). */
export const ATTR_GEN_AI_RESPONSE_MODEL = 'gen_ai.response.model';

/** Number of input/prompt tokens consumed. */
export const ATTR_GEN_AI_USAGE_INPUT_TOKENS = 'gen_ai.usage.input_tokens';

/** Number of output/completion tokens generated. */
export const ATTR_GEN_AI_USAGE_OUTPUT_TOKENS = 'gen_ai.usage.output_tokens';

/** Total tokens (input + output). */
export const ATTR_GEN_AI_USAGE_TOTAL_TOKENS = 'gen_ai.usage.total_tokens';

/** Token type dimension: `input` or `output`. */
export const ATTR_GEN_AI_TOKEN_TYPE = 'gen_ai.token.type';

// ============================================================================
// Custom MCP Speech Attributes
// ============================================================================

/** Speech provider name (e.g., `elevenlabs`, `openai-whisper`). */
export const ATTR_MCP_SPEECH_PROVIDER = 'mcp.speech.provider';

/** Speech operation type: `tts` or `stt`. */
export const ATTR_MCP_SPEECH_OPERATION = 'mcp.speech.operation';

/** Wall-clock duration of the speech operation in milliseconds. */
export const ATTR_MCP_SPEECH_DURATION_MS = 'mcp.speech.duration_ms';

/** Whether the speech operation completed successfully. */
export const ATTR_MCP_SPEECH_SUCCESS = 'mcp.speech.success';

/** Input size in bytes (audio bytes for STT, text bytes for TTS). */
export const ATTR_MCP_SPEECH_INPUT_BYTES = 'mcp.speech.input_bytes';

/** Output size in bytes (audio bytes for TTS, text bytes for STT). */
export const ATTR_MCP_SPEECH_OUTPUT_BYTES = 'mcp.speech.output_bytes';

// ============================================================================
// Custom MCP Graph Attributes
// ============================================================================

/** Graph operation name (e.g., `relate`, `unrelate`, `traverse`, `shortestPath`). */
export const ATTR_MCP_GRAPH_OPERATION = 'mcp.graph.operation';

/** Wall-clock duration of the graph operation in milliseconds. */
export const ATTR_MCP_GRAPH_DURATION_MS = 'mcp.graph.duration_ms';

/** Whether the graph operation completed successfully. */
export const ATTR_MCP_GRAPH_SUCCESS = 'mcp.graph.success';

// ============================================================================
// Custom MCP Auth Attributes
// ============================================================================

/** Authentication method used (e.g., `bearer`, `none`). */
export const ATTR_MCP_AUTH_METHOD = 'mcp.auth.method';

/** Authentication outcome: `success`, `failure`, or `missing`. */
export const ATTR_MCP_AUTH_OUTCOME = 'mcp.auth.outcome';

/** Reason for authentication failure (e.g., `expired_token`, `invalid_token`, `missing_header`). */
export const ATTR_MCP_AUTH_FAILURE_REASON = 'mcp.auth.failure_reason';

/** Comma-separated OAuth/JWT scopes associated with the authenticated request. */
export const ATTR_MCP_AUTH_SCOPES = 'mcp.auth.scopes';

/** Authenticated subject identifier from the JWT `sub` claim. */
export const ATTR_MCP_AUTH_SUBJECT = 'mcp.auth.subject';

// ============================================================================
// Custom MCP Session Lifecycle Attributes
// ============================================================================

/** Session lifecycle event type: `created`, `terminated`, `rejected`, `stale_cleanup`. */
export const ATTR_MCP_SESSION_EVENT = 'mcp.session.event';

// ============================================================================
// Custom MCP Task Attributes
// ============================================================================

/** Task identifier. */
export const ATTR_MCP_TASK_ID = 'mcp.task.id';

/** Task status (e.g., `working`, `completed`, `failed`, `cancelled`). */
export const ATTR_MCP_TASK_STATUS = 'mcp.task.status';

/** Task store type: `in-memory` or `storage`. */
export const ATTR_MCP_TASK_STORE_TYPE = 'mcp.task.store_type';

// ============================================================================
// Custom MCP Error Classification Attributes
// ============================================================================

/** Classified JSON-RPC error code from ErrorHandler (e.g., `-32001`, `-32602`). */
export const ATTR_MCP_ERROR_CLASSIFIED_CODE = 'mcp.error.classified_code';

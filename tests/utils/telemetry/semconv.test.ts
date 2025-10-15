/**
 * @fileoverview Test suite for OpenTelemetry semantic conventions
 * @module tests/utils/telemetry/semconv.test
 */

import { describe, expect, test } from 'vitest';
import * as semconv from '@/utils/telemetry/semconv.js';

describe('OpenTelemetry Semantic Conventions', () => {
  describe('Standard OpenTelemetry Attributes', () => {
    describe('Service attributes', () => {
      test('should export service name attribute', () => {
        expect(semconv.ATTR_SERVICE_NAME).toBe('service.name');
      });

      test('should export service version attribute', () => {
        expect(semconv.ATTR_SERVICE_VERSION).toBe('service.version');
      });

      test('should export service instance ID attribute', () => {
        expect(semconv.ATTR_SERVICE_INSTANCE_ID).toBe('service.instance.id');
      });
    });

    describe('Deployment environment attributes', () => {
      test('should export deployment environment name attribute', () => {
        expect(semconv.ATTR_DEPLOYMENT_ENVIRONMENT_NAME).toBe(
          'deployment.environment.name',
        );
      });
    });

    describe('Cloud provider attributes', () => {
      test('should export cloud provider attribute', () => {
        expect(semconv.ATTR_CLOUD_PROVIDER).toBe('cloud.provider');
      });

      test('should export cloud platform attribute', () => {
        expect(semconv.ATTR_CLOUD_PLATFORM).toBe('cloud.platform');
      });

      test('should export cloud region attribute', () => {
        expect(semconv.ATTR_CLOUD_REGION).toBe('cloud.region');
      });

      test('should export cloud availability zone attribute', () => {
        expect(semconv.ATTR_CLOUD_AVAILABILITY_ZONE).toBe(
          'cloud.availability_zone',
        );
      });

      test('should export cloud account ID attribute', () => {
        expect(semconv.ATTR_CLOUD_ACCOUNT_ID).toBe('cloud.account.id');
      });
    });

    describe('HTTP attributes', () => {
      test('should export HTTP request method attribute', () => {
        expect(semconv.ATTR_HTTP_REQUEST_METHOD).toBe('http.request.method');
      });

      test('should export HTTP response status code attribute', () => {
        expect(semconv.ATTR_HTTP_RESPONSE_STATUS_CODE).toBe(
          'http.response.status_code',
        );
      });

      test('should export HTTP route attribute', () => {
        expect(semconv.ATTR_HTTP_ROUTE).toBe('http.route');
      });

      test('should export HTTP request body size attribute', () => {
        expect(semconv.ATTR_HTTP_REQUEST_BODY_SIZE).toBe(
          'http.request.body.size',
        );
      });

      test('should export HTTP response body size attribute', () => {
        expect(semconv.ATTR_HTTP_RESPONSE_BODY_SIZE).toBe(
          'http.response.body.size',
        );
      });

      test('should export URL full attribute', () => {
        expect(semconv.ATTR_URL_FULL).toBe('url.full');
      });

      test('should export URL path attribute', () => {
        expect(semconv.ATTR_URL_PATH).toBe('url.path');
      });

      test('should export URL query attribute', () => {
        expect(semconv.ATTR_URL_QUERY).toBe('url.query');
      });

      test('should export URL scheme attribute', () => {
        expect(semconv.ATTR_URL_SCHEME).toBe('url.scheme');
      });
    });

    describe('Error and exception attributes', () => {
      test('should export error type attribute', () => {
        expect(semconv.ATTR_ERROR_TYPE).toBe('error.type');
      });

      test('should export exception type attribute', () => {
        expect(semconv.ATTR_EXCEPTION_TYPE).toBe('exception.type');
      });

      test('should export exception message attribute', () => {
        expect(semconv.ATTR_EXCEPTION_MESSAGE).toBe('exception.message');
      });

      test('should export exception stacktrace attribute', () => {
        expect(semconv.ATTR_EXCEPTION_STACKTRACE).toBe('exception.stacktrace');
      });
    });

    describe('Code execution attributes', () => {
      test('should export code function attribute', () => {
        expect(semconv.ATTR_CODE_FUNCTION).toBe('code.function');
      });

      test('should export code namespace attribute', () => {
        expect(semconv.ATTR_CODE_NAMESPACE).toBe('code.namespace');
      });

      test('should export code filepath attribute', () => {
        expect(semconv.ATTR_CODE_FILEPATH).toBe('code.filepath');
      });

      test('should export code line number attribute', () => {
        expect(semconv.ATTR_CODE_LINENO).toBe('code.lineno');
      });
    });

    describe('Network attributes', () => {
      test('should export network peer address attribute', () => {
        expect(semconv.ATTR_NETWORK_PEER_ADDRESS).toBe('network.peer.address');
      });

      test('should export network peer port attribute', () => {
        expect(semconv.ATTR_NETWORK_PEER_PORT).toBe('network.peer.port');
      });

      test('should export network protocol name attribute', () => {
        expect(semconv.ATTR_NETWORK_PROTOCOL_NAME).toBe(
          'network.protocol.name',
        );
      });

      test('should export network protocol version attribute', () => {
        expect(semconv.ATTR_NETWORK_PROTOCOL_VERSION).toBe(
          'network.protocol.version',
        );
      });
    });

    describe('User agent attributes', () => {
      test('should export user agent original attribute', () => {
        expect(semconv.ATTR_USER_AGENT_ORIGINAL).toBe('user_agent.original');
      });
    });
  });

  describe('Custom MCP Tool Execution Attributes', () => {
    test('should export MCP tool name attribute', () => {
      expect(semconv.ATTR_MCP_TOOL_NAME).toBe('mcp.tool.name');
    });

    test('should export MCP tool input bytes attribute', () => {
      expect(semconv.ATTR_MCP_TOOL_INPUT_BYTES).toBe('mcp.tool.input_bytes');
    });

    test('should export MCP tool output bytes attribute', () => {
      expect(semconv.ATTR_MCP_TOOL_OUTPUT_BYTES).toBe('mcp.tool.output_bytes');
    });

    test('should export MCP tool duration attribute', () => {
      expect(semconv.ATTR_MCP_TOOL_DURATION_MS).toBe('mcp.tool.duration_ms');
    });

    test('should export MCP tool success attribute', () => {
      expect(semconv.ATTR_MCP_TOOL_SUCCESS).toBe('mcp.tool.success');
    });

    test('should export MCP tool error code attribute', () => {
      expect(semconv.ATTR_MCP_TOOL_ERROR_CODE).toBe('mcp.tool.error_code');
    });

    describe('Memory tracking attributes', () => {
      test('should export RSS memory before attribute', () => {
        expect(semconv.ATTR_MCP_TOOL_MEMORY_RSS_BEFORE).toBe(
          'mcp.tool.memory_rss_bytes.before',
        );
      });

      test('should export RSS memory after attribute', () => {
        expect(semconv.ATTR_MCP_TOOL_MEMORY_RSS_AFTER).toBe(
          'mcp.tool.memory_rss_bytes.after',
        );
      });

      test('should export RSS memory delta attribute', () => {
        expect(semconv.ATTR_MCP_TOOL_MEMORY_RSS_DELTA).toBe(
          'mcp.tool.memory_rss_bytes.delta',
        );
      });

      test('should export heap used memory before attribute', () => {
        expect(semconv.ATTR_MCP_TOOL_MEMORY_HEAP_USED_BEFORE).toBe(
          'mcp.tool.memory_heap_used_bytes.before',
        );
      });

      test('should export heap used memory after attribute', () => {
        expect(semconv.ATTR_MCP_TOOL_MEMORY_HEAP_USED_AFTER).toBe(
          'mcp.tool.memory_heap_used_bytes.after',
        );
      });

      test('should export heap used memory delta attribute', () => {
        expect(semconv.ATTR_MCP_TOOL_MEMORY_HEAP_USED_DELTA).toBe(
          'mcp.tool.memory_heap_used_bytes.delta',
        );
      });
    });
  });

  describe('Custom MCP Resource Attributes', () => {
    test('should export MCP resource URI attribute', () => {
      expect(semconv.ATTR_MCP_RESOURCE_URI).toBe('mcp.resource.uri');
    });

    test('should export MCP resource MIME type attribute', () => {
      expect(semconv.ATTR_MCP_RESOURCE_MIME_TYPE).toBe(
        'mcp.resource.mime_type',
      );
    });

    test('should export MCP resource size attribute', () => {
      expect(semconv.ATTR_MCP_RESOURCE_SIZE_BYTES).toBe(
        'mcp.resource.size_bytes',
      );
    });
  });

  describe('Custom MCP Request Context Attributes', () => {
    test('should export MCP request ID attribute', () => {
      expect(semconv.ATTR_MCP_REQUEST_ID).toBe('mcp.request.id');
    });

    test('should export MCP operation name attribute', () => {
      expect(semconv.ATTR_MCP_OPERATION_NAME).toBe('mcp.operation.name');
    });

    test('should export MCP tenant ID attribute', () => {
      expect(semconv.ATTR_MCP_TENANT_ID).toBe('mcp.tenant.id');
    });

    test('should export MCP client ID attribute', () => {
      expect(semconv.ATTR_MCP_CLIENT_ID).toBe('mcp.client.id');
    });

    test('should export MCP session ID attribute', () => {
      expect(semconv.ATTR_MCP_SESSION_ID).toBe('mcp.session.id');
    });
  });

  describe('Naming conventions', () => {
    test('all standard OTEL attributes should use dot notation', () => {
      const standardAttrs = [
        semconv.ATTR_SERVICE_NAME,
        semconv.ATTR_HTTP_REQUEST_METHOD,
        semconv.ATTR_CLOUD_PROVIDER,
        semconv.ATTR_ERROR_TYPE,
        semconv.ATTR_CODE_FUNCTION,
        semconv.ATTR_NETWORK_PEER_ADDRESS,
      ];

      standardAttrs.forEach((attr) => {
        expect(attr).toMatch(/^[a-z]+(\.[a-z_]+)+$/);
      });
    });

    test('all MCP custom attributes should use mcp namespace prefix', () => {
      const mcpAttrs = [
        semconv.ATTR_MCP_TOOL_NAME,
        semconv.ATTR_MCP_RESOURCE_URI,
        semconv.ATTR_MCP_REQUEST_ID,
      ];

      mcpAttrs.forEach((attr) => {
        expect(attr).toMatch(/^mcp\./);
      });
    });

    test('should not have duplicate attribute values', () => {
      const allExports = Object.entries(semconv)
        .filter(([key]) => key.startsWith('ATTR_'))
        .map(([, value]) => value);

      const uniqueValues = new Set(allExports);
      expect(allExports.length).toBe(uniqueValues.size);
    });
  });
});

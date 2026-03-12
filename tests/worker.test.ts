/**
 * @fileoverview Test suite for Cloudflare Worker entry point
 * @module tests/worker.test
 */

import { describe, expect, it } from 'vitest';
import { type CloudflareBindings, createWorkerHandler } from '@/worker.js';

describe('Cloudflare Worker Entry Point', () => {
  describe('CloudflareBindings Interface', () => {
    it('should support KV namespace binding', () => {
      const bindings: CloudflareBindings = {
        KV_NAMESPACE: {} as any,
      };
      expect(bindings.KV_NAMESPACE).toBeDefined();
    });

    it('should support R2 bucket binding', () => {
      const bindings: CloudflareBindings = {
        R2_BUCKET: {} as any,
      };
      expect(bindings.R2_BUCKET).toBeDefined();
    });

    it('should support D1 database binding', () => {
      const bindings: CloudflareBindings = {
        DB: {} as any,
      };
      expect(bindings.DB).toBeDefined();
    });

    it('should support AI binding', () => {
      const bindings: CloudflareBindings = {
        AI: {} as any,
      };
      expect(bindings.AI).toBeDefined();
    });

    it('should support environment variable bindings', () => {
      const bindings: CloudflareBindings = {
        ENVIRONMENT: 'test',
        LOG_LEVEL: 'debug',
        MCP_AUTH_SECRET_KEY: 'secret',
        STORAGE_PROVIDER_TYPE: 'cloudflare-kv',
      };
      expect(bindings.ENVIRONMENT).toBe('test');
      expect(bindings.LOG_LEVEL).toBe('debug');
      expect(bindings.MCP_AUTH_SECRET_KEY).toBe('secret');
    });

    it('should require explicit extension for additional bindings', () => {
      // CloudflareBindings no longer has an index signature.
      // Servers must declare extra bindings via TypeScript intersection/extends.
      interface ExtendedBindings extends CloudflareBindings {
        CUSTOM_BINDING: string;
      }
      const bindings: ExtendedBindings = {
        CUSTOM_BINDING: 'value',
      };
      expect(bindings.CUSTOM_BINDING).toBe('value');
    });

    it('should support all standard environment variables', () => {
      const bindings: CloudflareBindings = {
        ENVIRONMENT: 'production',
        LOG_LEVEL: 'info',
        MCP_AUTH_SECRET_KEY: 'secret',
        OPENROUTER_API_KEY: 'api-key',
        SUPABASE_URL: 'https://supabase.co',
        SUPABASE_ANON_KEY: 'anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        STORAGE_PROVIDER_TYPE: 'cloudflare-r2',
        OAUTH_ISSUER_URL: 'https://auth.example.com',
        OAUTH_AUDIENCE: 'https://api.example.com',
        OAUTH_JWKS_URI: 'https://auth.example.com/.well-known/jwks.json',
        MCP_ALLOWED_ORIGINS: 'https://app.example.com',
        SPEECH_TTS_ENABLED: 'true',
        SPEECH_TTS_API_KEY: 'tts-key',
        SPEECH_STT_ENABLED: 'true',
        SPEECH_STT_API_KEY: 'stt-key',
        OTEL_ENABLED: 'true',
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'https://otel.example.com/traces',
        OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: 'https://otel.example.com/metrics',
      };

      expect(bindings.ENVIRONMENT).toBe('production');
      expect(bindings.STORAGE_PROVIDER_TYPE).toBe('cloudflare-r2');
      expect(bindings.OTEL_ENABLED).toBe('true');
    });
  });

  describe('Worker Exports', () => {
    it('should export createWorkerHandler factory', async () => {
      const worker = await import('@/worker.js');
      expect(worker.createWorkerHandler).toBeDefined();
      expect(typeof worker.createWorkerHandler).toBe('function');
    });

    it('should export CloudflareBindings interface', () => {
      // Type-level test - if this compiles, the interface is exported
      const bindings: CloudflareBindings = {
        ENVIRONMENT: 'test',
      };
      expect(bindings).toBeDefined();
    });

    it('should return handler with fetch and scheduled', () => {
      const handler = createWorkerHandler();
      expect(typeof handler.fetch).toBe('function');
      expect(typeof handler.scheduled).toBe('function');
    });
  });

  describe('Environment Variable Structure', () => {
    it('should map ENVIRONMENT to NODE_ENV conceptually', () => {
      const env: CloudflareBindings = {
        ENVIRONMENT: 'production',
      };
      expect(env.ENVIRONMENT).toBe('production');
    });

    it('should map LOG_LEVEL to MCP_LOG_LEVEL conceptually', () => {
      const env: CloudflareBindings = {
        LOG_LEVEL: 'debug',
      };
      expect(env.LOG_LEVEL).toBe('debug');
    });

    it('should handle optional environment variables', () => {
      const env: CloudflareBindings = {};
      expect(env.ENVIRONMENT).toBeUndefined();
      expect(env.LOG_LEVEL).toBeUndefined();
    });
  });
});

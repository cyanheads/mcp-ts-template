/**
 * @fileoverview Encapsulates the registration of all resource definitions with an McpServer.
 * Supports legacy ResourceDefinition and new-style NewResourceDefinition.
 * @module src/mcp-server/resources/resource-registration
 */
import { type McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ZodObject, ZodRawShape } from 'zod';

import {
  type AnyNewResourceDefinition,
  isNewResourceDefinition,
} from '@/mcp-server/resources/utils/newResourceDefinition.js';
import {
  createNewResourceHandler,
  type ResourceHandlerFactoryServices,
} from '@/mcp-server/resources/utils/newResourceHandlerFactory.js';
import type { ResourceDefinition } from '@/mcp-server/resources/utils/resourceDefinition.js';
import { registerResource } from '@/mcp-server/resources/utils/resourceHandlerFactory.js';
import { JsonRpcErrorCode } from '@/types-global/errors.js';
import { ErrorHandler } from '@/utils/internal/error-handler/errorHandler.js';
import { logger } from '@/utils/internal/logger.js';
import { requestContextService } from '@/utils/internal/requestContext.js';

/** Union of all accepted resource definition shapes. */
export type AnyResourceDef =
  | ResourceDefinition<ZodObject<ZodRawShape>, ZodObject<ZodRawShape> | undefined>
  | AnyNewResourceDefinition;

export class ResourceRegistry {
  constructor(
    private resourceDefs: AnyResourceDef[],
    private services?: ResourceHandlerFactoryServices,
  ) {}

  /**
   * Registers all resolved resource definitions with the provided McpServer instance.
   */
  public async registerAll(server: McpServer): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: 'ResourceRegistry.registerAll',
    });

    const newResources: AnyNewResourceDefinition[] = [];
    const legacyResources: ResourceDefinition<
      ZodObject<ZodRawShape>,
      ZodObject<ZodRawShape> | undefined
    >[] = [];

    for (const def of this.resourceDefs) {
      if (isNewResourceDefinition(def)) {
        newResources.push(def);
      } else {
        legacyResources.push(
          def as ResourceDefinition<ZodObject<ZodRawShape>, ZodObject<ZodRawShape> | undefined>,
        );
      }
    }

    logger.info(
      `Registering ${newResources.length + legacyResources.length} resource(s) (${newResources.length} new-style, ${legacyResources.length} legacy)...`,
      context,
    );

    // Register new-style resources
    for (const resourceDef of newResources) {
      await this.registerNewResource(server, resourceDef);
    }

    // Register legacy resources
    for (const resourceDef of legacyResources) {
      await registerResource(server, resourceDef);
    }
  }

  /**
   * Registers a new-style resource definition (with `handler`, `params`, `auth`, etc.).
   * Requires `services` to have been passed to the constructor for Context creation.
   */
  private async registerNewResource(
    server: McpServer,
    def: AnyNewResourceDefinition,
  ): Promise<void> {
    const resourceName = def.name ?? def.uriTemplate;
    const registrationContext = requestContextService.createRequestContext({
      operation: 'ResourceRegistry.registerNewResource',
      additionalContext: { resourceName },
    });

    logger.debug(`Registering resource (new-style): '${resourceName}'`, registrationContext);

    await ErrorHandler.tryCatch(
      () => {
        if (!this.services) {
          throw new Error(
            `Cannot register new-style resource '${resourceName}': ResourceHandlerFactoryServices not provided to ResourceRegistry`,
          );
        }

        const template = new ResourceTemplate(def.uriTemplate, {
          list: def.list,
        });

        const handler = createNewResourceHandler(def, this.services);
        const title = def.title ?? resourceName;
        const mimeType = def.mimeType ?? 'application/json';

        server.resource(
          resourceName,
          template,
          {
            title,
            description: def.description,
            mimeType,
            ...(def.examples && { examples: def.examples }),
            ...(def.annotations && { annotations: def.annotations }),
          },
          handler,
        );

        logger.notice(`Resource '${resourceName}' registered successfully.`, registrationContext);
      },
      {
        operation: `RegisteringResource_${resourceName}`,
        context: registrationContext,
        errorCode: JsonRpcErrorCode.InitializationFailed,
        critical: true,
      },
    );
  }
}

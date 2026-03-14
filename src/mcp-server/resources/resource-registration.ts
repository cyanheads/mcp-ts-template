/**
 * @fileoverview Encapsulates the registration of all resource definitions with an McpServer.
 * @module src/mcp-server/resources/resource-registration
 */
import { type McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { AnyResourceDefinition } from '@/mcp-server/resources/utils/resourceDefinition.js';
import {
  createResourceHandler,
  type ResourceHandlerFactoryServices,
} from '@/mcp-server/resources/utils/resourceHandlerFactory.js';
import { JsonRpcErrorCode } from '@/types-global/errors.js';
import { ErrorHandler } from '@/utils/internal/error-handler/errorHandler.js';
import { logger } from '@/utils/internal/logger.js';
import { requestContextService } from '@/utils/internal/requestContext.js';

export class ResourceRegistry {
  constructor(
    private resourceDefs: AnyResourceDefinition[],
    private services: ResourceHandlerFactoryServices,
  ) {}

  /**
   * Registers all resolved resource definitions with the provided McpServer instance.
   */
  public async registerAll(server: McpServer): Promise<void> {
    const context = requestContextService.createRequestContext({
      operation: 'ResourceRegistry.registerAll',
    });

    logger.info(`Registering ${this.resourceDefs.length} resource(s)...`, context);

    for (const resourceDef of this.resourceDefs) {
      await this.registerResource(server, resourceDef);
    }
  }

  private async registerResource(server: McpServer, def: AnyResourceDefinition): Promise<void> {
    const resourceName = def.name ?? def.uriTemplate;
    const registrationContext = requestContextService.createRequestContext({
      operation: 'ResourceRegistry.registerResource',
      additionalContext: { resourceName },
    });

    logger.debug(`Registering resource: '${resourceName}'`, registrationContext);

    await ErrorHandler.tryCatch(
      () => {
        const template = new ResourceTemplate(def.uriTemplate, {
          list: def.list,
        });

        const handler = createResourceHandler(def, this.services);
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

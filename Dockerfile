########################
# Build Stage (Bun)
########################
FROM oven/bun:1 AS build

WORKDIR /usr/src/app

# Copy dependency manifests first for better layer caching
COPY package.json bun.lock* ./

# Install dependencies with a frozen lockfile for reproducible builds
RUN bun install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Compile TypeScript to JavaScript
RUN bun run build

########################
# Production Stage (Bun)
########################
FROM oven/bun:1 AS production

WORKDIR /usr/src/app

# Set the environment to production for optimized performance.
ENV NODE_ENV=production

# Create a non-root user and group for enhanced security.
RUN addgroup --system appgroup \
  && adduser --system --ingroup appgroup appuser

# Create and set permissions for the log directory.
RUN mkdir -p /var/log/mcp-ts-template \
  && chown -R appuser:appgroup /var/log/mcp-ts-template

# Copy build artifacts and production dependencies from the build stage.
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/package.json ./

# Switch to the non-root user.
USER appuser

# Expose the port the server will listen on.
ENV MCP_HTTP_PORT=${PORT:-3017}
EXPOSE ${MCP_HTTP_PORT}

# Set runtime environment variables.
ENV MCP_HTTP_HOST=0.0.0.0
ENV MCP_TRANSPORT_TYPE=http
ENV MCP_SESSION_MODE=stateless
ENV MCP_LOG_LEVEL=info
ENV LOGS_DIR=/var/log/mcp-ts-template
ENV MCP_AUTH_MODE=none
ENV MCP_FORCE_CONSOLE_LOGGING=true

# Start the server with Bun runtime
CMD ["bun", "dist/index.js"]

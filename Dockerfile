# ==============================================================================
# Build Stage
#
# This stage installs all dependencies (including dev), builds the TypeScript
# source code into JavaScript, and prepares the production assets.
# ==============================================================================
FROM oven/bun:1 AS build

WORKDIR /usr/src/app

# Copy dependency manifests for optimized layer caching
COPY package.json bun.lock ./

# Install all dependencies (including dev dependencies for building)
RUN bun install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Build the application
RUN bun run build


# ==============================================================================
# Production Stage
#
# This stage creates a minimal, optimized, and secure image for running the
# application. It uses a slim base image and only includes production
# dependencies and build artifacts.
# ==============================================================================
FROM oven/bun:1-slim AS production

WORKDIR /usr/src/app

# Set the environment to production for performance and to ensure only
# production dependencies are installed.
ENV NODE_ENV=production

# OCI image metadata (https://github.com/opencontainers/image-spec/blob/main/annotations.md)
LABEL org.opencontainers.image.title="mcp-ts-template"
LABEL org.opencontainers.image.description="TypeScript template for MCP servers with declarative tools/resources, pluggable auth, multi-backend storage, OpenTelemetry observability, and Cloudflare Workers support."
LABEL org.opencontainers.image.source="https://github.com/cyanheads/mcp-ts-template"
LABEL org.opencontainers.image.licenses="Apache-2.0"
LABEL io.modelcontextprotocol.server.name="io.github.cyanheads/mcp-ts-template"

# Copy dependency manifests
COPY package.json bun.lock ./

# Install only production dependencies, ignoring any lifecycle scripts (like 'prepare')
# that are not needed in the final production image.
RUN bun install --production --frozen-lockfile --ignore-scripts

# Copy the compiled application code from the build stage
COPY --from=build /usr/src/app/dist ./dist

# The 'oven/bun' image already provides a non-root user named 'bun'.
# We will use this existing user for enhanced security.

# Create and set permissions for the log directory, assigning ownership to the 'bun' user.
RUN mkdir -p /var/log/mcp-ts-template && chown -R bun:bun /var/log/mcp-ts-template

# Switch to the non-root user
USER bun

# Define an argument for the port, allowing it to be overridden at build time.
# The `PORT` variable is often injected by cloud environments at runtime.
ARG PORT

# Set runtime environment variables
# Note: PORT is an automatic variable in many cloud environments (e.g., Cloud Run)
ENV MCP_HTTP_PORT=${PORT:-3010}
ENV MCP_HTTP_HOST="0.0.0.0"
ENV MCP_TRANSPORT_TYPE="http"
ENV MCP_SESSION_MODE="stateless"
ENV MCP_LOG_LEVEL="info"
ENV LOGS_DIR="/var/log/mcp-ts-template"
ENV MCP_FORCE_CONSOLE_LOGGING="true"

# Expose the port the server listens on
EXPOSE ${MCP_HTTP_PORT}

# The command to start the server
CMD ["bun", "run", "dist/index.js"]

# ---- Base Node ----
# Use a specific Node.js version known to work, Alpine for smaller size
FROM node:23-alpine AS base
WORKDIR /usr/src/app
ENV NODE_ENV=production

# ---- Dependencies ----
# Install dependencies first to leverage Docker cache
FROM base AS deps
WORKDIR /usr/src/app
COPY package.json package-lock.json* ./
# Use npm ci for deterministic installs based on lock file
# Install only production dependencies in this stage for the final image
RUN npm ci --only=production

# ---- Builder ----
# Build the application
FROM base AS builder
WORKDIR /usr/src/app
# Copy dependency manifests and install *all* dependencies (including dev)
COPY package.json package-lock.json* ./
RUN npm ci
# Copy the rest of the source code
COPY . .
# Build the TypeScript project
RUN npm run build

# ---- Runner ----
# Final stage with only production dependencies and built code
FROM base AS runner
WORKDIR /usr/src/app
# Copy production node_modules from the 'deps' stage
COPY --from=deps /usr/src/app/node_modules ./node_modules
# Copy built application from the 'builder' stage
COPY --from=builder /usr/src/app/dist ./dist
# Copy package.json (needed for potential runtime info, like version)
COPY package.json .

# Create a non-root user and switch to it
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expose port if the application runs a server (adjust if needed)
ENV MCP_TRANSPORT_TYPE=http
EXPOSE 3010

# Command to run the application
# This will execute the binary defined in package.json
CMD ["npx", "mcp-ts-template"]

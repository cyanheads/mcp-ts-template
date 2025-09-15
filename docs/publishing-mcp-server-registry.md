# How to Publish Your MCP Server

This guide provides step-by-step instructions on how to publish your MCP server, based on the `mcp-ts-template`, to the official MCP registry.

The recommended method is to use the all-in-one `publish-mcp` script included in this template. It automates the entire workflow, from version synchronization and validation to committing and publishing.

## Prerequisites

- **MCP Publisher CLI**: You need the `mcp-publisher` command-line tool. If you don't have it, install it using one of the methods from the [official publishing guide](https://github.com/modelcontextprotocol/registry/blob/main/docs/guides/publishing/publish-server.md#step-1-install-the-publisher-cli). (i.e. `brew install mcp-publisher`)
- **[Bun](https://bun.sh/)**: Ensure you have Bun v1.2.0 or higher installed. The script uses Bun to execute.
- **GitHub Account**: Publishing to an `io.github.*` namespace requires you to authenticate with a corresponding GitHub account. The script will guide you through this.

## The Recommended Method: The All-in-One `publish-mcp` Script

This is the easiest and most reliable way to publish your server.

### Step 1: Run the Script

From the root of the project, simply run:

```bash
bun run publish-mcp
```

The script will handle all the necessary steps, including prompting you to log in with GitHub via your browser.

### What the Script Does Automatically

1.  **Syncs Metadata**: Reads `package.json` and updates the `version` and `mcpName` fields in `server.json` (and applies the version to all entries in `packages`).
2.  **Validates Schema**: Validates the updated `server.json` against the official MCP server schema.
3.  **Auto-Commits**: Creates a `git commit` for the `server.json` version bump.
4.  **Handles Authentication**: Kicks off the `mcp-publisher login github` command and waits for you to complete it.
5.  **Publishes**: Runs `mcp-publisher publish` to finalize the process.

### Advanced Control with Flags

You can customize the script's behavior with flags:

- `--validate-only`: Syncs and validates, then stops. Perfect for a pre-flight check.
- `--no-commit`: Skips the automatic Git commit step.
- `--publish-only`: Skips local file changes and proceeds directly to login and publish.
- `--sync-only`: Only syncs versions from `package.json` to `server.json`, then stops.

---

## Manual Fallback Workflow

If you need to perform each step manually, or wish to understand the process under the hood, you can follow these steps.

### Step 1: Review and Align Configuration

Before publishing, it's crucial to ensure that your server's configuration is consistent across the project. This prevents validation errors and ensures clients receive the correct metadata.

Review the following files:

1.  **`package.json`**:
    - Verify that the `version` matches the intended release version.
    - Update the `name` of your package if you have renamed it.
    - Update the `mcpName` field to reflect your desired server name (e.g., `io.github.your-username/your-server-name`). This name must be unique in the registry.

2.  **`server.json`**:
    - Update the `name` to match the `mcpName` in your `package.json`.
    - Ensure the `version` matches the one in `package.json`.
    - Check that the `packages.identifier` field matches the `name` in your `package.json`.
    - Verify that the `packages.version` also matches the version in `package.json`.
    - Add a `website_url` pointing to your project homepage or README (recommended for discoverability).
    - Consider adding `repository.id` (e.g., GitHub repo ID) for registry safety. You can obtain it with: `gh api repos/<owner>/<repo> --jq '.id'`.
    - Prefer HTTP transport URL templating so clients can override host/port/path without editing JSON, for example:
      ```json
      {
        "type": "streamable-http",
        "url": "http://{MCP_HTTP_HOST}:{MCP_HTTP_PORT}{MCP_HTTP_ENDPOINT_PATH}"
      }
      ```
      Provide corresponding entries in `packages[].environment_variables` such as `MCP_HTTP_HOST`, `MCP_HTTP_PORT`, and `MCP_HTTP_ENDPOINT_PATH` with sensible defaults.

3.  **`src/config/index.ts`**:
    - Look for any default values that might affect the server's runtime behavior, such as `mcpHttpPort`. The default HTTP port is currently `3010`. If you've configured a different port via environment variables for your deployment, ensure your `server.json` reflects that.

### Environment Variable Precedence (Important)

Depending on how you start the server, environment variables set in `package.json` scripts can override values provided via `server.json`'s `environment_variables`. For example, this template sets `MCP_LOG_LEVEL=debug` in `start:*` scripts. If you want `server.json` to be the source of truth for those values, remove or adjust the hardcoded env vars in scripts, or invoke the runtime directly (e.g., `bun ./dist/index.js`) and allow client-provided values to take effect.

## Step 2: Validate the `server.json` Schema

This project includes a script to validate your `server.json` against the official MCP schema. This helps catch errors before you attempt to publish.

Run the validation using the all-in-one script with the `--validate-only` flag:

```bash
bun run publish-mcp --validate-only
```

This command will first sync the versions from `package.json` and then validate the resulting `server.json`.

### Step 3: Authenticate with the MCP Registry

Since the server name follows the `io.github.*` namespace, you must authenticate using GitHub. If you chose a different namespace (e.g., a custom domain), follow the appropriate authentication method outlined in the [official documentation](https://github.com/modelcontextprotocol/registry/blob/main/docs/guides/publishing/publish-server.md#step-4-authenticate).

Run the following command:

```bash
mcp-publisher login github
```

This will open a browser window, prompting you to authorize the MCP Publisher application with your GitHub account. Follow the on-screen instructions to complete the login process.

## Step 4: Publish the Server

Once you've aligned your configurations, validated the schema, and authenticated your session, you are ready to publish.

From the root directory of the project, execute the publish command:

```bash
mcp-publisher publish
```

The publisher CLI will read your `server.json`, perform server-side validation against the package registry (NPM, in this case), and, if successful, add your server entry to the MCP registry.

You should see a confirmation upon success:

```
✓ Successfully published
```

## Step 5: Verify the Publication

After publishing, you can verify that your server is listed in the registry by making a simple API request. Replace the placeholder with your server's name.

```bash
# Replace with your server name
curl "https://registry.modelcontextprotocol.io/v0/servers?search=io.github.your-username/your-server-name"
```

For example, this template server is located at:

```bash
curl "https://registry.modelcontextprotocol.io/v0/servers?search=io.github.cyanheads/mcp-ts-template"
```

The response should be a JSON object containing the metadata for your newly published or updated server.

---

## Automated Publishing with CI/CD

For a more robust workflow, consider automating this process using GitHub Actions. This ensures that every new release is automatically published without manual intervention. You can find a guide on setting this up here: [Automate publishing with GitHub Actions](https://github.com/modelcontextprotocol/registry/blob/main/docs/guides/publishing/github-actions.md).

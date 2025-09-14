# How to Publish Your MCP Server

This guide provides step-by-step instructions on how to publish your MCP server, based on the `mcp-ts-template`, to the official MCP registry.

## Prerequisites

1.  **MCP Publisher CLI**: You need the `mcp-publisher` command-line tool. If you don't have it, install it using one of the methods from the [official publishing guide](https://github.com/modelcontextprotocol/registry/blob/main/docs/guides/publishing/publish-server.md#step-1-install-the-publisher-cli). (i.e. `brew install mcp-publisher`)

2.  **GitHub Account**: Publishing to an `io.github.*` namespace requires you to authenticate with a corresponding GitHub account. Ensure you are logged into the correct account before proceeding. (`mcp-publisher login github`)

## Step 1: Review and Align Configuration

Before publishing, it's crucial to ensure that your server's configuration is consistent across the project. This prevents validation errors and ensures clients receive the correct metadata.

Review the following files:

1.  **`package.json`**:
    *   Verify that the `version` matches the intended release version.
    *   Update the `name` of your package if you have renamed it.
    *   Update the `mcpName` field to reflect your desired server name (e.g., `io.github.your-username/your-server-name`). This name must be unique in the registry.

2.  **`server.json`**:
    *   Update the `name` to match the `mcpName` in your `package.json`.
    *   Ensure the `version` matches the one in `package.json`.
    *   Check that the `packages.identifier` field matches the `name` in your `package.json`.
    *   Verify that the `packages.version` also matches the version in `package.json`.

3.  **`src/config/index.ts`**:
    *   Look for any default values that might affect the server's runtime behavior, such as `mcpHttpPort`. The default HTTP port is currently `3010`. If you've configured a different port via environment variables for your deployment, ensure your `server.json` reflects that.

## Step 2: Validate the `server.json` Schema

This project includes a script to validate your `server.json` against the official MCP schema. This helps catch errors before you attempt to publish.

Run the validation script from the project root:

```bash
bun run scripts/validate-mcp-publish-schema.ts
```

If the script runs successfully, you'll see a confirmation message:
`✅ server.json is valid!`

If you see errors, address the issues reported in the output before proceeding.

## Step 3: Authenticate with the MCP Registry

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

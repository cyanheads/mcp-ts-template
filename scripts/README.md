# 🛠️ Project Scripts

This directory contains various utility scripts to assist in development. For a high-level overview of the entire project, please see the [root README.md](../README.md).

Each script is crafted to be run from the command line and provides specific functionalities as detailed below.

## 📜 Available Scripts

Here's a summary of the available scripts:

| Script File             | Purpose Summary                                                                       | Key Usage Example(s)                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `clean.ts`              | Cleans build artifacts and temporary directories (e.g., `dist`, `logs` by default).   | `npm run rebuild` (cleans then builds) <br> `ts-node --esm scripts/clean.ts [custom_dirs...]` (direct/custom clean) |
| `fetch-openapi-spec.ts` | Fetches an OpenAPI specification from a URL and saves it locally as YAML & JSON.      | `npm run fetch-spec -- <url> <output_base_path>` <br> `npm run fetch-spec -- --help`                                |
| `make-executable.ts`    | Makes specified files executable (`chmod +x`) on Unix-like systems. No-op on Windows. | Part of `npm run build` <br> `ts-node --esm scripts/make-executable.ts [files...]` (direct/custom)                  |
| `tree.ts`               | Generates a visual tree of the project's directory structure as a markdown file.      | `npm run tree` <br> `npm run tree -- [output.md] --depth=N`                                                         |

Below are more detailed descriptions for each script.

---

### 🧹 `clean.ts`

**Purpose:**
This script is used to clean build artifacts and temporary directories. By default, it removes the `dist` and `logs` directories. You can also specify custom directories to clean as command-line arguments. It is designed to work across all platforms by using Node.js path normalization.

**Usage:**

To clean default directories (`dist`, `logs`) as part of a full rebuild:

```bash
npm run rebuild
```

To clean default directories (`dist`, `logs`) directly:

```bash
ts-node --esm scripts/clean.ts
```

(Or, if you add a dedicated `clean` script to `package.json`: `npm run clean`)

To clean custom directories (e.g., `temp`, `coverage`) directly:

```bash
ts-node --esm scripts/clean.ts temp coverage
```

**Package.json Integration:**
This script is used as part of the `rebuild` script in `package.json`:

```json
"scripts": {
  "rebuild": "ts-node --esm scripts/clean.ts && npm run build"
}
```

You can also add a dedicated `clean` script if desired:

```json
"scripts": {
  "clean": "ts-node --esm scripts/clean.ts"
}
```

---

### 📥 `fetch-openapi-spec.ts`

**Purpose:**
This script fetches an OpenAPI specification (in YAML or JSON format) from a given URL. It then parses the specification and saves it locally in both YAML and JSON formats. The script includes fallback logic to try common OpenAPI file names like `openapi.yaml` or `openapi.json` if a direct file URL isn't provided. It also ensures that output paths are securely within the project directory.

**Usage:**

You can run this script via the `npm run fetch-spec` command defined in `package.json`.
The script requires a URL (base or direct to spec file) and an output base path (relative to the project root).

**Example 1: Fetching from a base URL and saving:**

```bash
npm run fetch-spec -- https://api.example.com/v1 docs/api/my_api
# Note: Use '--' to pass arguments to the script when using npm run
```

**Example 2: Fetching from a direct file URL:**
This will attempt to fetch from `https://petstore3.swagger.io/api/v3/openapi.json` and save the spec to `docs/api/petstore_v3.yaml` and `docs/api/petstore_v3.json`.

```bash
npm run fetch-spec -- https://petstore3.swagger.io/api/v3/openapi.json docs/api/petstore_v3
```

**Help:**
For more details, run:

```bash
npm run fetch-spec -- --help
```

---

### ⚙️ `make-executable.ts`

**Purpose:**
This utility script makes specified files executable (i.e., applies `chmod +x`) on Unix-like systems. On Windows, the script performs no action but exits successfully. This is particularly useful for CLI applications where the built output (e.g., a JavaScript file) needs executable permissions to be run directly.

**Usage:**

This script is typically run as part of the build process:

```bash
npm run build
```

The `build` script in `package.json` calls `make-executable.ts` for `dist/index.js` after `tsc` compilation.

For direct or custom use (e.g., making other files executable):
By default, if no arguments are provided, it targets `dist/index.js`.

```bash
ts-node --esm scripts/make-executable.ts
```

To specify custom files:

```bash
ts-node --esm scripts/make-executable.ts path/to/script1 path/to/script2
```

**Package.json Integration:**
It is integrated into the `build` script in `package.json`:

```json
"scripts": {
  "build": "tsc && node --loader ts-node/esm scripts/make-executable.ts dist/index.js"
  // other scripts
}
```

The script ensures that all target paths are within the project directory for security.

---

### 🌳 `tree.ts`

**Purpose:**
This script generates a visual tree representation of the project's directory structure. It respects `.gitignore` patterns and includes common exclusions (like `node_modules`, `.git`, `dist`, etc.) by default. The generated tree is saved to a markdown file.

**Usage:**

To generate the tree with default settings (output to `docs/tree.md`, unlimited depth):

```bash
npm run tree
```

To specify a custom output path and/or limit the depth:

```bash
npm run tree -- ./documentation/structure.md --depth=3
# Note: Use '--' to pass arguments to the script when using npm run
```

**Options:**
(When using `npm run tree -- <options>` or `ts-node --esm scripts/tree.ts <options>`)

- `[output-path]`: Custom file path for the tree output (relative to project root). Default: `docs/tree.md`.
- `--depth=<number>`: Maximum directory depth to display. Default: unlimited.
- `--help`: Show help message.

The script ensures that all file operations are performed securely within the project root. It also checks if the tree structure has changed before overwriting the output file to avoid unnecessary updates.

---

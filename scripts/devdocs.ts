import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const log = (message: string) => console.log(`[devdocs] ${message}`);

const main = () => {
  const filePaths = process.argv.slice(2);
  if (filePaths.length === 0) {
    log("Error: Please provide at least one file path for repomix.");
    process.exit(1);
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const rootDir = path.join(__dirname, "..");
  const treeScriptPath = path.join(rootDir, "scripts", "tree.ts");
  const treeDocPath = path.join(rootDir, "docs", "tree.md");
  const devDocsPath = path.join(rootDir, "docs", "devdocs.md");

  try {
    // 1. Run tree script
    log("Generating file tree...");
    execSync(`npx tsx ${treeScriptPath}`, { stdio: "inherit" });
    log("File tree generated at docs/tree.md");

    // 2. Run repomix on all provided file paths
    let allRepomixOutputs = "";
    for (const filePath of filePaths) {
      log(`Running repomix on ${filePath}...`);
      execSync(`npx repomix ${filePath}`, { stdio: "inherit" });
      log("Repomix analysis complete.");

      const repomixOutputPath = path.join(rootDir, "repomix-output.xml");
      if (fs.existsSync(repomixOutputPath)) {
        const repomixOutput = fs.readFileSync(repomixOutputPath, "utf-8");
        allRepomixOutputs += repomixOutput + "\n\n---\n\n";
        fs.unlinkSync(repomixOutputPath); // Clean up the xml file
      } else {
        log(`Warning: repomix-output.xml not found for ${filePath}. Skipping.`);
      }
    }

    // 3. Create devdocs.md
    log("Creating devdocs.md...");
    const treeContent = fs.readFileSync(treeDocPath, "utf-8");
    const staticContent = `
Review this code base file by file , line by line, to fully understand the code base - identify all features, functions, utilities, etc.
Identify any issues, gaps, inconsistencies, etc. 
Additionally identify potential enhancements, including architectural changes, refactoring, etc.
Skip adding unit/integration tests - that is handled externally.
Identify the modern, best approach for what we're trying to accomplish; prefer using the latest stable versions of libraries and frameworks.
After you have properly reviewed the code base and mapped out the necessary changes, write out a detailed plan for my developer on exactly what to change in our current code base.
`;
    const devdocsContent = `${staticContent.trim()}\n\n# Full project repository tree\n\n${treeContent}\n\n---\n\n# Let's focus on the following section of our code base.\n\n${allRepomixOutputs.trim()}`;
    fs.writeFileSync(devDocsPath, devdocsContent);
    log(`devdocs.md created at ${devDocsPath}`);

    // 4. Copy to clipboard
    log("Copying contents to clipboard...");
    let copyCommand: string;
    if (process.platform === "darwin") {
      copyCommand = `pbcopy < ${devDocsPath}`;
    } else if (process.platform === "win32") {
      copyCommand = `clip < ${devDocsPath}`;
    } else {
      copyCommand = `xclip -selection clipboard < ${devDocsPath}`;
    }
    execSync(copyCommand);
    log("devdocs.md content copied to clipboard.");
  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1);
  }
};

main();

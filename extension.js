const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

// get dependencies from package.json
class DependencyCache {
  constructor() {
    this.dependenciesCache = null;
    this.isWatcherSet = false;
  }

  getDependenciesFromPackageJson() {
    if (this.dependenciesCache !== null) {
      return this.dependenciesCache;
    }

    let workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders) {
      let rootPath = workspaceFolders[0].uri.fsPath;
      let packageJsonPath = path.join(rootPath, "package.json");

      try {
        if (fs.existsSync(packageJsonPath)) {
          // Use fs.readFileSync and JSON.parse instead of require
          let packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
          this.dependenciesCache = packageJson.dependencies ? Object.keys(packageJson.dependencies) : [];
        }

        if (!this.isWatcherSet) {
          fs.watchFile(packageJsonPath, (curr, prev) => {
            // Read the updated package.json using fs.readFileSync
            const updatedPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

            // Create a new dependencies array
            const newDependencies = updatedPackageJson.dependencies ? Object.keys(updatedPackageJson.dependencies) : [];

            // Compare the new dependencies with the cached ones
            if (JSON.stringify(newDependencies) !== JSON.stringify(this.dependenciesCache)) {
              this.dependenciesCache = newDependencies;
            }
          });
          this.isWatcherSet = true;
        }
      } catch (err) {
        console.error(`An error occurred while reading package.json`);
      }
    }
    return this.dependenciesCache;
  }
}

const dependencyCache = new DependencyCache();

const importMatchRegex = /import {(.*?)} from ['"](.*?)['"]/g;
const returnMatchRegex = /return\s*\(([\s\S]*?)\)\s*;/;

//find return in file
function extractImportedItemsFromContent(content, dependencies) {
  let importedItems = [];
  let match;
  while ((match = importMatchRegex.exec(content)) !== null) {
    if (match[1]) {
      match[1].split(",").forEach((item) => {
        item = item.trim();
        if (dependencies.includes(match[2])) {
          importedItems.push(item);
        }
      });
    }
  }
  return importedItems;
}

function findRangesImport(content, importedItems) {
  const ranges = [];
  const importedItemsSet = new Set(importedItems);

  // Break the content into lines.
  const lines = content.split("\n");

  lines.forEach((line, i) => {
    const trimmedLine = line.trim();

    // Check if the line starts with "import".
    if (trimmedLine.startsWith("import")) {
      const openBraceIndex = trimmedLine.indexOf("{");
      const closeBraceIndex = trimmedLine.indexOf("}");

      // If we found an open brace and a close brace, tokenize the content between them.
      if (openBraceIndex !== -1 && closeBraceIndex !== -1) {
        const tokens = trimmedLine
          .substring(openBraceIndex + 1, closeBraceIndex)
          .split(",")
          .map((token) => token.trim());

        tokens
          .filter((token) => importedItemsSet.has(token))
          .forEach((token) => {
            const tokenStart = line.indexOf(token);
            const tokenEnd = tokenStart + token.length;

            // Convert the line,column to a position in the document.
            const startPos = new vscode.Position(i, tokenStart);
            const endPos = new vscode.Position(i, tokenEnd);

            ranges.push(new vscode.Range(startPos, endPos));
          });
      }
    }
  });

  return ranges;
}

function findRangeReturn(content, importedItems, document) {
  const ranges = [];
  const returnStartPosInDocument = document.getText().indexOf(content);

  if (returnStartPosInDocument === -1) return ranges;

  importedItems.forEach((item) => {
    const openingTag = `<${item}`;
    const selfClosingTag = `/>`;
    const closingTag = `</${item}>`;

    let start = 0;

    while ((start = content.indexOf(openingTag, start)) !== -1) {
      const endOfOpeningTag = content.indexOf(">", start);
      if (endOfOpeningTag === -1) break;

      const isSelfClosing = content.substring(endOfOpeningTag - 1, endOfOpeningTag + 1) === selfClosingTag;
      const startPos = document.positionAt(returnStartPosInDocument + start + (isSelfClosing ? 0 : 1));
      const endPos = document.positionAt(
        returnStartPosInDocument + (isSelfClosing ? endOfOpeningTag : start + openingTag.length)
      );

      ranges.push(new vscode.Range(startPos, endPos));

      if (!isSelfClosing) {
        const closeStart = content.indexOf(closingTag, endOfOpeningTag);
        if (closeStart !== -1) {
          const startPos = document.positionAt(returnStartPosInDocument + closeStart + 2);
          const endPos = document.positionAt(returnStartPosInDocument + closeStart + closingTag.length - 1);
          ranges.push(new vscode.Range(startPos, endPos));
        }
      }

      start = endOfOpeningTag;
    }
  });

  return ranges;
}

function extractReturnContent(fileContent) {
  const match = returnMatchRegex.exec(fileContent);
  if (match && match[1]) {
    return match[1];
  }
  return "";
}

function checkImportsInFiles(dependencies) {
  let activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) {
    return;
  }

  let document = activeEditor.document;
  let content = document.getText();

  let highlightDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(220,220,220,.35)",
    isWholeLine: false,
  });

  let importedItems = extractImportedItemsFromContent(content, dependencies);
  let combinedRanges = [];

  combinedRanges = findAndHighlightAllRanges(content, importedItems, document);

  if (combinedRanges.length > 0) {
    activeEditor.setDecorations(highlightDecorationType, combinedRanges);
  }
}

function findAndHighlightAllRanges(content, importedItems, document) {
  const ranges = [];

  // First find ranges in the 'return' content
  let returnContent = extractReturnContent(content);
  const returnRanges = findRangeReturn(returnContent, importedItems, document);
  ranges.push(...returnRanges);

  // Then find ranges in the 'import' statements
  const importRanges = findRangesImport(content, importedItems);
  ranges.push(...importRanges);

  return ranges;
}

//when opening a new file
vscode.window.onDidChangeActiveTextEditor(() => {
  const dependencies = dependencyCache.getDependenciesFromPackageJson();
  checkImportsInFiles(dependencies);
});

function activate(context) {
  let dependencies = dependencyCache.getDependenciesFromPackageJson();
  checkImportsInFiles(dependencies);

  let disposable = vscode.commands.registerCommand("liblinkerjs.checkImports", () => {
    dependencies = dependencyCache.getDependenciesFromPackageJson();
    checkImportsInFiles(dependencies);
  });

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = { activate, deactivate };

const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

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
          let packageJson = require(packageJsonPath);
          this.dependenciesCache = packageJson.dependencies ? Object.keys(packageJson.dependencies) : [];
        }

        if (!this.isWatcherSet) {
          fs.watchFile(packageJsonPath, (curr, prev) => {
            // Invalidate the cache and directly populate it again
            this.dependenciesCache = null;
            let updatedPackageJson = require(packageJsonPath);
            this.dependenciesCache = updatedPackageJson.dependencies
              ? Object.keys(updatedPackageJson.dependencies)
              : [];
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

//find return in file
function extractImportedItemsFromContent(content, dependencies) {
  let importedItems = [];
  let importMatches = content.match(/import {(.*?)} from ['"](.*?)['"]/g);

  if (importMatches) {
    importMatches.forEach((match) => {
      let importMatch = /import {(.*?)} from ['"](.*?)['"]/.exec(match);
      if (importMatch && importMatch[1]) {
        importMatch[1].split(",").map((item) => {
          item = item.trim();
          if (dependencies.includes(importMatch[2])) {
            importedItems.push(item);
          }
        });
      }
    });
  }
  return importedItems;
}

function findRangesOfDirectImportedItems(content, importedItems) {
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

function findRangesOfImportedItemsInContent(content, importedItems, document) {
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
  const returnMatch = fileContent.match(/return\s*\(([\s\S]*?)\)\s*;/);
  if (returnMatch && returnMatch[1]) {
    return returnMatch[1];
  }
  return "";
}

function checkImportsInFiles(dependencies) {
  let activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) {
    return; // Exit if there's no active editor
  }

  let document = activeEditor.document;
  let content = document.getText();

  let highlightDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(220,220,220,.35)",
    isWholeLine: false,
  });

  // Extract return content and imported items
  let returnContent = extractReturnContent(content);
  let importedItems = extractImportedItemsFromContent(content, dependencies);

  // Find ranges for highlighting the imported items and return content
  let returnRanges = findRangesOfImportedItemsInContent(returnContent, importedItems, document);
  let importRanges = findRangesOfDirectImportedItems(content, importedItems);

  // Combine both ranges and set decorations
  const combinedRanges = [...returnRanges, ...importRanges];

  if (combinedRanges.length > 0) {
    activeEditor.setDecorations(highlightDecorationType, combinedRanges);
  }
}

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

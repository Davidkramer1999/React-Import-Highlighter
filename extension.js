const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

// get dependencies from package.json
class DependencyCache {
  dependenciesCache = null;
  isWatcherSet = false;

  getDependenciesFromPackageJson = () => {
    const { workspaceFolders } = vscode.workspace;
    const rootPath = workspaceFolders?.[0]?.uri.fsPath;

    if (!rootPath) {
      return this.dependenciesCache;
    }

    const packageJsonPath = path.join(rootPath, "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      return this.dependenciesCache;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    this.dependenciesCache = packageJson.dependencies ? Object.keys(packageJson.dependencies) : [];

    if (!this.isWatcherSet) {
      fs.watchFile(packageJsonPath, () => {
        const updatedPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
        const newDependencies = Object.keys(updatedPackageJson.dependencies ?? {});
        if (JSON.stringify(newDependencies) !== JSON.stringify(this.dependenciesCache)) {
          this.dependenciesCache = newDependencies;
        }
      });
      this.isWatcherSet = true;
    }
    return this.dependenciesCache;
  };
}
const dependencyCache = new DependencyCache();

function findAndHighlightImports(content, dependencies) {
  const importedItems = [];
  const importRanges = [];

  const lines = content.split("\n");

  lines.forEach((line, i) => {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("import")) {
      const fromIndex = trimmedLine.indexOf("from");
      if (fromIndex === -1) return;

      const dep = trimmedLine
        .slice(fromIndex + 5)
        .replace(/['"`;]/g, "")
        .trim();

      if (dependencies.includes(dep)) {
        const openBraceIndex = trimmedLine.indexOf("{");
        const closeBraceIndex = trimmedLine.indexOf("}");

        if (openBraceIndex !== -1 && closeBraceIndex !== -1) {
          const items = trimmedLine.slice(openBraceIndex + 1, closeBraceIndex).split(",");

          items.forEach((item) => {
            const trimmedItem = item.trim();
            importedItems.push(trimmedItem);

            const itemStart = line.indexOf(trimmedItem);
            const itemEnd = itemStart + trimmedItem.length;

            const startPos = new vscode.Position(i, itemStart);
            const endPos = new vscode.Position(i, itemEnd);

            importRanges.push(new vscode.Range(startPos, endPos));
          });
        }
      }
    }
  });

  return { importRanges, importedItems };
}

function findAndHighlightReturn(content, dependencies) {
  const usedItems = [];
  const returnRanges = [];
  let startIndex = 0;

  while (true) {
    const returnStartIndex = content.indexOf("return", startIndex);

    if (returnStartIndex === -1) break;

    let remainingContent = content.slice(returnStartIndex + 6); // Skip 'return'
    let lineIndex = content.substr(0, returnStartIndex).split("\n").length - 1;

    dependencies.forEach((item) => {
      const openingTag = `<${item}`;
      const selfClosingTag = `/>`;
      const closingTag = `</${item}>`;

      let start = 0;

      while ((start = remainingContent.indexOf(openingTag, start)) !== -1) {
        const endOfOpeningTag = remainingContent.indexOf(">", start);
        if (endOfOpeningTag === -1) break;

        const isSelfClosing = remainingContent.substring(endOfOpeningTag - 1, endOfOpeningTag + 1) === selfClosingTag;

        lineIndex += remainingContent.substr(0, start).split("\n").length - 1;

        let lineContent = content.split("\n")[lineIndex];
        let lineOffset = lineContent.indexOf(openingTag) + 1; // +1 to skip the '<'

        let startPos = new vscode.Position(lineIndex, lineOffset);
        let endPos = new vscode.Position(lineIndex, lineOffset + openingTag.length - 1); // -1 to also skip the '<'

        returnRanges.push(new vscode.Range(startPos, endPos));
        usedItems.push(item); // Record the used item

        if (!isSelfClosing) {
          const closeStart = remainingContent.indexOf(closingTag, endOfOpeningTag);
          if (closeStart !== -1) {
            lineOffset = lineContent.indexOf(closingTag);
            startPos = new vscode.Position(lineIndex, lineOffset + 2);
            endPos = new vscode.Position(lineIndex, lineOffset + closingTag.length - 1);

            returnRanges.push(new vscode.Range(startPos, endPos));
          }
        }

        remainingContent = remainingContent.slice(endOfOpeningTag);
        start = 0;
      }
    });

    startIndex = returnStartIndex + 6;
  }

  return { returnRanges, usedItems };
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

  const { importRanges, importedItems } = findAndHighlightImports(content, dependencies);
  const { returnRanges, usedItems } = findAndHighlightReturn(content, importedItems);

  //highlight only the imports that are used in return so we avoid highlighting unused imports and
  //functions from external libraries
  const filteredRanges = importRanges.filter((range, index) => {
    return usedItems.includes(importedItems[index]);
  });

  // Combine both ranges arrays
  const combinedRanges = [...filteredRanges, ...returnRanges];

  if (combinedRanges.length > 0) {
    activeEditor.setDecorations(highlightDecorationType, combinedRanges);
  }
}

const processedFiles = new Set();

vscode.window.onDidChangeActiveTextEditor(() => {
  const activeEditor = vscode.window.activeTextEditor;
  const activeFilePath = activeEditor?.document?.fileName;
  const activeFileName = path.basename(activeFilePath);

  console.log("Active Filename:", activeFileName);
  console.log("Processed Files:", processedFiles);
  console.log("Decorated inlucdes alreaday?:", processedFiles.has(activeFileName));

  // If the file has already been processed, skip running the code
  if (processedFiles.has(activeFileName)) {
    return;
  }

  const dependencies = dependencyCache.getDependenciesFromPackageJson();
  if (dependencies) {
    checkImportsInFiles(dependencies);
  }
});

//when opening a new file
vscode.window.tabGroups.onDidChangeTabGroups((event) => {
  const activeTabGroup = vscode.window.tabGroups.activeTabGroup;
  const isActive = activeTabGroup?.isActive;

  if (isActive) {
    const activeFileName = activeTabGroup?.activeTab?.label;

    // Add the activeFileName to the processedFiles Set
    if (activeFileName) {
      processedFiles.add(activeFileName);
    }

    // Your code to apply decorations or any other operation
  } else {
    processedFiles.clear();
  }
});

/*try {
  vscode.window.tabGroups.onDidChangeTabGroups((event) => {
    try {
      console.log("Tab Groups changed:", event);
      const activeTabGroup = vscode.window.tabGroups.activeTabGroup;
      const activeEditor = activeTabGroup?.activeEditor;

      // Get the URI or fileName from the activeEditor
      const activeFileName = activeEditor?.document?.fileName;

      console.log("Active Filename:", activeFileName);
    } catch (innerError) {
      console.error("Error in event handler:", innerError);
    }
  });
} catch (error) {
  console.error("Error setting up event listener:", error);
}*/

//const decoratedFiles = new Set();

/*vscode.workspace.onDidChangeTabGroups(() => {
  console.log("Active Filename:", activeFileName);
  console.log("Decorated Files:", decoratedFiles);
  const activeTabGroup = vscode.workspace.tabGroups.activeTabGroup;
  const activeEditor = activeTabGroup?.activeEditor;
  console.log("Active Filename:", activeFileName);
  console.log("Decorated Files:", decoratedFiles);
  // Get the URI or fileName from the activeEditor
  const activeFileName = activeEditor?.document?.fileName;

  if (activeFileName) {
    if (decoratedFiles.has(activeFileName)) {
      // The file is already decorated, do not reapply decorations
      return;
    }
    // Apply your decorations
    // applyDecorations(activeEditor);

    // Add the file to the set of decorated files
    decoratedFiles.add(activeFileName);
  }
});

/*function applyDecorations(editor) {
  if (editor) {
    const dependencies = dependencyCache.getDependenciesFromPackageJson();
    if (dependencies) {
      checkImportsInFiles(dependencies);
    }
  }
}*/

const performCheck = () => {
  const dependencies = dependencyCache.getDependenciesFromPackageJson();
  if (dependencies) {
    checkImportsInFiles(dependencies);
  }
};

function activate(context) {
  const disposable = vscode.commands.registerCommand("liblinkerjs.checkImports", performCheck);

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = { activate, deactivate };

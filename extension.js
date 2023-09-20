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




const processDependencies = (activeEditor) => {
  if (!activeEditor) return;

  const dependencies = dependencyCache.getDependenciesFromPackageJson();
  if (!dependencies) return;

  const document = activeEditor.document;
  const content = document.getText();

  let highlightDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(220,220,220,.35)",
    isWholeLine: false,
  });

  const { importRanges, importedItems } = findAndHighlightImports(content, dependencies);
  const { returnRanges, usedItems } = findAndHighlightReturn(content, importedItems);

  const filteredRanges = importRanges.filter((range, index) => {
    return usedItems.includes(importedItems[index]);
  });

  const combinedRanges = [...filteredRanges, ...returnRanges];

  if (combinedRanges.length > 0) {
    activeEditor.setDecorations(highlightDecorationType, combinedRanges);
  }
};



let previouslyActiveEditors = new Set();

vscode.window.onDidChangeVisibleTextEditors((editors) => {
  handleVisibleTextEditors(editors);
});

function handleVisibleTextEditors(editors) {
  // Create a Set of current visible editors by their file names
  const currentEditorSet = new Set(editors.map(editor => editor.document.fileName.split('\\').pop()));

  // Remove editors that are no longer visible from the set of previously active editors
  for (let name of previouslyActiveEditors) {
    if (!currentEditorSet.has(name)) {
      previouslyActiveEditors.delete(name);
    }
  }

  // Process new editors that were not previously active
  for (let editor of editors) {
    const fileName = editor.document.fileName.split('\\').pop();
    if (!previouslyActiveEditors.has(fileName)) {
      processDependencies(editor);  // Pass the entire editor object
      previouslyActiveEditors.add(fileName);
    }
  }
}


const SINGLE_TAB_GROUP = 1;

const performCheck = () => {
  if (isScreenSplit = vscode.window.tabGroups.all.length > SINGLE_TAB_GROUP) {
    handleVisibleTextEditors(vscode.window.visibleTextEditors);
  } else {
    processDependencies(vscode.window.activeTextEditor);
  }
};

function activate(context) {
  const disposable = vscode.commands.registerCommand("liblinkerjs.checkImports", performCheck);

  context.subscriptions.push(disposable);
}

function deactivate() { }

module.exports = { activate, deactivate };

const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

const { findAndHighlightReturn } = require('./helpers/findAndHighlightReturn');
// get dependencies from package.json
class DependencyCache {
  dependenciesCache = null;
  isWatcherSet = false;

  getDependenciesFromPackageJson = () => {
    const { workspaceFolders } = vscode.workspace;
    const rootPath = workspaceFolders?.[0]?.uri.fsPath;
    const config = vscode.workspace.getConfiguration('reactImportHighlighter');
    const packageJsonRelativePath = config.get('packageJsonPath', './package.json');

    if (!rootPath) {
      return this.dependenciesCache;
    }

    const packageJsonPath = path.join(rootPath, packageJsonRelativePath);
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

function findAndHighlightImports(content, dependencies, startLine = 0) {
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

            const startPos = new vscode.Position(i + startLine, itemStart);
            const endPos = new vscode.Position(i + startLine, itemEnd);

            importRanges.push(new vscode.Range(startPos, endPos));
          });
        }
      }
    }
  });

  return { importRanges, importedItems };
}

const processDependencies = (activeEditor, newContentArray = []) => {
  if (!activeEditor) return;

  const dependencies = dependencyCache.getDependenciesFromPackageJson();
  if (!dependencies) return;

  const document = activeEditor.document;
  const content = document.getText();

  const highlightColor = vscode.workspace.getConfiguration('reactImportHighlighter').get('highlightColor') || "rgba(220,220,220,.35)";

  let highlightDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: highlightColor,
    isWholeLine: false,
  });

  let initialCombinedRanges = [];
  let updateCombinedRanges = [];

  // Initial run


  if (newContentArray.length !== 0) {
    // Process only the changed lines
    newContentArray.forEach(({ content, startLine }) => {
      const { importRanges, importedItems } = findAndHighlightImports(content, dependencies, startLine);
      const { returnRanges, usedItems } = findAndHighlightReturn(content, importedItems, startLine);

      const filteredRanges = importRanges.filter((range, index) => {
        return usedItems.includes(importedItems[index]);
      });

      updateCombinedRanges = [...updateCombinedRanges, ...filteredRanges, ...returnRanges];
    });
  } else {
    const { importRanges, importedItems } = findAndHighlightImports(content, dependencies);
    const { returnRanges, usedItems } = findAndHighlightReturn(content, importedItems);

    const initialFilteredRanges = importRanges.filter((range, index) => {
      return usedItems.includes(importedItems[index]);
    });

    initialCombinedRanges = [...initialFilteredRanges, ...returnRanges];
  }

  // Merge initial and updated combined ranges
  const combinedRangesToSet = [...initialCombinedRanges];

  if (combinedRangesToSet.length > 0) {
    activeEditor.setDecorations(highlightDecorationType, combinedRangesToSet);
  }
};


let shouldProcessOnSave = false;
let changedInfo = [];

vscode.workspace.onDidChangeTextDocument((event) => {
  const activeEditor = vscode.window.activeTextEditor;
  if (event.document !== activeEditor?.document) return;

  event.contentChanges.forEach((change) => {
    const startLine = change.range.start.line;
    const endLine = change.range.end.line;

    //  console.log("Start line in didChange:", startLine);
    //console.log("Line Content:", event.document.lineAt(startLine).text);

    const content = event.document.getText(new vscode.Range(startLine, 0, endLine, 0));

    if (content.trim()) {
      changedInfo.push({ content, startLine });
    }
  });
});




// Triggered when a document is saved
vscode.workspace.onDidSaveTextDocument((document) => {
  shouldProcessOnSave = true;
  const activeEditor = vscode.window.activeTextEditor;
  if (document === activeEditor?.document && shouldProcessOnSave) {
    processDependencies(activeEditor, changedInfo);
    shouldProcessOnSave = false;
    changedInfo = [];
  }
});


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
  console.log("performCheck");
  if (isScreenSplit = vscode.window.tabGroups.all.length > SINGLE_TAB_GROUP) {
    console.log("isScreenSplit");
    handleVisibleTextEditors(vscode.window.visibleTextEditors);
  } else {
    console.log("not in split screen");
    processDependencies(vscode.window.activeTextEditor);
  }
};

function activate(context) {
  const disposable = vscode.commands.registerCommand("liblinkerjs.checkImports", performCheck());

  context.subscriptions.push(disposable);
}

function deactivate() { }

module.exports = { activate, deactivate };

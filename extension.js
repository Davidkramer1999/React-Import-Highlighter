const vscode = require("vscode");


const { findAndHighlightReturn } = require('./src/classes/findAndHighlightReturn');
const { findAndHighlightImports } = require('./src/classes/FindAndHighlightImport');

// get dependencies from package.json
const { dependencyCache } = require('./src/classes/DependencyCache');


let highlightDecorationType;

// Initialization
const initDecorationType = () => {
  const highlightColor = vscode.workspace.getConfiguration('reactImportHighlighter').get('highlightColor') || "rgba(220,220,220,.35)";
  highlightDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: highlightColor,
    isWholeLine: false,
  });
};


const processDependencies = (activeEditor) => {
  if (!activeEditor) return;

  const dependencies = dependencyCache.getDependenciesFromPackageJson();
  if (!dependencies) return;

  const document = activeEditor.document;
  const content = document.getText();

  const { importRanges, importedItems } = findAndHighlightImports(content, dependencies);
  const { returnRanges, usedItems } = findAndHighlightReturn(content, importedItems);

  const initialFilteredRanges = importRanges.filter((range, index) => {
    return usedItems.includes(importedItems[index]);
  });
  let initialCombinedRanges = [...initialFilteredRanges, ...returnRanges];

  if (initialCombinedRanges.length !== 0) {
    activeEditor.setDecorations(highlightDecorationType, initialCombinedRanges);  // Use the higher scope variable
  }

};

vscode.workspace.onWillSaveTextDocument((e) => {
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    highlightDecorationType.dispose();  // Clear the decorations
    initDecorationType();
  }
});


// Triggered when a document is saved
vscode.workspace.onDidSaveTextDocument((document) => {
  const activeEditor = vscode.window.activeTextEditor;
  if (document === activeEditor?.document) {
    processDependencies(activeEditor);
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
  initDecorationType();
  if (isScreenSplit = vscode.window.tabGroups.all.length > SINGLE_TAB_GROUP) {
    console.log("isScreenSplit");
    handleVisibleTextEditors(vscode.window.visibleTextEditors);
  } else {
    processDependencies(vscode.window.activeTextEditor);
  }
};

function activate(context) {
  const disposable = vscode.commands.registerCommand("liblinkerjs.checkImports", performCheck());

  context.subscriptions.push(disposable);
}

function deactivate() { }

module.exports = { activate, deactivate };

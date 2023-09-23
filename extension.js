const vscode = require("vscode");

const { performCheck } = require('./src/core/importAndReturnProcessor');

/*let highlighterSettings;

// Initialize or reset the highlighter
const initializeHighlighter = () => {
  highlighterSettings?.dispose();  // Clear the decorations if they exist
  const highlightColor = vscode.workspace.getConfiguration('reactImportHighlighter').get('highlightColor') || "rgba(220,220,220,.35)";
  highlighterSettings = vscode.window.createTextEditorDecorationType({
    backgroundColor: highlightColor,
    isWholeLine: false,
  });
};*/

/*const getImportAndReturnRanges = (activeEditor) => {
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
    activeEditor.setDecorations(highlighterSettings.highlightDecorationType, initialCombinedRanges);  // Use the higher scope variable
  }

};

vscode.workspace.onWillSaveTextDocument((e) => {
  const activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    highlighterSettings.highlightDecorationType.dispose();  // Clear the decorations
    initializeHighlighter();
  }
});

const handleSaveEvent = (document) => {
  const activeEditor = vscode.window.activeTextEditor;
  if (document === activeEditor?.document) {
    initializeHighlighter();
    processDependencies(activeEditor);
  }
};


// Triggered when a document is saved
vscode.workspace.onDidSaveTextDocument(handleSaveEvent);



let previouslyActiveEditors = new Set();

vscode.window.onDidChangeVisibleTextEditors(handleEditorVisibilityChange);


function handleEditorVisibilityChange(editors) {
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
      getImportAndReturnRanges(editor);  // Pass the entire editor object
      previouslyActiveEditors.add(fileName);
    }
  }
}


const SINGLE_TAB_GROUP = 1;

const performCheck = () => {
  initializeHighlighter();
  if (isScreenSplit = vscode.window.tabGroups.all.length > SINGLE_TAB_GROUP) {
    handleVisibleTextEditors(vscode.window.visibleTextEditors);
  } else {
    getImportAndReturnRanges(vscode.window.activeTextEditor);
  }
};*/

function activate(context) {
  const disposable = vscode.commands.registerCommand("liblinkerjs.checkImports", performCheck());

  context.subscriptions.push(disposable);
}

function deactivate() { }

module.exports = { activate, deactivate };

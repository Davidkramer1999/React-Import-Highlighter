const vscode = require('vscode');

const { findAndHighlightReturn } = require('../classes/findAndHighlightReturn');
const { findAndHighlightImports } = require('../classes/FindAndHighlightImport');
const { dependencyCache } = require('../classes/DependencyCache');
const { highlighterSettings } = require('../utils/highlighter');
const { initializeHighlighter } = require('../utils/highlighter');

const getImportAndReturnRanges = (activeEditor) => {
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

// onDidSaveTextDocument is triggered when a document is saved
const handleSaveEvent = (document) => {
    const activeEditor = vscode.window.activeTextEditor;
    if (document === activeEditor?.document) {
        initializeHighlighter();
        getImportAndReturnRanges(activeEditor);
    }
};


vscode.workspace.onWillSaveTextDocument((e) => {
    console.log("Will save");
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        highlighterSettings.highlightDecorationType.dispose();  // Clear the decorations
        initializeHighlighter();
    }
});

vscode.workspace.onDidSaveTextDocument(handleSaveEvent);
vscode.window.onDidChangeVisibleTextEditors(handleEditorVisibilityChange)

let previouslyActiveEditors = new Set();

// onDidChangeVisibleTextEditors -  trigger when a document is saved 
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

//Initial function called from extension.js
const performCheck = () => {
    initializeHighlighter();
    if (isScreenSplit = vscode.window.tabGroups.all.length > SINGLE_TAB_GROUP) {
        handleVisibleTextEditors(vscode.window.visibleTextEditors);
    } else {
        getImportAndReturnRanges(vscode.window.activeTextEditor);
    }
};


module.exports = { handleSaveEvent, handleEditorVisibilityChange, performCheck };

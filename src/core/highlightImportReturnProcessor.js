const vscode = require('vscode');

const { findAndHighlightReturn } = require('../classes/FindHighlightReturn');
const { findAndHighlightImports } = require('../classes/FindAndHighlightImport');
const dependencyCache = require('../classes/DependencyCache');
const { highlighterSettings } = require('../utils/highlighter');
const { initializeHighlighter } = require('../utils/highlighter');
const { findLineIndex } = require('../utils/findLineIndex');

const highlightImportAndReturnInEditor = (activeEditor) => {
    if (!activeEditor) return;

    const dependencies = dependencyCache.getDependenciesFromPackageJson();
    if (!dependencies) return;

    const document = activeEditor.document;
    const content = document.getText();

    const { importRanges, importedItems } = findAndHighlightImports(content, dependencies, vscode.Position,
        vscode.Range,);

    const { returnRanges, filteredImportRanges } = findAndHighlightReturn(
        content,
        importedItems,
        vscode.Position,
        vscode.Range,
        findLineIndex,
        importRanges,
        importedItems
    );

    let initialCombinedRanges = [...filteredImportRanges, ...returnRanges];

    if (initialCombinedRanges.length !== 0) {
        activeEditor.setDecorations(highlighterSettings.highlightDecorationType, initialCombinedRanges);
    }
};



// onDidSaveTextDocument is triggered when a document is saved
const handleDocumentSaveEvent = (document) => {
    const activeEditor = vscode.window.activeTextEditor;
    if (document === activeEditor?.document) {
        initializeHighlighter();
        highlightImportAndReturnInEditor(activeEditor);
    }
};


vscode.workspace.onWillSaveTextDocument(() => {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        highlighterSettings.highlightDecorationType.dispose();  // Clear the decorations
        initializeHighlighter();
    }
});

vscode.workspace.onDidSaveTextDocument(handleDocumentSaveEvent);
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
            highlightImportAndReturnInEditor(editor);  // Pass the entire editor object
            previouslyActiveEditors.add(fileName);
        }
    }
}


module.exports = { handleDocumentSaveEvent, handleEditorVisibilityChange, highlightImportAndReturnInEditor };

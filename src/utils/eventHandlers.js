const vscode = require('vscode');
const { handleSaveEvent, handleEditorVisibilityChange } = require('../core/importAndReturnProcessor');
const { initializeHighlighter, highlighterSettings } = require('./highlighter');

vscode.workspace.onWillSaveTextDocument((e) => {
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        highlighterSettings.highlightDecorationType.dispose();  // Clear the decorations
        initializeHighlighter();
    }
});

vscode.workspace.onDidSaveTextDocument(handleSaveEvent);
vscode.window.onDidChangeVisibleTextEditors(handleEditorVisibilityChange);

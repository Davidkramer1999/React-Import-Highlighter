
const vscode = require('vscode');
const { handleEditorVisibilityChange, highlightImportAndReturnInEditor } = require('./highlightImportReturnProcessor.js');
const { initializeHighlighter } = require('../utils/highlighter');
const dependencyCache = require('../classes/DependencyCache');
const { highlighterSettings } = require('../utils/highlighter');

dependencyCache.on('cacheUpdated', () => {
    highlighterSettings.highlightDecorationType.dispose();
    initializeReactImportHighlighter();
});

const SINGLE_TAB_GROUP = 1;

//Initial function called from extension.js
const initializeReactImportHighlighter = () => {
    initializeHighlighter();
    if (vscode.window.tabGroups.all.length > SINGLE_TAB_GROUP) {
        handleEditorVisibilityChange(vscode.window.visibleTextEditors);
    } else {
        highlightImportAndReturnInEditor(vscode.window.activeTextEditor);
    }
};

// onDidSaveTextDocument is triggered when a document is saved
module.exports = { initializeReactImportHighlighter };

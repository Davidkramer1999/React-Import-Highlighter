
const vscode = require('vscode');
const { handleEditorVisibilityChange, getImportAndReturnRanges } = require('./importAndReturnProcessor');
const { initializeHighlighter } = require('../utils/highlighter');

const SINGLE_TAB_GROUP = 1;

//Initial function called from extension.js
const initializeReactImportHighlighter = () => {
    initializeHighlighter();
    if (vscode.window.tabGroups.all.length > SINGLE_TAB_GROUP) {
        handleEditorVisibilityChange(vscode.window.visibleTextEditors);
    } else {
        getImportAndReturnRanges(vscode.window.activeTextEditor);
    }
};

// onDidSaveTextDocument is triggered when a document is saved
module.exports = { initializeReactImportHighlighter };

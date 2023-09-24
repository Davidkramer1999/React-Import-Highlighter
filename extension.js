const vscode = require('vscode');
const { initializeReactImportHighlighter } = require('./src/core/initializeReactImportHighlighter');

function activate(context) {
  const disposable = vscode.commands.registerCommand("reactImportHighlighter.checkImports", initializeReactImportHighlighter());

  context.subscriptions.push(disposable);
}

function deactivate() { }

module.exports = { activate, deactivate };

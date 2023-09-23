const vscode = require("vscode");

const { performCheck } = require('./src/core/importAndReturnProcessor');

function activate(context) {
  const disposable = vscode.commands.registerCommand("liblinkerjs.checkImports", performCheck());

  context.subscriptions.push(disposable);
}

function deactivate() { }

module.exports = { activate, deactivate };

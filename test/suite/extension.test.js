const assert = require("assert");
const vscode = require("vscode");
const path = require("path");

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Check Imports Test", async () => {
    const uri = vscode.Uri.file(path.join(__dirname, "..", "..", "sampleWorkspace", "sample.js"));
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);

    // Run your extension command
    await vscode.commands.executeCommand("reactImportHighlighter.checkImports");

    // Check results here - this is a placeholder and might need actual assertions based on your implementation
    assert.strictEqual([1, 2, 3].length, 3);
  });
});

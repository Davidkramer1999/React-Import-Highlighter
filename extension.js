const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

function getDependenciesFromPackageJson() {
  let workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders) {
    let rootPath = workspaceFolders[0].uri.fsPath;
    let packageJsonPath = path.join(rootPath, "package.json");

    if (fs.existsSync(packageJsonPath)) {
      let packageJson = require(packageJsonPath);
      return packageJson.dependencies ? Object.keys(packageJson.dependencies) : [];
    }
  }
  return [];
}

function getJsFilesFromDirectory(directory) {
  let jsFiles = [];
  let files = fs.readdirSync(directory);

  for (let file of files) {
    let fullPath = path.join(directory, file);
    let stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      jsFiles = jsFiles.concat(getJsFilesFromDirectory(fullPath));
    } else if (path.extname(file) === ".tsx" || path.extname(file) === ".js") {
      jsFiles.push(fullPath);
    }
  }

  return jsFiles;
}

//find return in file
function extractImportedItemsFromContent(content, dependencies) {
  let importedItems = [];
  let importMatches = content.match(/import {(.*?)} from ['"](.*?)['"]/g);

  if (importMatches) {
    importMatches.forEach((match) => {
      let importMatch = /import {(.*?)} from ['"](.*?)['"]/.exec(match);
      if (importMatch && importMatch[1]) {
        importMatch[1].split(",").map((item) => {
          item = item.trim();
          if (dependencies.includes(importMatch[2])) {
            importedItems.push(item);
          }
        });
      }
    });
  }
  return importedItems;
}

function findRangesOfDirectImportedItems(content, importedItems, document) {
  let ranges = [];

  // Break the content into lines.
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if the line starts with "import".
    if (line.startsWith("import")) {
      const openBraceIndex = line.indexOf("{");
      const closeBraceIndex = line.indexOf("}");

      // If we found an open brace and a close brace, tokenize the content between them.
      if (openBraceIndex !== -1 && closeBraceIndex !== -1) {
        const tokens = line
          .substring(openBraceIndex + 1, closeBraceIndex)
          .split(",")
          .map((token) => token.trim());

        tokens.forEach((token) => {
          if (importedItems.includes(token)) {
            const tokenStart = line.indexOf(token);
            const tokenEnd = tokenStart + token.length;

            // Convert the line,column to a position in the document.
            let startPos = document.positionAt(document.offsetAt(new vscode.Position(i, tokenStart)));
            let endPos = document.positionAt(document.offsetAt(new vscode.Position(i, tokenEnd)));

            ranges.push(new vscode.Range(startPos, endPos));
          }
        });
      }
    }
  }

  return ranges;
}

function findRangesOfImportedItemsInContent(content, importedItems, document) {
  let ranges = [];

  // Find where the 'return' content starts in the original document.
  const returnStartPosInDocument = document.getText().indexOf(content);

  if (returnStartPosInDocument === -1) {
    return ranges; // If content is not in the document, return the empty ranges array.
  }

  importedItems.forEach((item) => {
    let openingTag = `<${item}`;
    let selfClosingTag = `/>`;
    let closingTag = `</${item}>`;

    let start = content.indexOf(openingTag);
    while (start !== -1) {
      let endOfOpeningTag = content.indexOf(">", start);
      if (endOfOpeningTag === -1) break; // malformed tag

      if (content.substring(endOfOpeningTag - 1, endOfOpeningTag + 1) === selfClosingTag) {
        // It's a self-closing tag, so highlight the whole tag
        let startPos = document.positionAt(returnStartPosInDocument + start);
        let endPos = document.positionAt(returnStartPosInDocument + endOfOpeningTag);
        ranges.push(new vscode.Range(startPos, endPos));
      } else {
        // It's an opening tag, so highlight the tag name
        let startPos = document.positionAt(returnStartPosInDocument + start + 1); // +1 to skip '<'
        let endPos = document.positionAt(returnStartPosInDocument + start + openingTag.length);
        ranges.push(new vscode.Range(startPos, endPos));

        // Find the corresponding closing tag and highlight the tag name
        let closeStart = content.indexOf(closingTag, endOfOpeningTag);
        if (closeStart !== -1) {
          startPos = document.positionAt(returnStartPosInDocument + closeStart + 2); // +2 to skip '</'
          endPos = document.positionAt(returnStartPosInDocument + closeStart + closingTag.length - 1); // -1 to exclude '>'
          ranges.push(new vscode.Range(startPos, endPos));
        }
      }

      // Move to the next occurrence
      start = content.indexOf(openingTag, endOfOpeningTag);
    }
  });

  return ranges;
}

let fileDecorations = new Map();
console.log(fileDecorations, "fileDecorations");

vscode.window.onDidChangeActiveTextEditor((editor) => {
  // Automatically check and highlight import statements
  let dependencies = getDependenciesFromPackageJson();
  console.log(dependencies, "dependencies");
  checkImportsInFiles(dependencies);
});

function extractReturnContent(fileContent) {
  const returnMatch = fileContent.match(/return\s*\(([\s\S]*?)\)\s*;/);
  if (returnMatch && returnMatch[1]) {
    return returnMatch[1];
  }
  return "";
}

function checkImportsInFiles(dependencies) {
  let workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) return;

  let rootPath = workspaceFolders[0].uri.fsPath;
  let srcPath = path.join(rootPath, "src");

  if (!fs.existsSync(srcPath)) {
    vscode.window.showInformationMessage("Couldn't find a 'src' directory.");
    return;
  }

  let activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) {
    return; // Exit if there's no active editor
  }

  let jsFiles = getJsFilesFromDirectory(srcPath);

  let highlightDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(220,220,220,.35)",
    isWholeLine: false,
  });

  jsFiles.forEach((filePath) => {
    vscode.workspace.openTextDocument(filePath).then((document) => {
      let content = fs.readFileSync(filePath, "utf-8");
      let returnContent = extractReturnContent(content);
      let importedItems = extractImportedItemsFromContent(content, dependencies);

      //return content
      let ranges = findRangesOfImportedItemsInContent(returnContent, importedItems, document);
      //imported items
      let ranges2 = findRangesOfDirectImportedItems(content, importedItems, document);

      // Check if the document is currently open in an editor
      const editor = vscode.window.visibleTextEditors.find((e) => e.document === document);
      if (editor) {
        if (ranges.length > 0 || ranges2.length > 0) {
          editor.setDecorations(highlightDecorationType, [...ranges, ...ranges2]);
          console.log("setDecorations", [...ranges, ...ranges2]);
          fileDecorations.set(filePath, [...ranges, ...ranges2]); // Store the decorations
        }
      }
    });
  });
}

function activate(context) {
  console.log('Congratulations, your extension "liblinkerjs" is now active!');

  // This will check for highlighted imports as soon as the extension is activated.
  let dependencies = getDependenciesFromPackageJson();
  checkImportsInFiles(dependencies);

  let disposable = vscode.commands.registerCommand("liblinkerjs.checkImports", () => {
    dependencies = getDependenciesFromPackageJson();
    console.log(dependencies, "dependencies");
    checkImportsInFiles(dependencies);
  });

  context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = { activate, deactivate };

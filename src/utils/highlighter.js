const vscode = require("vscode");

const highlighterSettings = {
    highlightDecorationType: {}
};

const initializeHighlighter = () => {
    const highlightColor = vscode.workspace.getConfiguration('reactImportHighlighter').get('highlightColor') || "rgba(220,220,220,.35)";
    highlighterSettings.highlightDecorationType = vscode.window.createTextEditorDecorationType({
        backgroundColor: highlightColor,
        isWholeLine: false,
    });
};

module.exports = {
    initializeHighlighter,
    highlighterSettings
};

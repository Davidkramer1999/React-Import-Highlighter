const vscode = require("vscode");

const highlighterSettings = {
    highlightDecorationType: {}
};

const getHighlighterSettings = () => {
    const config = vscode.workspace.getConfiguration('reactImportHighlighter');
    const highlightColor = config.get('highlightColor');
    const border = config.get('border');

    const settings = {
        isWholeLine: false,
        backgroundColor: highlightColor,
        border: border,
    };


    if (highlightColor !== null) {
        //highlightColor = background color
        settings.backgroundColor = highlightColor;
    }

    if (border !== null && border !== "none") {
        settings.border = border;
    }

    return settings;
}


const initializeHighlighter = () => {
    const settings = getHighlighterSettings();
    highlighterSettings.highlightDecorationType = vscode.window.createTextEditorDecorationType(settings);
};

vscode.workspace.onDidChangeConfiguration((e) => {
    console.log("onDidChangeConfiguration", e);
    if (e.affectsConfiguration('reactImportHighlighter')) {
        highlighterSettings.highlightDecorationType.dispose();
        initializeHighlighter();
    }
});


module.exports = {
    initializeHighlighter,
    highlighterSettings
};

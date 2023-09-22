const vscode = require("vscode");


function findAndHighlightImports(content, dependencies, startLine = 0) {
    const importedItems = [];
    const importRanges = [];

    const lines = content.split("\n");

    lines.forEach((line, i) => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith("import")) {
            const fromIndex = trimmedLine.indexOf("from");
            if (fromIndex === -1) return;

            const dep = trimmedLine
                .slice(fromIndex + 5)
                .replace(/['"`;]/g, "")
                .trim();

            if (dependencies.includes(dep)) {
                const openBraceIndex = trimmedLine.indexOf("{");
                const closeBraceIndex = trimmedLine.indexOf("}");

                if (openBraceIndex !== -1 && closeBraceIndex !== -1) {
                    const items = trimmedLine.slice(openBraceIndex + 1, closeBraceIndex).split(",");

                    items.forEach((item) => {
                        const trimmedItem = item.trim();
                        importedItems.push(trimmedItem);

                        const itemStart = line.indexOf(trimmedItem);
                        const itemEnd = itemStart + trimmedItem.length;

                        const startPos = new vscode.Position(i + startLine, itemStart);
                        const endPos = new vscode.Position(i + startLine, itemEnd);

                        importRanges.push(new vscode.Range(startPos, endPos));
                    });
                }
            }
        }
    });

    return { importRanges, importedItems };
}


module.exports = {
    findAndHighlightImports
};
const vscode = require("vscode");


function findAndHighlightImports(content, dependencies) {
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
                const hasBraces = openBraceIndex !== -1 && closeBraceIndex !== -1;

                const importStart = hasBraces ? openBraceIndex + 1 : trimmedLine.indexOf("import") + 6;
                const importEnd = hasBraces ? closeBraceIndex : fromIndex;

                const items = trimmedLine.slice(importStart, importEnd).split(",");

                items.forEach((item) => {
                    const trimmedItem = item.trim();
                    importedItems.push(trimmedItem);

                    const itemStart = line.indexOf(trimmedItem)
                    const itemEnd = itemStart + trimmedItem.length;

                    const startPos = new vscode.Position(i, itemStart);
                    const endPos = new vscode.Position(i, itemEnd);

                    importRanges.push(new vscode.Range(startPos, endPos));
                });
            }
        }
    });

    return { importRanges, importedItems };
}



module.exports = {
    findAndHighlightImports
};
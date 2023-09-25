function parseImportStatement(importStatement) {
    const fromIndex = importStatement.indexOf("from");
    if (fromIndex === -1) return null;

    const dep = importStatement
        .slice(fromIndex + 5)
        .replace(/['"`;]/g, "")
        .trim();

    const openBraceIndex = importStatement.indexOf("{");
    const closeBraceIndex = importStatement.indexOf("}");
    const hasBraces = openBraceIndex !== -1 && closeBraceIndex !== -1;

    const importStart = hasBraces ? openBraceIndex + 1 : importStatement.indexOf("import") + 6;
    const importEnd = hasBraces ? closeBraceIndex : fromIndex;

    const items = importStatement.slice(importStart, importEnd).split(/\s*,\s*/);

    if (hasBraces) {
        const defaultImport = importStatement.slice(importStatement.indexOf("import") + 6, openBraceIndex).trim();
        const namedImports = importStatement.slice(openBraceIndex + 1, closeBraceIndex).trim();
        const items = namedImports ? namedImports.split(/\s*,\s*/) : [];

        if (defaultImport) {
            items.unshift(defaultImport.replace(',', '').trim());
        }
        return { dep, items, hasBraces };
    }
    return { dep, items, hasBraces };
}

function handleImportItem(item, i, line, PositionConstructor, RangeConstructor, importedItems, importRanges) {
    let trimmedItem = item.trim();

    // Handle aliased imports
    if (trimmedItem.includes(" as ")) {
        const parts = trimmedItem.split(" as ");
        trimmedItem = parts[1].trim();  // Use the alias
    }

    importedItems.push(trimmedItem);

    const itemStart = line.indexOf(trimmedItem);
    const itemEnd = itemStart + trimmedItem.length;

    const startPos = new PositionConstructor(i, itemStart);
    const endPos = new PositionConstructor(i, itemEnd);

    importRanges.push(new RangeConstructor(startPos, endPos));
}

function findAndHighlightImports(
    content,
    dependencies,
    PositionConstructor,
    RangeConstructor
) {
    const importedItems = [];
    const importRanges = [];

    const lines = content.split("\n");

    lines.forEach((line, i) => {
        const importStatements = line.split(';').filter(statement => statement.trim().startsWith('import'));

        importStatements.forEach((importStatement) => {
            const parsed = parseImportStatement(importStatement.trim());
            if (!parsed || !dependencies.includes(parsed.dep)) return;

            parsed.items.forEach((item) => {
                handleImportItem(item, i, line, PositionConstructor, RangeConstructor, importedItems, importRanges);
            });
        });
    });

    return { importRanges, importedItems };
}



module.exports = {
    findAndHighlightImports
};
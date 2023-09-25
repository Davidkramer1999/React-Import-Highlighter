function findAndHighlightReturn(content, dependencies, positionCreator, rangeCreator, findLineIndex, importRanges, importedItems) {
    const usedItems = [];
    const returnRanges = [];
    const filteredImportRanges = [];

    dependencies.forEach((dependency) => {
        let ranges = findAllOccurrences(content, dependency, positionCreator, rangeCreator, findLineIndex);
        if (ranges.length > 0) {
            usedItems.push(dependency);
        }
        returnRanges.push(...ranges);
    });

    // filter unused import if not used in return
    importRanges.forEach((range, index) => {
        if (usedItems.includes(importedItems[index])) {
            filteredImportRanges.push(range);
        }
    });

    return { returnRanges: returnRanges, filteredImportRanges: filteredImportRanges };
}

// findAllOccurrences function
function findAllOccurrences(content, tag, positionCreator, rangeCreator, findLineIndex) {
    const regex = new RegExp(`<${tag}[^>]*>|<\/${tag}>`, 'g');
    let returnRanges = [];

    for (const match of content.matchAll(regex)) {
        let lineIndex = findLineIndex(content, match.index);
        let lineContent = content.split("\n")[lineIndex];

        let skipCharacters = match[0].startsWith('</') ? 2 : 1;
        let lineOffset = lineContent.indexOf(match[0]) + skipCharacters;

        // Create new instances using the new keyword
        let startPos = new positionCreator(lineIndex, lineOffset);
        let endPos = new positionCreator(lineIndex, lineOffset + tag.length);

        returnRanges.push(new rangeCreator(startPos, endPos));
    }

    return returnRanges;
}

module.exports = {
    findAndHighlightReturn,
};
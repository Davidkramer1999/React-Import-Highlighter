const { generateRegex } = require('../utils/generateRegex');

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

    importRanges.forEach((range, index) => {
        if (usedItems.includes(importedItems[index])) {
            filteredImportRanges.push(range);
        }
    });

    return { returnRanges: returnRanges, filteredImportRanges: filteredImportRanges };
}

function findAllOccurrences(content, tag, positionCreator, rangeCreator, findLineIndex) {
    const regex = generateRegex(tag);
    let returnRanges = [];
    let lineStartIndices = precalculateLineStartIndices(content);

    for (const match of content.matchAll(regex)) {
        let lineIndex = findLineIndex(content, match.index);

        let lineOffset = match.index - lineStartIndices[lineIndex];
        let skipCharacters = match[0].startsWith('</') ? 2 : 1;
        lineOffset += skipCharacters;

        let { startPos, endPos } = createPositions(lineIndex, lineOffset, tag.length, positionCreator);
        returnRanges.push(new rangeCreator(startPos, endPos));
    }

    return returnRanges;
}


// findAllOccurrences function
function precalculateLineStartIndices(content) {
    let lineStartIndices = [0];
    for (let i = 0; i < content.length; ++i) {
        if (content[i] === '\n') {
            lineStartIndices.push(i + 1);
        }
    }
    return lineStartIndices;
}

function createPositions(lineIndex, lineOffset, tagLength, positionCreator) {
    let startPos = new positionCreator(lineIndex, lineOffset);
    let endPos = new positionCreator(lineIndex, lineOffset + tagLength);
    return { startPos, endPos };
}


module.exports = {
    findAndHighlightReturn,
};
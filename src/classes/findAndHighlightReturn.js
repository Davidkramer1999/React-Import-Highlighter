const vscode = require("vscode");
const { findLineIndex } = require('../utils/findLineIndex');

// Main function
function findAndHighlightReturn(content, dependencies) {
    const usedItems = [];
    const returnRanges = [];

    dependencies.forEach((dependency) => {
        let ranges = findAllOccurrences(content, dependency);
        if (ranges.length > 0) {
            usedItems.push(dependency);
        }
        returnRanges.push(...ranges);
    });

    return { returnRanges: returnRanges, usedItems: usedItems };
}

function findAllOccurrences(content, tag) {
    const regex = new RegExp(`<${tag}[^>]*>|<\/${tag}>`, 'g');
    let returnRanges = [];

    for (const match of content.matchAll(regex)) {
        let lineIndex = findLineIndex(content, match.index);
        let lineContent = content.split("\n")[lineIndex];

        let skipCharacters = match[0].startsWith('</') ? 2 : 1; // Skip '<' and optionally '/'
        let lineOffset = lineContent.indexOf(match[0]) + skipCharacters;

        let startPos = new vscode.Position(lineIndex, lineOffset);
        let endPos = new vscode.Position(lineIndex, lineOffset + tag.length);

        returnRanges.push(new vscode.Range(startPos, endPos));
    }

    return returnRanges;
}




module.exports = {
    findAndHighlightReturn
};
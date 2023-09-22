const vscode = require("vscode");

function findLineIndex(content, index, startLine) {
    const lineIndex = content.substring(0, index).split("\n").length - 1 + startLine;
    console.log('Calculated lineIndex:', lineIndex);
    return lineIndex;
}


// Helper function to find next tag position
function findNextTag(content, tag, fromIndex, whichone) {
    if (content === undefined) {
        console.log('Content is undefined');

        return -1; // or some other default value
    }
    return content.indexOf(tag, fromIndex);
}

// Main function
function findAndHighlightReturn(content, whichone, startLine = 0) {
    console.log('startLine initial:', startLine);

    const usedItems = [];
    const returnRanges = [];
    const dependencies = ['useState', 'FontAwesomeIcon', 'faHeart', 'faSearch'];

    // remove the content before return if there is one
    let returnStartIndex = content.indexOf("return", 0);

    console.log('returnStartIndex:', returnStartIndex);
    // if there is no return then use content
    let remainingContent = returnStartIndex !== -1 ? content.slice(returnStartIndex + 6) : content;


    let lineIndex = findLineIndex(content, returnStartIndex, startLine);
    // console.log('content:', content);
    console.log('returnStartIndex:', returnStartIndex);
    console.log('startLine:', startLine);
    console.log('content:', content);
    console.log('remainingContent:', remainingContent);

    dependencies.forEach((dependency, index) => {
        //console.log('Processing dependency', index, dependency);
        processDependency(remainingContent, lineIndex, dependency, usedItems, returnRanges, content, startLine);

    });

    //console.log(returnRanges, "returnRanges");
    return { returnRanges, usedItems };
}

// Helper function to process each dependency
function processDependency(remainingContent, lineIndex, dependency, usedItems, returnRanges, content, startLine) {
    const openingTag = `<${dependency}`;
    const selfClosingTag = `/>`;
    const closingTag = `</${dependency}>`;

    // console.log('Current line index:', initialLineIndex);

    let start = 0;

    while ((start = findNextTag(remainingContent, openingTag, start, 2)) !== -1) {
        const endOfOpeningTag = findNextTag(remainingContent, ">", start, 3);
        if (endOfOpeningTag === -1) break;

        const isSelfClosing = remainingContent.substring(endOfOpeningTag - 1, endOfOpeningTag + 1) === selfClosingTag;

        lineIndex += remainingContent.substr(0, start).split("\n").length - 1;

        let lineContent = content.split("\n")[lineIndex];
        let lineOffset = lineContent.indexOf(openingTag) + 1; // +1 to skip the '<'

        let startPos = new vscode.Position(lineIndex, lineOffset);
        let endPos = new vscode.Position(lineIndex, lineOffset + openingTag.length - 1); // -1 to also skip the '<'

        returnRanges.push(new vscode.Range(startPos, endPos));
        usedItems.push(dependency);

        if (!isSelfClosing) {
            const closeStart = findNextTag(remainingContent, closingTag, endOfOpeningTag, 5);
            if (closeStart !== -1) {
                lineOffset = findNextTag(lineContent, closingTag, 0, 6);
                startPos = new vscode.Position(lineIndex, lineOffset + 2);
                endPos = new vscode.Position(lineIndex, lineOffset + closingTag.length - 1);

                returnRanges.push(new vscode.Range(startPos, endPos));
            }
        }

        remainingContent = remainingContent.slice(endOfOpeningTag);
        start = 0;
    }
}

module.exports = {
    findAndHighlightReturn
};
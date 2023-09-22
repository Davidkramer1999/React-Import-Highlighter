
function findLineIndex(content, index) {
    let lines = content.substring(0, index).split('\n');
    return lines.length - 1;
}
module.exports = {
    findLineIndex
};

function generateRegex(tag) {
    return new RegExp(`<${tag}[^>]*>|<\/${tag}>`, 'g');
}
module.exports = {
    generateRegex
};
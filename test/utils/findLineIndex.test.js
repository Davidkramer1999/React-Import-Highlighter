const assert = require('assert');
const { findLineIndex } = require('../../src/utils/findLineIndex');

suite('findLineIndex Test Suite', () => {

    test('should return correct line index', () => {
        const content = `line1
line2
line3`;
        const index1 = 5;  // Position is within 'line1'
        const index2 = 10; // Position is within 'line2'
        const index3 = 15; // Position is within 'line3'

        assert.strictEqual(findLineIndex(content, index1), 0); // line1 is at index 0
        assert.strictEqual(findLineIndex(content, index2), 1); // line2 is at index 1
        assert.strictEqual(findLineIndex(content, index3), 2); // line3 is at index 2
    });

    test('should return 0 for index 0', () => {
        const content = `line1
line2
line3`;
        const index = 0;
        assert.strictEqual(findLineIndex(content, index), 0); // At the very start of the content
    });

    test('should handle empty content', () => {
        const content = '';
        const index = 0;
        assert.strictEqual(findLineIndex(content, index), 0); // No lines, so should return 0
    });

    test('should handle content without line breaks', () => {
        const content = 'nolinebreaks';
        const index = 5;
        assert.strictEqual(findLineIndex(content, index), 0); // No line breaks, so should return 0
    });
});

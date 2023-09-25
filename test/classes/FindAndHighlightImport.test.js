const assert = require('assert');
const { findAndHighlightImports } = require('../../src/classes/FindAndHighlightImport');

class MockPosition {
    constructor(line, character) {
        this.line = line;
        this.character = character;
    }
}

class MockRange {
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
}

suite('FindAndHighlightImports Test Suite', () => {
    test('findAndHighlightImports should find imported items and their ranges', () => {
        const content = `
        import React from 'react';
        import { useState } from 'react';
        `;
        const dependencies = ['react', 'react-data-table-component'];

        const { importRanges, importedItems } = findAndHighlightImports(
            content,
            dependencies,
            MockPosition,
            MockRange
        );

        assert.strictEqual(importedItems.length, 2);
        assert.strictEqual(importedItems[0], 'React');
        assert.strictEqual(importedItems[1], 'useState');
        assert.strictEqual(importRanges.length, 2);
    });

    test('findAndHighlightImports should handle imports without braces', () => {
        const content = `
        import React from 'react';
        import DataTable from "react-data-table-component";
        `;
        const dependencies = ['react', 'react-data-table-component'];

        const { importRanges, importedItems } = findAndHighlightImports(
            content,
            dependencies,
            MockPosition,
            MockRange
        );

        assert.strictEqual(importedItems.length, 2);
        assert.strictEqual(importedItems[0], 'React');
        assert.strictEqual(importedItems[1], 'DataTable');
        assert.strictEqual(importRanges.length, 2);
    });

    test('Should ignore imports from unlisted dependencies', () => {
        const content = `import { something } from 'unlisted-dependency';`;
        const dependencies = ['react'];
        const { importRanges, importedItems } = findAndHighlightImports(content, dependencies, MockPosition, MockRange);
        assert.strictEqual(importedItems.length, 0);
        assert.strictEqual(importRanges.length, 0);
    });

    test('Should handle multiple imports from a single line', () => {
        const content = `import { useState, useEffect } from 'react';`;
        const dependencies = ['react'];
        const { importedItems } = findAndHighlightImports(content, dependencies, MockPosition, MockRange);
        assert.strictEqual(importedItems.length, 2);
        assert.deepStrictEqual(importedItems, ['useState', 'useEffect']);
    });

    test('Should handle default and named imports together', () => {
        const content = `import React, { useState } from 'react';`;
        const dependencies = ['react'];
        const { importedItems } = findAndHighlightImports(content, dependencies, MockPosition, MockRange);
        assert.strictEqual(importedItems.length, 2);
        assert.deepStrictEqual(importedItems, ['React', 'useState']);
    });

    test('Should handle variations in whitespace', () => {
        const content = `import {useState, useEffect} from'react';`;
        const dependencies = ['react'];
        const { importedItems } = findAndHighlightImports(content, dependencies, MockPosition, MockRange);
        assert.strictEqual(importedItems.length, 2);
        assert.deepStrictEqual(importedItems, ['useState', 'useEffect']);
    });

    test('Should ignore comments', () => {
        const content = `
    // import { fakeImport } from 'react';
    import { useState } from 'react';`;
        const dependencies = ['react'];
        const { importedItems } = findAndHighlightImports(content, dependencies, MockPosition, MockRange);
        assert.strictEqual(importedItems.length, 1);
        assert.deepStrictEqual(importedItems, ['useState']);
    });

    test('Should handle aliased imports', () => {
        const content = `import { useState as State, useEffect as Effect } from 'react';`;
        const dependencies = ['react'];
        const { importedItems } = findAndHighlightImports(content, dependencies, MockPosition, MockRange);
        assert.strictEqual(importedItems.length, 2);
        assert.deepStrictEqual(importedItems, ['State', 'Effect']);
    });

    test('Should handle two imports in one line', () => {
        const content = `import { useState } from 'react';import { Button } from "reactstrap";`;
        const dependencies = ['react', 'reactstrap'];
        const { importedItems } = findAndHighlightImports(content, dependencies, MockPosition, MockRange);
        assert.strictEqual(importedItems.length, 2);
        assert.deepStrictEqual(importedItems, ['useState', "Button"]);
    });


});
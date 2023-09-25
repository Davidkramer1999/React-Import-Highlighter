const assert = require('assert');
const { findAndHighlightReturn } = require('../../src/classes/FindHighlightReturn');
const { findLineIndex } = require('../../src/utils/findLineIndex');

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

suite('FindAndHighlightReturn Test Suite', () => {

    test('findAndHighlightReturn should find dependencies', () => {
        const content = `
       import React from 'react';
       
       function App() {
           return (
               <div>
                   Hello World
               </div>
           );
       }
       `;

        const dependencies = ['div'];
        const importRanges = [1]
        const importedItems = ['div'];  // Only div is imported

        const { returnRanges, filteredImportRanges } = findAndHighlightReturn(
            content,
            dependencies,
            MockPosition,
            MockRange,
            findLineIndex,
            importRanges,
            importedItems
        );
        assert.strictEqual(returnRanges.length, 2); // opening and closing tags
        assert.strictEqual(filteredImportRanges.length, 1);  // 
        assert.deepStrictEqual(filteredImportRanges, [1]);

    });
    test('findAndHighlightReturn should return empty if no dependencies found', () => {
        const content = `
            import React from 'react';
            
            function App() {
                return (
                    <div>
                        Hello World
                    </div>
                );
            }
            `;

        const dependencies = ['span'];
        const importRanges = [1, 2, 3, 4, 5, 6, 7, 8]
        const importedItems = ['div'];  // Only div is imported

        const { returnRanges, filteredImportRanges } = findAndHighlightReturn(
            content,
            dependencies,
            MockPosition,
            MockRange,
            findLineIndex,
            importRanges,
            importedItems
        );

        assert.strictEqual(returnRanges.length, 0);
        assert.strictEqual(filteredImportRanges.length, 0);
        assert.deepStrictEqual(filteredImportRanges, []);

    });

    test('findAndHighlightReturn should find multiple usedItems and filter import ranges', () => {
        const content = `
    import React, { useState } from "react";
    import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
    import "./css/Search.css";
    import { Button, Col, Row } from "reactstrap";
    import DataTable from "react-data-table-component";

    export default function DemoComponent() {
        return (
            <div>
                <Row>
                    <Col>
                        <span>
                            <FontAwesomeIcon icon="check-square" />
                            <Button>Click Me!</Button>
                        </span>
                    </Col>
                </Row>
                <DataTable columns={columns} data={data} />
            </div>
        );
    }
    `;

        const dependencies = ['FontAwesomeIcon', 'Row', 'Col', 'Button', 'DataTable'];
        const importRanges = [1, 2, 3, 4, 5, 6, 7, 8]
        const importedItems = ['FontAwesomeIcon', 'Row', 'Col', 'Button', 'DataTable', 'faHeart', 'faSearch'];  // All the imported items

        const { returnRanges, filteredImportRanges } = findAndHighlightReturn(
            content,
            dependencies,
            MockPosition,
            MockRange,
            findLineIndex,
            importRanges,
            importedItems
        );

        assert.strictEqual(returnRanges.length, 8);  // based on your expected count
        assert.strictEqual(filteredImportRanges.length, 5)
        assert.deepStrictEqual(filteredImportRanges, [1, 2, 3, 4, 5]);
    });

    test('findAndHighlightReturn multiple items in one row', () => {
        const content = `
            import React, { useState } from "react";
            import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
            import "./css/Search.css";
            import { Button, Col, Row } from "reactstrap";
            import DataTable from "react-data-table-component";

            export default function DemoComponent() {
                return (
                  <div>
      <Row>
        <Col>
          <span>
            <FontAwesomeIcon icon="check-square" /> <Button>Click Me!</Button>
            <Button>Click Me!</Button>
          </span>
        </Col>
      </Row>
      <DataTable columns={columns} data={data} />
    </div>
                );
            }
        `;

        const dependencies = ['React', 'useState', 'faHeart', 'faSearch', 'Button', 'Col', 'Row', 'FontAwesomeIcon', 'DataTable']  // Adjusted dependencies to account for all tags and components
        const importRanges = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        const importedItems = ['React', 'useState', 'faHeart', 'faSearch', 'Button', 'Col', 'Row', 'FontAwesomeIcon', 'DataTable']  // Simulating the imported items

        const { returnRanges, filteredImportRanges } = findAndHighlightReturn(
            content,
            dependencies,
            MockPosition,
            MockRange,
            findLineIndex,
            importRanges,
            importedItems
        );
        console.log("filteredImportRanges", filteredImportRanges);
        console.log("returnRanges: ", returnRanges);

        assert.strictEqual(returnRanges.length, 10);  // 10 occurrences based on your manual testing
        assert.strictEqual(filteredImportRanges.length, 5); // Assuming all imported items are used
    });



});




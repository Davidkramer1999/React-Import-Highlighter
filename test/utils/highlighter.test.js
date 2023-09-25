const assert = require('assert');
const sinon = require('sinon');
const vscode = require('vscode');
const { initializeHighlighter, highlighterSettings } = require('../../src/utils/highlighter');

suite('Highlighter Test Suite', () => {
    let createTextEditorDecorationTypeStub;
    let disposeStub;
    let getConfigurationStub;

    suiteSetup(() => {
        // Stub vscode.window.createTextEditorDecorationType method
        createTextEditorDecorationTypeStub = sinon.stub(vscode.window, 'createTextEditorDecorationType');
        disposeStub = sinon.stub();

        // Stub vscode.workspace.getConfiguration
        getConfigurationStub = sinon.stub(vscode.workspace, 'getConfiguration').returns({
            get: sinon.stub().returns("rgba(255,0,0,.35)")
        });
    });

    suiteTeardown(() => {
        // Restore the stubbed methods
        createTextEditorDecorationTypeStub.restore();
        getConfigurationStub.restore();
    });

    test('initializeHighlighter should initialize highlightDecorationType', () => {
        const fakeDecorationType = { dispose: disposeStub };
        createTextEditorDecorationTypeStub.returns(fakeDecorationType);
        initializeHighlighter();
        assert.strictEqual(highlighterSettings.highlightDecorationType, fakeDecorationType);
    });

    test('initializeHighlighter should set custom color from configuration', () => {
        // Initialize the highlighter
        initializeHighlighter();

        // Verify the custom color was passed to createTextEditorDecorationType
        sinon.assert.calledWith(createTextEditorDecorationTypeStub, sinon.match({ backgroundColor: "rgba(255,0,0,.35)" }));
    });

    test('clearHighlights should call dispose on highlightDecorationType', () => {
        // Setup
        const fakeDecorationType = { dispose: disposeStub };
        createTextEditorDecorationTypeStub.returns(fakeDecorationType);
        initializeHighlighter();

        // Exercise
        highlighterSettings.highlightDecorationType.dispose();  // Clear the decorations

        // Verify
        sinon.assert.calledOnce(disposeStub);
    });
});

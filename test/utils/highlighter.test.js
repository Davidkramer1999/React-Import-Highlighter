const assert = require('assert');
const sinon = require('sinon');
const vscode = require('vscode');
const { initializeHighlighter, highlighterSettings } = require('../../src/utils/highlighter');

suite('Highlighter Test Suite', () => {
    let createTextEditorDecorationTypeStub;
    let disposeStub;
    let getConfigurationStub;
    let onDidChangeConfigurationEmitter;
    let fakeDecorationType;


    suiteSetup(() => {
        // Stub vscode.window.createTextEditorDecorationType method
        createTextEditorDecorationTypeStub = sinon.stub(vscode.window, 'createTextEditorDecorationType');
        disposeStub = sinon.stub();

        // Create an event emitter for workspace configuration changes
        onDidChangeConfigurationEmitter = new vscode.EventEmitter();

        // Stub vscode.workspace.getConfiguration and onDidChangeConfiguration
        getConfigurationStub = sinon.stub(vscode.workspace, 'getConfiguration');
        sinon.stub(vscode.workspace, 'onDidChangeConfiguration').callsFake(callback => {
            onDidChangeConfigurationEmitter.event(callback);
            return { dispose: disposeStub };
        });

    });

    suiteTeardown(() => {
        // Restore the stubbed methods
        createTextEditorDecorationTypeStub.restore();
        getConfigurationStub.restore();
    });

    setup(() => {
        // Setup before each test
        fakeDecorationType = { dispose: disposeStub };
        createTextEditorDecorationTypeStub.returns(fakeDecorationType);
        getConfigurationStub.returns({
            get: sinon.stub().callsFake(key => key === 'highlightColor' ? "rgba(255,0,0,.90)" : null)
        });
    });


    test('should update highlightDecorationType when highlightColor changes', () => {
        getConfigurationStub.returns({
            get: sinon.stub().callsFake(key => key === 'highlightColor' ? "rgba(255,0,0,.90)" : null)
        });

        const fakeDecorationType1 = { dispose: disposeStub };
        createTextEditorDecorationTypeStub.returns(fakeDecorationType1);

        initializeHighlighter();

        console.log(fakeDecorationType1, "highlighterSettings.highlightDecorationTyp");
        assert.strictEqual(highlighterSettings.highlightDecorationType, fakeDecorationType1);

        // Simulate a change in configuration
        getConfigurationStub.returns({
            get: sinon.stub().callsFake(key => key === 'highlightColor' ? "rgba(0,255,0,.35)" : null)
        });

        const fakeDecorationType2 = { dispose: disposeStub };
        createTextEditorDecorationTypeStub.returns(fakeDecorationType2);

        // Fire the onDidChangeConfiguration event
        onDidChangeConfigurationEmitter.fire({ affectsConfiguration: (str) => str === 'reactImportHighlighter' });
        console.log(fakeDecorationType2, "highlighterSettingsp2");
        initializeHighlighter();

        assert.strictEqual(highlighterSettings.highlightDecorationType, fakeDecorationType2);
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
        sinon.assert.calledWith(createTextEditorDecorationTypeStub, sinon.match({ backgroundColor: "rgba(255,0,0,.90)" }));
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

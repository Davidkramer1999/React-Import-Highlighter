const assert = require('assert');
const sinon = require('sinon');
const vscode = require('vscode');
const fs = require('fs');
const dependencyCache = require('../../src/classes/DependencyCache');

suite('DependencyCache Test Suite', () => {
    let workspaceStub;
    let fsExistsStub;
    let fsReadStub;
    let fsWatchStub;
    let configStub;
    const uri = { fsPath: '/fake/path/to/workspace' };

    setup(() => {
        workspaceStub = sinon.stub(vscode.workspace, 'getConfiguration');
        sinon.stub(vscode.workspace, 'workspaceFolders').value([{ uri }]);
        fsExistsStub = sinon.stub(fs, 'existsSync').returns(true);
        fsReadStub = sinon.stub(fs, 'readFileSync');
        fsWatchStub = sinon.stub(fs, 'watchFile');
        configStub = { get: sinon.stub() };
        workspaceStub.returns(configStub)
    });

    teardown(() => {
        sinon.restore();
    });

    test('should return cached dependencies', () => {
        // Initial setup
        dependencyCache.dependenciesCache = ['dep1', 'dep2'];

        const result = dependencyCache.getDependenciesFromPackageJson();
        assert.deepStrictEqual(result, ['dep1', 'dep2']);
    });

    test('should read package.json and return dependencies', () => {
        fsExistsStub.returns(true);
        fsReadStub.returns(JSON.stringify({ dependencies: { 'dep1': '1.0.0', 'dep2': '2.0.0' } }));
        const result = dependencyCache.getDependenciesFromPackageJson();
        assert.deepStrictEqual(result, ['dep1', 'dep2']);
    });

    test('should not set up new file watcher if one is already active', () => {
        dependencyCache.isWatcherSet = true;
        fsExistsStub.returns(true);
        fsReadStub.returns(JSON.stringify({ dependencies: { 'dep1': '1.0.0' } }));
        dependencyCache.getDependenciesFromPackageJson();
        assert(fsWatchStub.notCalled);
    });

});

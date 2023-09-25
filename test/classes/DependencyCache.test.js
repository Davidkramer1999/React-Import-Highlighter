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

    test('should setup watcher if dependencies exist and have changed', async function () {
        dependencyCache.dependenciesCache = { 'dep1': '1.0.0' };

        fsReadStub.resetBehavior();
        fsReadStub.onFirstCall().returns(JSON.stringify({ dependencies: { 'dep1': '1.0.0', 'dep2': '2.0.0' } }));
        fsReadStub.onSecondCall().returns(JSON.stringify({ dependencies: { 'dep1': '1.0.0', 'dep3': '3.0.0' } }));

        const emitterSpy = sinon.spy(dependencyCache, 'emit');

        // Act
        await dependencyCache.getDependenciesFromPackageJson();


        // Assert
        assert.strictEqual(dependencyCache.isWatcherSet, true);
        assert.deepEqual(dependencyCache.dependenciesCache, { 'dep1': '1.0.0', 'dep2': '2.0.0' });

        fsWatchStub.yield();

        // More Assertions
        assert.deepEqual(dependencyCache.dependenciesCache, { 'dep1': '1.0.0', 'dep3': '3.0.0' });
        sinon.assert.calledOnce(emitterSpy);
        sinon.assert.calledWith(emitterSpy, 'cacheUpdated');
    });

    test('should read package.json and return dependencies', async () => {
        fsExistsStub.returns(true);
        fsReadStub.returns(JSON.stringify({ dependencies: { 'dep1': '1.0.0', 'dep2': '2.0.0' } }));
        await dependencyCache.getDependenciesFromPackageJson();
        assert.deepStrictEqual(dependencyCache.dependenciesCache, { 'dep1': '1.0.0', 'dep2': '2.0.0' });
    });


    test('should not set up new file watcher if one is already active', () => {
        dependencyCache.isWatcherSet = true;
        fsExistsStub.returns(true);
        fsReadStub.returns(JSON.stringify({ dependencies: { 'dep1': '1.0.0' } }));
        dependencyCache.getDependenciesFromPackageJson();
        assert(fsWatchStub.notCalled);
    });

    test('should return cached dependencies', async () => {
        fsReadStub.returns(JSON.stringify({ dependencies: { 'dep1': '1.0.0', 'dep2': '2.0.0' } }));
        const result = await dependencyCache.getDependenciesFromPackageJson();
        assert.deepStrictEqual(result, ['dep1', 'dep2']);
    });

});

const vscode = require("vscode");
const { initializeReactImportHighlighter } = require('./src/core/initializeReactImportHighlighter');
const dependencyCaches = require('./src/utils/getDependencyCache');
const { highlighterSettings } = require('./src/utils/highlighter');

function activate() {
  const dependencyCache = dependencyCaches.getDependencyCache();

  if (!dependencyCache) {
    console.error("DependencyCache is not available");
    return;
  }

  setupDependencyCacheInitializer(dependencyCache);
  executeInitializer(dependencyCache);
  subscribeToCacheUpdates(dependencyCache);
}

function setupDependencyCacheInitializer(dependencyCache) {
  let cacheInitialized = false;

  dependencyCache.setInitializer(() => {
    if (!cacheInitialized) {
      console.log("Initializer called");
      initializeReactImportHighlighter();
      cacheInitialized = true;
    }
  });
}

function executeInitializer(dependencyCache) {
  dependencyCache.initializer();
}

function subscribeToCacheUpdates(dependencyCache) {
  dependencyCache.on('cacheUpdated', () => {
    highlighterSettings.highlightDecorationType.dispose();
    initializeReactImportHighlighter();
  });
}

function deactivate() {
}

module.exports = { activate, deactivate };

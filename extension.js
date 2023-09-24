const vscode = require("vscode");
const { initializeReactImportHighlighter } = require('./src/core/initializeReactImportHighlighter');
const dependencyCaches = require('./src/utils/getDependencyCache');
const { highlighterSettings } = require('./src/utils/highlighter');

class DependencyCacheHandler {
  constructor(dependencyCache) {
    this.dependencyCache = dependencyCache;
    this.cacheInitialized = false;
  }

  setup() {
    if (!this.dependencyCache) {
      console.error("DependencyCache is not available");
      return;
    }
    this.setupInitializer();
    this.executeInitializer();
    this.subscribeToCacheUpdates();
  }

  setupInitializer() {
    this.dependencyCache.setInitializer(() => {
      if (!this.cacheInitialized) {
        console.log("Initializer called");
        initializeReactImportHighlighter();
        this.cacheInitialized = true;
      }
    });
  }

  executeInitializer() {
    this.dependencyCache.initializer();
  }

  subscribeToCacheUpdates() {
    this.dependencyCache.on('cacheUpdated', () => {
      highlighterSettings.highlightDecorationType.dispose();
      initializeReactImportHighlighter();
    });
  }
}

function activate() {
  const dependencyCache = dependencyCaches.getDependencyCache();
  const handler = new DependencyCacheHandler(dependencyCache);
  handler.setup();
}

function deactivate() {
}

module.exports = { activate, deactivate };

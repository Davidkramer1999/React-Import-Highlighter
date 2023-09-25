const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const EventEmitter = require('events');

class DependencyCache extends EventEmitter {
    constructor() {
        super();
        this.initializer = null;
        this.dependenciesCache = null;
        this.isWatcherSet = false;
    }

    setInitializer(initializer) {
        this.initializer = initializer;
    }

    getDependenciesFromPackageJson = () => {
        const { workspaceFolders } = vscode.workspace;
        const rootPath = workspaceFolders?.[0]?.uri.fsPath;
        if (!rootPath) {
            return this.dependenciesCache;
        }

        const packageJsonPath = path.join(rootPath, './package.json');
        if (!fs.existsSync(packageJsonPath)) {
            return this.dependenciesCache;
        }

        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
        this.dependenciesCache = packageJson.dependencies ?? {};

        if (!this.isWatcherSet) {
            fs.watchFile(packageJsonPath, () => {
                const updatedPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
                const newDependencies = updatedPackageJson.dependencies ?? {};

                if (JSON.stringify(newDependencies) !== JSON.stringify(this.dependenciesCache)) {
                    // Trigger only when dependencies have changed
                    this.dependenciesCache = newDependencies;
                    this.emit('cacheUpdated');

                    if (this.initializer) {
                        this.initializer();
                    }
                } else {
                    return
                }
            });

            this.isWatcherSet = true;
        }
        console.log('this.dependenciesCache2', this.dependenciesCache);
        console.log('Object.keys(this.dependenciesCache)', Object.keys(this.dependenciesCache));
        return Object.keys(this.dependenciesCache);
    };
}

const dependencyCache = new DependencyCache();
module.exports = dependencyCache;

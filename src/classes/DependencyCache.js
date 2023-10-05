const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const EventEmitter = require('events');

const readJsonFile = filePath => JSON.parse(fs.readFileSync(filePath, "utf8"));

const fileExists = filePath => fs.existsSync(filePath);

const jsonEqual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

class DependencyCache extends EventEmitter {
    constructor() {
        super();
        this.initializer = null;
        this.dependenciesCache = {};
        this.isWatcherSet = false;
    }

    setInitializer(initializer) {
        this.initializer = initializer;
    }

    getCustomPackageJsonPath() {
        return vscode.workspace.getConfiguration("reactImportHighlighter").get("packageJsonPath");
    }

    getPackageJsonPath(rootPath, customPackageJsonPath) {
        return customPackageJsonPath ? path.join(rootPath, customPackageJsonPath) : path.join(rootPath, "package.json");
    }

    updateDependenciesCache(packageJsonPath) {
        if (fileExists(packageJsonPath)) {
            const newDependencies = readJsonFile(packageJsonPath).dependencies ?? {};
            if (!jsonEqual(newDependencies, this.dependenciesCache)) {
                this.dependenciesCache = newDependencies;
                this.emit('cacheUpdated');
                this.initializer?.();
            }
        }
    }

    getDependenciesFromPackageJson = () => {
        const { workspaceFolders } = vscode.workspace;
        const rootPath = workspaceFolders?.[0]?.uri.fsPath;

        if (!rootPath) return Object.keys(this.dependenciesCache);

        const packageJsonPath = this.getPackageJsonPath(rootPath, this.getCustomPackageJsonPath());

        this.updateDependenciesCache(packageJsonPath);

        if (!this.isWatcherSet) {
            fs.watchFile(packageJsonPath, () => this.updateDependenciesCache(packageJsonPath));
            this.isWatcherSet = true;
        }

        return Object.keys(this.dependenciesCache);
    };
}

const dependencyCache = new DependencyCache();
module.exports = dependencyCache;

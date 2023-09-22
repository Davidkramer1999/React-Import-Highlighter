const vscode = require("vscode");
const fs = require("fs");
const path = require("path");

class DependencyCache {
    dependenciesCache = null;
    isWatcherSet = false;

    getDependenciesFromPackageJson = () => {
        const { workspaceFolders } = vscode.workspace;
        const rootPath = workspaceFolders?.[0]?.uri.fsPath;
        const config = vscode.workspace.getConfiguration('reactImportHighlighter');
        const packageJsonRelativePath = config.get('packageJsonPath', './package.json');

        if (!rootPath) {
            return this.dependenciesCache;
        }

        const packageJsonPath = path.join(rootPath, packageJsonRelativePath);
        if (!fs.existsSync(packageJsonPath)) {
            return this.dependenciesCache;
        }

        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
        this.dependenciesCache = packageJson.dependencies ? Object.keys(packageJson.dependencies) : [];

        if (!this.isWatcherSet) {
            fs.watchFile(packageJsonPath, () => {
                const updatedPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
                const newDependencies = Object.keys(updatedPackageJson.dependencies ?? {});
                if (JSON.stringify(newDependencies) !== JSON.stringify(this.dependenciesCache)) {
                    this.dependenciesCache = newDependencies;
                }
            });
            this.isWatcherSet = true;
        }
        return this.dependenciesCache;
    };
}
const dependencyCache = new DependencyCache();

module.exports = {
    dependencyCache
};
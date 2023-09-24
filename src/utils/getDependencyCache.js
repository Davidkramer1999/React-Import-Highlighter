const { DependencyCache } = require('../classes/DependencyCache');

const dependencyCache = new DependencyCache();

module.exports = {
    getDependencyCache: () => dependencyCache
};


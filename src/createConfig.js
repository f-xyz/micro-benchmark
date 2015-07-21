function createConfig(defaults, options) {
    var config = defaults;
    Object.keys(options || {}).forEach(function (key) {
        config[key] = options[key];
    });
    return config;
}

module.exports = createConfig;

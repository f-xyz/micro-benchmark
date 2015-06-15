(function (_global, factory) {
    /* istanbul ignore next */
    if (typeof exports === 'object') {
        // CommonJS
        exports = factory();
    } else {
        // Browser globals
        factory(_global.microBenchmark = {});
    }
}(this, function (exports) {

    exports.profileAsync = profileAsync;

    function createConfig(defaults, options) {
        var config = defaults;
        Object.keys(options || {}).forEach(function (key) {
            config[key] = options[key];
        });
        return config;
    }

    function profileAsync(fn, options, cb) {

        if (!(fn instanceof Function)) {
            // todo: output signature
            throw new Error('No function to profile!');
        }

        if (!(cb instanceof Function)) {
            // todo: output signature
            throw new Error('No callback function!');
        }

        var config = createConfig({
            maxOperations: 1e3,
            duration: 100
        }, options);

        var started = Date.now();
        var lastResult,
            elapsed,
            operations = 0;

        var run = function (currentResult) {
            lastResult = currentResult;
            elapsed = Date.now() - started;
            operations++;

            if (elapsed >= config.duration
            ||  operations >= config.maxOperations) {

                var result = {
                    ops: operations / elapsed * 1000,
                    time: elapsed / operations,
                    lastResult: lastResult
                };

                cb(result);

            } else {
                fn(run);
            }
        };

        fn(run);
    }

}));
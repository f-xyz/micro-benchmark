(function (_global, factory) {
    /* istanbul ignore next */
    if (typeof exports === 'object') {
        // CommonJS
        factory(exports);
    } else {
        // Browser globals
        factory(_global.microBenchmark = {});
    }
}(this, function (exports) {

    exports.profile = profile;
    exports.profileAsync = profileAsync;

    function createConfig(defaults, options) {
        var config = defaults;
        Object.keys(options || {}).forEach(function (key) {
            config[key] = options[key];
        });
        return config;
    }

    function profile(fn, options) {

        if (!(fn instanceof Function)) {
            throw new Error('No function to profile!');
        }

        var config = createConfig({
            maxOperations: 1e3,
            duration: 100
        }, options);

        var started = Date.now();
        var lastResult,
            elapsed,
            operations = 0;

        while (true) {

            lastResult = fn();
            elapsed = Date.now() - started;
            operations++;

            if (elapsed >= config.duration
            ||  operations >= config.maxOperations) {
                break;
            }
        }

        return {
            ops: operations / elapsed * 1000,
            time: elapsed / operations,
            lastResult: lastResult
        };
    }

    function profileAsync(fn, options, cb) {

        if (!(fn instanceof Function)) {
            throw new Error('No function to profile!');
        }

        if (!(cb instanceof Function)) {
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
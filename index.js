function configure(defaults, options) {
    var config = defaults;
    Object.keys(options || {}).forEach(function (key) {
        config[key] = options[key];
    });
    return config;
}

function profile(fn, options) {

    if (!fn) {
        throw new Error('No function to profile!');
    }

    var config = configure({
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

    if (!fn) {
        throw new Error('No function to profile!');
    }

    var config = configure({
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

            if (typeof cb == 'function') {
                cb(result);
            }

        } else {
            fn(run);
        }
    };

    fn(run);
}

module.exports = {
    profile: profile,
    profileAsync: profileAsync
};
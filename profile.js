var createConfig = require('./createConfig');

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

module.exports = profile;
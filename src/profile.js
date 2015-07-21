var utils = require('./utils');

module.exports = profile;

function profile(fn, config) {

    if (!(fn instanceof Function)) {
        throw new Error('No function to profile!');
    }

    config = utils.configure(config, {
        limitIterations: 1e3,
        limitTime: 100
    });

    var started = Date.now();
    var lastResult,
        elapsed,
        operations = 0;

    while (true) {

        lastResult = fn();
        elapsed = Date.now() - started;
        operations++;

        if (elapsed >= config.limitTime
        ||  operations >= config.limitIterations) {
            break;
        }
    }

    return {
        ops: operations / elapsed * 1000,
        time: elapsed / operations,
        lastResult: lastResult
    };
}
var util = require('./util');
var profile = require('./profile');
var report = require('./report');

function suite(config) {
    var specs = config.specs;

    var result = specs.map(function (fn) {
        var name = fn.name;
        var result = profile(fn, config);
        return {
            name: name || util.uniqId('suite-'),
            ops: result.ops,
            time: result.time,
            lastResult: result.lastResult
        };
    });

    result.sort(function (a, b) {
        return b.ops - a.ops;
    });

    if (config.report) {
        report(config);
    }

    return result;
}

module.exports = suite;
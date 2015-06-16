var log = require('./log');
var profile = require('./profile');
var profileAsync = require('./profileAsync');

function suite(config) {
    var specs = config.specs;

    var result = specs.map(function (spec) {
        var result = profile(spec.fn, config/*, next() */);
        return {
            name: spec.name,
            ops: result.ops,
            time: result.time,
            lastResult: result.lastResult
        };
    });

    result.sort(function (a, b) {
        return b.ops - a.ops;
    });

    return result;
}

module.exports = suite;
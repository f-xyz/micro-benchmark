var log = require('./log');
var profile = require('./profile');
var profileAsync = require('./profileAsync');

function suite(config) {
    var specs = config.specs;

    //log('started');

    var result = specs.map(function (spec) {
        return {
            name: spec.name,
            result: profile(spec.fn, config/*, next() */)
        };
    });

    result.sort(function (a, b) {
        return b.result.ops - a.result.ops;
    });

    return result;
}

module.exports = suite;
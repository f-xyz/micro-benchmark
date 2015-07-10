var util = require('./util');
var profile = require('./profile');
var report = require('./report');

function extractName(fn) {
    var exclude = ['function', 'return'];
    var words = fn
        .toString()
        .match(/(\w+)/g)
        .filter(function (x) {
            return exclude.indexOf(x.trim()) == -1;
        });
    return words.join(' ');
}

function suite(options) {

    var config = {
        repeat: 1,
        specs: [],
        limitTime: 100,
        limitOps: 1000,
        report: true,
        chartWidth: 10
    };

    if (options) {
        Object.keys(options).forEach(function (key) {
            config[key] = options[key];
        });
    }

    var result = config.specs.map(function (fn) {
        var name = fn.name || extractName(fn) || util.uniqId('func-');
        var repeater = function () {
            for (var i = 0; i < config.repeat; i++) {
                
            }
        };
        var result = profile(fn, config);
        return {
            name: name,
            ops: result.ops,
            time: result.time,
            lastResult: result.lastResult
        };
    });

    result.sort(function (a, b) {
        return b.ops - a.ops;
    });

    if (config.report) {
        console.log(report(result, config));
    }

    return result;
}

module.exports = suite;
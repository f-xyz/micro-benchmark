var utils = require('./utils');
var profile = require('./profile');
var report = require('./report');

module.exports = suite;

function extractFunctionName(fn) {
    var exclude = ['function', 'return'];
    var words = fn
        .toString()
        .replace(/!.*$/, '')
        .match(/([\w]+)/g)
        .filter(function (x) {
            return exclude.indexOf(x.trim()) == -1;
        });
    return utils.crop(words.join(' ').trim(), 20);
}

function suite(specs, config) {
    specs = specs || [];
    config = utils.configure(config, {
        limitTime: 1, // profile
        limitIterations: 1,  // profile
        repeatTimes: 1,
        printReport: false,
        cacheWarmUpIterations: 0,
        chartWidth: 20 // report
    });

    var repeatFn = function (fn, times) {
        return function () {
            for (var i = 0; i < times; i++) {
                fn();
            }
        };
    };

    var suiteResult = specs.map(function (fn) {
        var name = fn.name || extractFunctionName(fn) || utils.uniqId('test-');
        if (config.repeatTimes != 1) {
            fn = repeatFn(fn, config.repeatTimes);
        }
        var result = profile(fn, config);
        return {
            name: name,
            ops: result.ops,
            time: result.time,
            lastResult: result.lastResult
        };
    });

    suiteResult.sort(function (a, b) {
        return b.ops - a.ops;
    });

    if (config.printReport) {
        console.log(report(suiteResult, config));
    }

    return suiteResult;
}
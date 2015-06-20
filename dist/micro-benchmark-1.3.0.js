(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.inherits = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
function createConfig(defaults, options) {
    var config = defaults;
    Object.keys(options || {}).forEach(function (key) {
        config[key] = options[key];
    });
    return config;
}

module.exports = createConfig;

},{}],2:[function(require,module,exports){
var profile = require('./profile');
var profileAsync = require('./profileAsync');
var suite = require('./suite');
var suiteAsync = require('./suiteAsync');
var report = require('./report');
var util = require('./util');

module.exports = {
    profile: profile,
    profileAsync: profileAsync,
    suite: suite,
    suiteAsync: suiteAsync,
    report: report,
    util: util
};

},{"./profile":3,"./profileAsync":4,"./report":5,"./suite":6,"./suiteAsync":7,"./util":8}],3:[function(require,module,exports){
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
},{"./createConfig":1}],4:[function(require,module,exports){
var createConfig = require('./createConfig');

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

module.exports = profileAsync;
},{"./createConfig":1}],5:[function(require,module,exports){
var suite = require('./suite');
var formatNumber = require('./util').formatNumber;
var util = require('./util');

function report(result, options) {

    var getMaxLength = function (key) {
        var headerLength = headers[key].length;

        var column = result.map(util.prop(key));
        var columnLength = column.map(util.prop('length'));
        var maxColumnLength = util.max(columnLength);

        return Math.max(headerLength, maxColumnLength);
    };

    var getChartLength = function (x, maxOps) {
        var chartWidth = config.chartWidth;
        var k = x.original.ops / maxOps;
        if (isNaN(k)) {
            return chartWidth;
        }
        return Math.round(chartWidth * k);
    };

    // init

    var config = {
        chartWidth: 30
    };

    if (typeof options == 'object' ) {
        Object.keys(options).forEach(function (key) {
            config[key] = options[key];
        });
    }

    // column headers
    var headers = {
        name: 'Name',
        ops: 'Operations per second',
        time: 'Average time, ms'
    };

    // max operations per second value
    var maxOps = util.max(result.map(util.prop('ops')));

    // formatting
    result = result.map(function (x) {
        return {
            name: x.name,
            ops: util.formatNumber(x.ops),
            time: util.formatNumber(x.time),
            lastResult: x.lastResult,
            original: x
        };
    });

    // columns' widths
    var nameMaxLength = getMaxLength('name');
    var opsMaxLength = getMaxLength('ops');
    var timeMaxLength = getMaxLength('time');

    // final processing and output
    var rowSeparator = '\n';
    var cellSeparator = '    ';

    var rows = result
        .map(function (x) {
            return [
                util.pad(x.name, nameMaxLength),
                util.pad(x.ops, opsMaxLength),
                util.pad(x.time, timeMaxLength),
                util.repeat('=', getChartLength(x, maxOps)) + '>'
            ].join(cellSeparator);
        });

    headers = [
        util.pad(headers.name, nameMaxLength),
        util.pad(headers.ops, opsMaxLength),
        util.padLeft(headers.time, timeMaxLength)
    ];

    var output = [];
    output.push(headers.join(cellSeparator));
    output.push(rows.join(rowSeparator));

    return output.join('\n');
}

module.exports = report;
},{"./suite":6,"./util":8}],6:[function(require,module,exports){
var profile = require('./profile');
var util = require('./util');

function suite(config) {
    var specs = config.specs;

    var result = specs.map(function (spec) {
        var result = profile(spec.fn, config);
        return {
            name: spec.name || util.uniqId('suite-'),
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
},{"./profile":3,"./util":8}],7:[function(require,module,exports){
var profileAsync = require('./profileAsync');
var util = require('./util');

/**
 * @param config
 * @param cb
 */
function suiteAsync(config, cb) {
    var specs = config.specs;

    (function run(queue, results) {
        var spec = queue.shift();
        if (spec) {
            profileAsync(spec.fn, config, function (result) {
                results.push({
                    name: spec.name || util.uniqId('suite-'),
                    ops: result.ops,
                    time: result.time,
                    lastResult: result.lastResult
                });
                run(queue, results);
            });
        } else {
            cb(results);
        }
    }(specs, []));
}

module.exports = suiteAsync;
},{"./profileAsync":4,"./util":8}],8:[function(require,module,exports){
function formatNumber(n) {
    if (typeof n == 'number') {
        switch (true) {
            case n === 0:
                return '0';
            case n < 1:
                return n.toFixed(2);
            case n < 1000:
                return n.toFixed(0);
            default:
                return n.toExponential(1)
                    .replace(/e\+/, ' x 10^');
        }
    } else {
        return n;
    }
}

//////////////////////////////////////////////////////////////////////////////

function pad(str, n, char) {
    if (char === undefined || char === '') {
        char = ' ';
    }
    if (str.length < n) {
        return pad(str + char, n, char);
    }
    return str;
}

function padLeft(str, n, char) {
    if (char === undefined || char === '') {
        char = ' ';
    }
    if (str.length < n) {
        return padLeft(char + str, n, char);
    }
    return str;
}

//////////////////////////////////////////////////////////////////////////////

function prop(key) {
    return function (x) {
        return x[key];
    };
}

function max(list) {
    return Math.max.apply(Math, list);
}

function repeat(str, times) {
    return new Array(times + 1).join(str);
}

function uniqId(prefix) {
    return prefix + String(uniqId.counter++);
}
uniqId.counter = 0;
uniqId.reset = function (counter) { uniqId.counter = counter };

//////////////////////////////////////////////////////////////////////////////

module.exports = {
    // number
    formatNumber: formatNumber,
    // string
    pad: pad,
    padLeft: padLeft,
    // functional
    prop: prop,
    max: max,
    repeat: repeat,
    uniqId: uniqId
};

},{}]},{},[2])(2)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjcmVhdGVDb25maWcuanMiLCJpbmRleC5qcyIsInByb2ZpbGUuanMiLCJwcm9maWxlQXN5bmMuanMiLCJyZXBvcnQuanMiLCJzdWl0ZS5qcyIsInN1aXRlQXN5bmMuanMiLCJ1dGlsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJmdW5jdGlvbiBjcmVhdGVDb25maWcoZGVmYXVsdHMsIG9wdGlvbnMpIHtcbiAgICB2YXIgY29uZmlnID0gZGVmYXVsdHM7XG4gICAgT2JqZWN0LmtleXMob3B0aW9ucyB8fCB7fSkuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIGNvbmZpZ1trZXldID0gb3B0aW9uc1trZXldO1xuICAgIH0pO1xuICAgIHJldHVybiBjb25maWc7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlQ29uZmlnO1xuIiwidmFyIHByb2ZpbGUgPSByZXF1aXJlKCcuL3Byb2ZpbGUnKTtcbnZhciBwcm9maWxlQXN5bmMgPSByZXF1aXJlKCcuL3Byb2ZpbGVBc3luYycpO1xudmFyIHN1aXRlID0gcmVxdWlyZSgnLi9zdWl0ZScpO1xudmFyIHN1aXRlQXN5bmMgPSByZXF1aXJlKCcuL3N1aXRlQXN5bmMnKTtcbnZhciByZXBvcnQgPSByZXF1aXJlKCcuL3JlcG9ydCcpO1xudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcHJvZmlsZTogcHJvZmlsZSxcbiAgICBwcm9maWxlQXN5bmM6IHByb2ZpbGVBc3luYyxcbiAgICBzdWl0ZTogc3VpdGUsXG4gICAgc3VpdGVBc3luYzogc3VpdGVBc3luYyxcbiAgICByZXBvcnQ6IHJlcG9ydCxcbiAgICB1dGlsOiB1dGlsXG59O1xuIiwidmFyIGNyZWF0ZUNvbmZpZyA9IHJlcXVpcmUoJy4vY3JlYXRlQ29uZmlnJyk7XG5cbmZ1bmN0aW9uIHByb2ZpbGUoZm4sIG9wdGlvbnMpIHtcblxuICAgIGlmICghKGZuIGluc3RhbmNlb2YgRnVuY3Rpb24pKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gZnVuY3Rpb24gdG8gcHJvZmlsZSEnKTtcbiAgICB9XG5cbiAgICB2YXIgY29uZmlnID0gY3JlYXRlQ29uZmlnKHtcbiAgICAgICAgbWF4T3BlcmF0aW9uczogMWUzLFxuICAgICAgICBkdXJhdGlvbjogMTAwXG4gICAgfSwgb3B0aW9ucyk7XG5cbiAgICB2YXIgc3RhcnRlZCA9IERhdGUubm93KCk7XG4gICAgdmFyIGxhc3RSZXN1bHQsXG4gICAgICAgIGVsYXBzZWQsXG4gICAgICAgIG9wZXJhdGlvbnMgPSAwO1xuXG4gICAgd2hpbGUgKHRydWUpIHtcblxuICAgICAgICBsYXN0UmVzdWx0ID0gZm4oKTtcbiAgICAgICAgZWxhcHNlZCA9IERhdGUubm93KCkgLSBzdGFydGVkO1xuICAgICAgICBvcGVyYXRpb25zKys7XG5cbiAgICAgICAgaWYgKGVsYXBzZWQgPj0gY29uZmlnLmR1cmF0aW9uXG4gICAgICAgIHx8ICBvcGVyYXRpb25zID49IGNvbmZpZy5tYXhPcGVyYXRpb25zKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIG9wczogb3BlcmF0aW9ucyAvIGVsYXBzZWQgKiAxMDAwLFxuICAgICAgICB0aW1lOiBlbGFwc2VkIC8gb3BlcmF0aW9ucyxcbiAgICAgICAgbGFzdFJlc3VsdDogbGFzdFJlc3VsdFxuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcHJvZmlsZTsiLCJ2YXIgY3JlYXRlQ29uZmlnID0gcmVxdWlyZSgnLi9jcmVhdGVDb25maWcnKTtcblxuZnVuY3Rpb24gcHJvZmlsZUFzeW5jKGZuLCBvcHRpb25zLCBjYikge1xuXG4gICAgaWYgKCEoZm4gaW5zdGFuY2VvZiBGdW5jdGlvbikpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdObyBmdW5jdGlvbiB0byBwcm9maWxlIScpO1xuICAgIH1cblxuICAgIGlmICghKGNiIGluc3RhbmNlb2YgRnVuY3Rpb24pKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gY2FsbGJhY2sgZnVuY3Rpb24hJyk7XG4gICAgfVxuXG4gICAgdmFyIGNvbmZpZyA9IGNyZWF0ZUNvbmZpZyh7XG4gICAgICAgIG1heE9wZXJhdGlvbnM6IDFlMyxcbiAgICAgICAgZHVyYXRpb246IDEwMFxuICAgIH0sIG9wdGlvbnMpO1xuXG4gICAgdmFyIHN0YXJ0ZWQgPSBEYXRlLm5vdygpO1xuICAgIHZhciBsYXN0UmVzdWx0LFxuICAgICAgICBlbGFwc2VkLFxuICAgICAgICBvcGVyYXRpb25zID0gMDtcblxuICAgIHZhciBydW4gPSBmdW5jdGlvbiAoY3VycmVudFJlc3VsdCkge1xuICAgICAgICBsYXN0UmVzdWx0ID0gY3VycmVudFJlc3VsdDtcbiAgICAgICAgZWxhcHNlZCA9IERhdGUubm93KCkgLSBzdGFydGVkO1xuICAgICAgICBvcGVyYXRpb25zKys7XG5cbiAgICAgICAgaWYgKGVsYXBzZWQgPj0gY29uZmlnLmR1cmF0aW9uXG4gICAgICAgIHx8ICBvcGVyYXRpb25zID49IGNvbmZpZy5tYXhPcGVyYXRpb25zKSB7XG5cbiAgICAgICAgICAgIHZhciByZXN1bHQgPSB7XG4gICAgICAgICAgICAgICAgb3BzOiBvcGVyYXRpb25zIC8gZWxhcHNlZCAqIDEwMDAsXG4gICAgICAgICAgICAgICAgdGltZTogZWxhcHNlZCAvIG9wZXJhdGlvbnMsXG4gICAgICAgICAgICAgICAgbGFzdFJlc3VsdDogbGFzdFJlc3VsdFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgY2IocmVzdWx0KTtcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZm4ocnVuKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBmbihydW4pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHByb2ZpbGVBc3luYzsiLCJ2YXIgc3VpdGUgPSByZXF1aXJlKCcuL3N1aXRlJyk7XG52YXIgZm9ybWF0TnVtYmVyID0gcmVxdWlyZSgnLi91dGlsJykuZm9ybWF0TnVtYmVyO1xudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuZnVuY3Rpb24gcmVwb3J0KHJlc3VsdCwgb3B0aW9ucykge1xuXG4gICAgdmFyIGdldE1heExlbmd0aCA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgdmFyIGhlYWRlckxlbmd0aCA9IGhlYWRlcnNba2V5XS5sZW5ndGg7XG5cbiAgICAgICAgdmFyIGNvbHVtbiA9IHJlc3VsdC5tYXAodXRpbC5wcm9wKGtleSkpO1xuICAgICAgICB2YXIgY29sdW1uTGVuZ3RoID0gY29sdW1uLm1hcCh1dGlsLnByb3AoJ2xlbmd0aCcpKTtcbiAgICAgICAgdmFyIG1heENvbHVtbkxlbmd0aCA9IHV0aWwubWF4KGNvbHVtbkxlbmd0aCk7XG5cbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KGhlYWRlckxlbmd0aCwgbWF4Q29sdW1uTGVuZ3RoKTtcbiAgICB9O1xuXG4gICAgdmFyIGdldENoYXJ0TGVuZ3RoID0gZnVuY3Rpb24gKHgsIG1heE9wcykge1xuICAgICAgICB2YXIgY2hhcnRXaWR0aCA9IGNvbmZpZy5jaGFydFdpZHRoO1xuICAgICAgICB2YXIgayA9IHgub3JpZ2luYWwub3BzIC8gbWF4T3BzO1xuICAgICAgICBpZiAoaXNOYU4oaykpIHtcbiAgICAgICAgICAgIHJldHVybiBjaGFydFdpZHRoO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBNYXRoLnJvdW5kKGNoYXJ0V2lkdGggKiBrKTtcbiAgICB9O1xuXG4gICAgLy8gaW5pdFxuXG4gICAgdmFyIGNvbmZpZyA9IHtcbiAgICAgICAgY2hhcnRXaWR0aDogMzBcbiAgICB9O1xuXG4gICAgaWYgKHR5cGVvZiBvcHRpb25zID09ICdvYmplY3QnICkge1xuICAgICAgICBPYmplY3Qua2V5cyhvcHRpb25zKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgICAgIGNvbmZpZ1trZXldID0gb3B0aW9uc1trZXldO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBjb2x1bW4gaGVhZGVyc1xuICAgIHZhciBoZWFkZXJzID0ge1xuICAgICAgICBuYW1lOiAnTmFtZScsXG4gICAgICAgIG9wczogJ09wZXJhdGlvbnMgcGVyIHNlY29uZCcsXG4gICAgICAgIHRpbWU6ICdBdmVyYWdlIHRpbWUsIG1zJ1xuICAgIH07XG5cbiAgICAvLyBtYXggb3BlcmF0aW9ucyBwZXIgc2Vjb25kIHZhbHVlXG4gICAgdmFyIG1heE9wcyA9IHV0aWwubWF4KHJlc3VsdC5tYXAodXRpbC5wcm9wKCdvcHMnKSkpO1xuXG4gICAgLy8gZm9ybWF0dGluZ1xuICAgIHJlc3VsdCA9IHJlc3VsdC5tYXAoZnVuY3Rpb24gKHgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5hbWU6IHgubmFtZSxcbiAgICAgICAgICAgIG9wczogdXRpbC5mb3JtYXROdW1iZXIoeC5vcHMpLFxuICAgICAgICAgICAgdGltZTogdXRpbC5mb3JtYXROdW1iZXIoeC50aW1lKSxcbiAgICAgICAgICAgIGxhc3RSZXN1bHQ6IHgubGFzdFJlc3VsdCxcbiAgICAgICAgICAgIG9yaWdpbmFsOiB4XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICAvLyBjb2x1bW5zJyB3aWR0aHNcbiAgICB2YXIgbmFtZU1heExlbmd0aCA9IGdldE1heExlbmd0aCgnbmFtZScpO1xuICAgIHZhciBvcHNNYXhMZW5ndGggPSBnZXRNYXhMZW5ndGgoJ29wcycpO1xuICAgIHZhciB0aW1lTWF4TGVuZ3RoID0gZ2V0TWF4TGVuZ3RoKCd0aW1lJyk7XG5cbiAgICAvLyBmaW5hbCBwcm9jZXNzaW5nIGFuZCBvdXRwdXRcbiAgICB2YXIgcm93U2VwYXJhdG9yID0gJ1xcbic7XG4gICAgdmFyIGNlbGxTZXBhcmF0b3IgPSAnICAgICc7XG5cbiAgICB2YXIgcm93cyA9IHJlc3VsdFxuICAgICAgICAubWFwKGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICByZXR1cm4gW1xuICAgICAgICAgICAgICAgIHV0aWwucGFkKHgubmFtZSwgbmFtZU1heExlbmd0aCksXG4gICAgICAgICAgICAgICAgdXRpbC5wYWQoeC5vcHMsIG9wc01heExlbmd0aCksXG4gICAgICAgICAgICAgICAgdXRpbC5wYWQoeC50aW1lLCB0aW1lTWF4TGVuZ3RoKSxcbiAgICAgICAgICAgICAgICB1dGlsLnJlcGVhdCgnPScsIGdldENoYXJ0TGVuZ3RoKHgsIG1heE9wcykpICsgJz4nXG4gICAgICAgICAgICBdLmpvaW4oY2VsbFNlcGFyYXRvcik7XG4gICAgICAgIH0pO1xuXG4gICAgaGVhZGVycyA9IFtcbiAgICAgICAgdXRpbC5wYWQoaGVhZGVycy5uYW1lLCBuYW1lTWF4TGVuZ3RoKSxcbiAgICAgICAgdXRpbC5wYWQoaGVhZGVycy5vcHMsIG9wc01heExlbmd0aCksXG4gICAgICAgIHV0aWwucGFkTGVmdChoZWFkZXJzLnRpbWUsIHRpbWVNYXhMZW5ndGgpXG4gICAgXTtcblxuICAgIHZhciBvdXRwdXQgPSBbXTtcbiAgICBvdXRwdXQucHVzaChoZWFkZXJzLmpvaW4oY2VsbFNlcGFyYXRvcikpO1xuICAgIG91dHB1dC5wdXNoKHJvd3Muam9pbihyb3dTZXBhcmF0b3IpKTtcblxuICAgIHJldHVybiBvdXRwdXQuam9pbignXFxuJyk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcmVwb3J0OyIsInZhciBwcm9maWxlID0gcmVxdWlyZSgnLi9wcm9maWxlJyk7XG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG5mdW5jdGlvbiBzdWl0ZShjb25maWcpIHtcbiAgICB2YXIgc3BlY3MgPSBjb25maWcuc3BlY3M7XG5cbiAgICB2YXIgcmVzdWx0ID0gc3BlY3MubWFwKGZ1bmN0aW9uIChzcGVjKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBwcm9maWxlKHNwZWMuZm4sIGNvbmZpZyk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBuYW1lOiBzcGVjLm5hbWUgfHwgdXRpbC51bmlxSWQoJ3N1aXRlLScpLFxuICAgICAgICAgICAgb3BzOiByZXN1bHQub3BzLFxuICAgICAgICAgICAgdGltZTogcmVzdWx0LnRpbWUsXG4gICAgICAgICAgICBsYXN0UmVzdWx0OiByZXN1bHQubGFzdFJlc3VsdFxuICAgICAgICB9O1xuICAgIH0pO1xuXG4gICAgcmVzdWx0LnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIGIub3BzIC0gYS5vcHM7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHN1aXRlOyIsInZhciBwcm9maWxlQXN5bmMgPSByZXF1aXJlKCcuL3Byb2ZpbGVBc3luYycpO1xudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuLyoqXG4gKiBAcGFyYW0gY29uZmlnXG4gKiBAcGFyYW0gY2JcbiAqL1xuZnVuY3Rpb24gc3VpdGVBc3luYyhjb25maWcsIGNiKSB7XG4gICAgdmFyIHNwZWNzID0gY29uZmlnLnNwZWNzO1xuXG4gICAgKGZ1bmN0aW9uIHJ1bihxdWV1ZSwgcmVzdWx0cykge1xuICAgICAgICB2YXIgc3BlYyA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgIGlmIChzcGVjKSB7XG4gICAgICAgICAgICBwcm9maWxlQXN5bmMoc3BlYy5mbiwgY29uZmlnLCBmdW5jdGlvbiAocmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogc3BlYy5uYW1lIHx8IHV0aWwudW5pcUlkKCdzdWl0ZS0nKSxcbiAgICAgICAgICAgICAgICAgICAgb3BzOiByZXN1bHQub3BzLFxuICAgICAgICAgICAgICAgICAgICB0aW1lOiByZXN1bHQudGltZSxcbiAgICAgICAgICAgICAgICAgICAgbGFzdFJlc3VsdDogcmVzdWx0Lmxhc3RSZXN1bHRcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBydW4ocXVldWUsIHJlc3VsdHMpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYihyZXN1bHRzKTtcbiAgICAgICAgfVxuICAgIH0oc3BlY3MsIFtdKSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc3VpdGVBc3luYzsiLCJmdW5jdGlvbiBmb3JtYXROdW1iZXIobikge1xuICAgIGlmICh0eXBlb2YgbiA9PSAnbnVtYmVyJykge1xuICAgICAgICBzd2l0Y2ggKHRydWUpIHtcbiAgICAgICAgICAgIGNhc2UgbiA9PT0gMDpcbiAgICAgICAgICAgICAgICByZXR1cm4gJzAnO1xuICAgICAgICAgICAgY2FzZSBuIDwgMTpcbiAgICAgICAgICAgICAgICByZXR1cm4gbi50b0ZpeGVkKDIpO1xuICAgICAgICAgICAgY2FzZSBuIDwgMTAwMDpcbiAgICAgICAgICAgICAgICByZXR1cm4gbi50b0ZpeGVkKDApO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXR1cm4gbi50b0V4cG9uZW50aWFsKDEpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9lXFwrLywgJyB4IDEwXicpO1xuICAgICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIG47XG4gICAgfVxufVxuXG4vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy9cblxuZnVuY3Rpb24gcGFkKHN0ciwgbiwgY2hhcikge1xuICAgIGlmIChjaGFyID09PSB1bmRlZmluZWQgfHwgY2hhciA9PT0gJycpIHtcbiAgICAgICAgY2hhciA9ICcgJztcbiAgICB9XG4gICAgaWYgKHN0ci5sZW5ndGggPCBuKSB7XG4gICAgICAgIHJldHVybiBwYWQoc3RyICsgY2hhciwgbiwgY2hhcik7XG4gICAgfVxuICAgIHJldHVybiBzdHI7XG59XG5cbmZ1bmN0aW9uIHBhZExlZnQoc3RyLCBuLCBjaGFyKSB7XG4gICAgaWYgKGNoYXIgPT09IHVuZGVmaW5lZCB8fCBjaGFyID09PSAnJykge1xuICAgICAgICBjaGFyID0gJyAnO1xuICAgIH1cbiAgICBpZiAoc3RyLmxlbmd0aCA8IG4pIHtcbiAgICAgICAgcmV0dXJuIHBhZExlZnQoY2hhciArIHN0ciwgbiwgY2hhcik7XG4gICAgfVxuICAgIHJldHVybiBzdHI7XG59XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5mdW5jdGlvbiBwcm9wKGtleSkge1xuICAgIHJldHVybiBmdW5jdGlvbiAoeCkge1xuICAgICAgICByZXR1cm4geFtrZXldO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIG1heChsaXN0KSB7XG4gICAgcmV0dXJuIE1hdGgubWF4LmFwcGx5KE1hdGgsIGxpc3QpO1xufVxuXG5mdW5jdGlvbiByZXBlYXQoc3RyLCB0aW1lcykge1xuICAgIHJldHVybiBuZXcgQXJyYXkodGltZXMgKyAxKS5qb2luKHN0cik7XG59XG5cbmZ1bmN0aW9uIHVuaXFJZChwcmVmaXgpIHtcbiAgICByZXR1cm4gcHJlZml4ICsgU3RyaW5nKHVuaXFJZC5jb3VudGVyKyspO1xufVxudW5pcUlkLmNvdW50ZXIgPSAwO1xudW5pcUlkLnJlc2V0ID0gZnVuY3Rpb24gKGNvdW50ZXIpIHsgdW5pcUlkLmNvdW50ZXIgPSBjb3VudGVyIH07XG5cbi8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICAvLyBudW1iZXJcbiAgICBmb3JtYXROdW1iZXI6IGZvcm1hdE51bWJlcixcbiAgICAvLyBzdHJpbmdcbiAgICBwYWQ6IHBhZCxcbiAgICBwYWRMZWZ0OiBwYWRMZWZ0LFxuICAgIC8vIGZ1bmN0aW9uYWxcbiAgICBwcm9wOiBwcm9wLFxuICAgIG1heDogbWF4LFxuICAgIHJlcGVhdDogcmVwZWF0LFxuICAgIHVuaXFJZDogdW5pcUlkXG59O1xuIl19

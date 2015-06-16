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

module.exports = {
    profile: profile,
    profileAsync: profileAsync,
    suite: suite
};

},{"./profile":3,"./profileAsync":4,"./suite":5}],3:[function(require,module,exports){
var createConfig = require('./createConfig');

function profile(fn, options) {

    if (!(fn instanceof Function)) {
        // todo: output signature
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
        // todo: output signature
        throw new Error('No function to profile!');
    }

    if (!(cb instanceof Function)) {
        // todo: output signature
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
var profile = require('./profile');
var profileAsync = require('./profileAsync');

function suite(config) {
    var specs = config.specs;
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
},{"./profile":3,"./profileAsync":4}]},{},[2])(2)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjcmVhdGVDb25maWcuanMiLCJpbmRleC5qcyIsInByb2ZpbGUuanMiLCJwcm9maWxlQXN5bmMuanMiLCJzdWl0ZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJmdW5jdGlvbiBjcmVhdGVDb25maWcoZGVmYXVsdHMsIG9wdGlvbnMpIHtcbiAgICB2YXIgY29uZmlnID0gZGVmYXVsdHM7XG4gICAgT2JqZWN0LmtleXMob3B0aW9ucyB8fCB7fSkuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgICAgIGNvbmZpZ1trZXldID0gb3B0aW9uc1trZXldO1xuICAgIH0pO1xuICAgIHJldHVybiBjb25maWc7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlQ29uZmlnO1xuIiwidmFyIHByb2ZpbGUgPSByZXF1aXJlKCcuL3Byb2ZpbGUnKTtcbnZhciBwcm9maWxlQXN5bmMgPSByZXF1aXJlKCcuL3Byb2ZpbGVBc3luYycpO1xudmFyIHN1aXRlID0gcmVxdWlyZSgnLi9zdWl0ZScpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBwcm9maWxlOiBwcm9maWxlLFxuICAgIHByb2ZpbGVBc3luYzogcHJvZmlsZUFzeW5jLFxuICAgIHN1aXRlOiBzdWl0ZVxufTtcbiIsInZhciBjcmVhdGVDb25maWcgPSByZXF1aXJlKCcuL2NyZWF0ZUNvbmZpZycpO1xuXG5mdW5jdGlvbiBwcm9maWxlKGZuLCBvcHRpb25zKSB7XG5cbiAgICBpZiAoIShmbiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkge1xuICAgICAgICAvLyB0b2RvOiBvdXRwdXQgc2lnbmF0dXJlXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gZnVuY3Rpb24gdG8gcHJvZmlsZSEnKTtcbiAgICB9XG5cbiAgICB2YXIgY29uZmlnID0gY3JlYXRlQ29uZmlnKHtcbiAgICAgICAgbWF4T3BlcmF0aW9uczogMWUzLFxuICAgICAgICBkdXJhdGlvbjogMTAwXG4gICAgfSwgb3B0aW9ucyk7XG5cbiAgICB2YXIgc3RhcnRlZCA9IERhdGUubm93KCk7XG4gICAgdmFyIGxhc3RSZXN1bHQsXG4gICAgICAgIGVsYXBzZWQsXG4gICAgICAgIG9wZXJhdGlvbnMgPSAwO1xuXG4gICAgd2hpbGUgKHRydWUpIHtcblxuICAgICAgICBsYXN0UmVzdWx0ID0gZm4oKTtcbiAgICAgICAgZWxhcHNlZCA9IERhdGUubm93KCkgLSBzdGFydGVkO1xuICAgICAgICBvcGVyYXRpb25zKys7XG5cbiAgICAgICAgaWYgKGVsYXBzZWQgPj0gY29uZmlnLmR1cmF0aW9uXG4gICAgICAgIHx8ICBvcGVyYXRpb25zID49IGNvbmZpZy5tYXhPcGVyYXRpb25zKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIG9wczogb3BlcmF0aW9ucyAvIGVsYXBzZWQgKiAxMDAwLFxuICAgICAgICB0aW1lOiBlbGFwc2VkIC8gb3BlcmF0aW9ucyxcbiAgICAgICAgbGFzdFJlc3VsdDogbGFzdFJlc3VsdFxuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcHJvZmlsZTsiLCJ2YXIgY3JlYXRlQ29uZmlnID0gcmVxdWlyZSgnLi9jcmVhdGVDb25maWcnKTtcblxuZnVuY3Rpb24gcHJvZmlsZUFzeW5jKGZuLCBvcHRpb25zLCBjYikge1xuXG4gICAgaWYgKCEoZm4gaW5zdGFuY2VvZiBGdW5jdGlvbikpIHtcbiAgICAgICAgLy8gdG9kbzogb3V0cHV0IHNpZ25hdHVyZVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGZ1bmN0aW9uIHRvIHByb2ZpbGUhJyk7XG4gICAgfVxuXG4gICAgaWYgKCEoY2IgaW5zdGFuY2VvZiBGdW5jdGlvbikpIHtcbiAgICAgICAgLy8gdG9kbzogb3V0cHV0IHNpZ25hdHVyZVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGNhbGxiYWNrIGZ1bmN0aW9uIScpO1xuICAgIH1cblxuICAgIHZhciBjb25maWcgPSBjcmVhdGVDb25maWcoe1xuICAgICAgICBtYXhPcGVyYXRpb25zOiAxZTMsXG4gICAgICAgIGR1cmF0aW9uOiAxMDBcbiAgICB9LCBvcHRpb25zKTtcblxuICAgIHZhciBzdGFydGVkID0gRGF0ZS5ub3coKTtcbiAgICB2YXIgbGFzdFJlc3VsdCxcbiAgICAgICAgZWxhcHNlZCxcbiAgICAgICAgb3BlcmF0aW9ucyA9IDA7XG5cbiAgICB2YXIgcnVuID0gZnVuY3Rpb24gKGN1cnJlbnRSZXN1bHQpIHtcbiAgICAgICAgbGFzdFJlc3VsdCA9IGN1cnJlbnRSZXN1bHQ7XG4gICAgICAgIGVsYXBzZWQgPSBEYXRlLm5vdygpIC0gc3RhcnRlZDtcbiAgICAgICAgb3BlcmF0aW9ucysrO1xuXG4gICAgICAgIGlmIChlbGFwc2VkID49IGNvbmZpZy5kdXJhdGlvblxuICAgICAgICB8fCAgb3BlcmF0aW9ucyA+PSBjb25maWcubWF4T3BlcmF0aW9ucykge1xuXG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICAgICAgICAgIG9wczogb3BlcmF0aW9ucyAvIGVsYXBzZWQgKiAxMDAwLFxuICAgICAgICAgICAgICAgIHRpbWU6IGVsYXBzZWQgLyBvcGVyYXRpb25zLFxuICAgICAgICAgICAgICAgIGxhc3RSZXN1bHQ6IGxhc3RSZXN1bHRcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNiKHJlc3VsdCk7XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZuKHJ1bik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZm4ocnVuKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBwcm9maWxlQXN5bmM7IiwidmFyIHByb2ZpbGUgPSByZXF1aXJlKCcuL3Byb2ZpbGUnKTtcbnZhciBwcm9maWxlQXN5bmMgPSByZXF1aXJlKCcuL3Byb2ZpbGVBc3luYycpO1xuXG5mdW5jdGlvbiBzdWl0ZShjb25maWcpIHtcbiAgICB2YXIgc3BlY3MgPSBjb25maWcuc3BlY3M7XG4gICAgdmFyIHJlc3VsdCA9IHNwZWNzLm1hcChmdW5jdGlvbiAoc3BlYykge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbmFtZTogc3BlYy5uYW1lLFxuICAgICAgICAgICAgcmVzdWx0OiBwcm9maWxlKHNwZWMuZm4sIGNvbmZpZy8qLCBuZXh0KCkgKi8pXG4gICAgICAgIH07XG4gICAgfSk7XG4gICAgcmVzdWx0LnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICAgICAgcmV0dXJuIGIucmVzdWx0Lm9wcyAtIGEucmVzdWx0Lm9wcztcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHN1aXRlOyJdfQ==

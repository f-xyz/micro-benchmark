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

},{"./profile":4,"./profileAsync":5,"./suite":6}],3:[function(require,module,exports){
module.exports = console.log.bind(console);
},{}],4:[function(require,module,exports){
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
},{"./createConfig":1}],5:[function(require,module,exports){
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
},{"./createConfig":1}],6:[function(require,module,exports){
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
},{"./log":3,"./profile":4,"./profileAsync":5}]},{},[2])(2)
});
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJjcmVhdGVDb25maWcuanMiLCJpbmRleC5qcyIsImxvZy5qcyIsInByb2ZpbGUuanMiLCJwcm9maWxlQXN5bmMuanMiLCJzdWl0ZS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1RBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImZ1bmN0aW9uIGNyZWF0ZUNvbmZpZyhkZWZhdWx0cywgb3B0aW9ucykge1xuICAgIHZhciBjb25maWcgPSBkZWZhdWx0cztcbiAgICBPYmplY3Qua2V5cyhvcHRpb25zIHx8IHt9KS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICAgICAgY29uZmlnW2tleV0gPSBvcHRpb25zW2tleV07XG4gICAgfSk7XG4gICAgcmV0dXJuIGNvbmZpZztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVDb25maWc7XG4iLCJ2YXIgcHJvZmlsZSA9IHJlcXVpcmUoJy4vcHJvZmlsZScpO1xudmFyIHByb2ZpbGVBc3luYyA9IHJlcXVpcmUoJy4vcHJvZmlsZUFzeW5jJyk7XG52YXIgc3VpdGUgPSByZXF1aXJlKCcuL3N1aXRlJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHByb2ZpbGU6IHByb2ZpbGUsXG4gICAgcHJvZmlsZUFzeW5jOiBwcm9maWxlQXN5bmMsXG4gICAgc3VpdGU6IHN1aXRlXG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBjb25zb2xlLmxvZy5iaW5kKGNvbnNvbGUpOyIsInZhciBjcmVhdGVDb25maWcgPSByZXF1aXJlKCcuL2NyZWF0ZUNvbmZpZycpO1xuXG5mdW5jdGlvbiBwcm9maWxlKGZuLCBvcHRpb25zKSB7XG5cbiAgICBpZiAoIShmbiBpbnN0YW5jZW9mIEZ1bmN0aW9uKSkge1xuICAgICAgICAvLyB0b2RvOiBvdXRwdXQgc2lnbmF0dXJlXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignTm8gZnVuY3Rpb24gdG8gcHJvZmlsZSEnKTtcbiAgICB9XG5cbiAgICB2YXIgY29uZmlnID0gY3JlYXRlQ29uZmlnKHtcbiAgICAgICAgbWF4T3BlcmF0aW9uczogMWUzLFxuICAgICAgICBkdXJhdGlvbjogMTAwXG4gICAgfSwgb3B0aW9ucyk7XG5cbiAgICB2YXIgc3RhcnRlZCA9IERhdGUubm93KCk7XG4gICAgdmFyIGxhc3RSZXN1bHQsXG4gICAgICAgIGVsYXBzZWQsXG4gICAgICAgIG9wZXJhdGlvbnMgPSAwO1xuXG4gICAgd2hpbGUgKHRydWUpIHtcblxuICAgICAgICBsYXN0UmVzdWx0ID0gZm4oKTtcbiAgICAgICAgZWxhcHNlZCA9IERhdGUubm93KCkgLSBzdGFydGVkO1xuICAgICAgICBvcGVyYXRpb25zKys7XG5cbiAgICAgICAgaWYgKGVsYXBzZWQgPj0gY29uZmlnLmR1cmF0aW9uXG4gICAgICAgIHx8ICBvcGVyYXRpb25zID49IGNvbmZpZy5tYXhPcGVyYXRpb25zKSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIG9wczogb3BlcmF0aW9ucyAvIGVsYXBzZWQgKiAxMDAwLFxuICAgICAgICB0aW1lOiBlbGFwc2VkIC8gb3BlcmF0aW9ucyxcbiAgICAgICAgbGFzdFJlc3VsdDogbGFzdFJlc3VsdFxuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gcHJvZmlsZTsiLCJ2YXIgY3JlYXRlQ29uZmlnID0gcmVxdWlyZSgnLi9jcmVhdGVDb25maWcnKTtcblxuZnVuY3Rpb24gcHJvZmlsZUFzeW5jKGZuLCBvcHRpb25zLCBjYikge1xuXG4gICAgaWYgKCEoZm4gaW5zdGFuY2VvZiBGdW5jdGlvbikpIHtcbiAgICAgICAgLy8gdG9kbzogb3V0cHV0IHNpZ25hdHVyZVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGZ1bmN0aW9uIHRvIHByb2ZpbGUhJyk7XG4gICAgfVxuXG4gICAgaWYgKCEoY2IgaW5zdGFuY2VvZiBGdW5jdGlvbikpIHtcbiAgICAgICAgLy8gdG9kbzogb3V0cHV0IHNpZ25hdHVyZVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGNhbGxiYWNrIGZ1bmN0aW9uIScpO1xuICAgIH1cblxuICAgIHZhciBjb25maWcgPSBjcmVhdGVDb25maWcoe1xuICAgICAgICBtYXhPcGVyYXRpb25zOiAxZTMsXG4gICAgICAgIGR1cmF0aW9uOiAxMDBcbiAgICB9LCBvcHRpb25zKTtcblxuICAgIHZhciBzdGFydGVkID0gRGF0ZS5ub3coKTtcbiAgICB2YXIgbGFzdFJlc3VsdCxcbiAgICAgICAgZWxhcHNlZCxcbiAgICAgICAgb3BlcmF0aW9ucyA9IDA7XG5cbiAgICB2YXIgcnVuID0gZnVuY3Rpb24gKGN1cnJlbnRSZXN1bHQpIHtcbiAgICAgICAgbGFzdFJlc3VsdCA9IGN1cnJlbnRSZXN1bHQ7XG4gICAgICAgIGVsYXBzZWQgPSBEYXRlLm5vdygpIC0gc3RhcnRlZDtcbiAgICAgICAgb3BlcmF0aW9ucysrO1xuXG4gICAgICAgIGlmIChlbGFwc2VkID49IGNvbmZpZy5kdXJhdGlvblxuICAgICAgICB8fCAgb3BlcmF0aW9ucyA+PSBjb25maWcubWF4T3BlcmF0aW9ucykge1xuXG4gICAgICAgICAgICB2YXIgcmVzdWx0ID0ge1xuICAgICAgICAgICAgICAgIG9wczogb3BlcmF0aW9ucyAvIGVsYXBzZWQgKiAxMDAwLFxuICAgICAgICAgICAgICAgIHRpbWU6IGVsYXBzZWQgLyBvcGVyYXRpb25zLFxuICAgICAgICAgICAgICAgIGxhc3RSZXN1bHQ6IGxhc3RSZXN1bHRcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNiKHJlc3VsdCk7XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZuKHJ1bik7XG4gICAgICAgIH1cbiAgICB9O1xuXG4gICAgZm4ocnVuKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBwcm9maWxlQXN5bmM7IiwidmFyIGxvZyA9IHJlcXVpcmUoJy4vbG9nJyk7XG52YXIgcHJvZmlsZSA9IHJlcXVpcmUoJy4vcHJvZmlsZScpO1xudmFyIHByb2ZpbGVBc3luYyA9IHJlcXVpcmUoJy4vcHJvZmlsZUFzeW5jJyk7XG5cbmZ1bmN0aW9uIHN1aXRlKGNvbmZpZykge1xuICAgIHZhciBzcGVjcyA9IGNvbmZpZy5zcGVjcztcblxuICAgIHZhciByZXN1bHQgPSBzcGVjcy5tYXAoZnVuY3Rpb24gKHNwZWMpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHByb2ZpbGUoc3BlYy5mbiwgY29uZmlnLyosIG5leHQoKSAqLyk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBuYW1lOiBzcGVjLm5hbWUsXG4gICAgICAgICAgICBvcHM6IHJlc3VsdC5vcHMsXG4gICAgICAgICAgICB0aW1lOiByZXN1bHQudGltZSxcbiAgICAgICAgICAgIGxhc3RSZXN1bHQ6IHJlc3VsdC5sYXN0UmVzdWx0XG4gICAgICAgIH07XG4gICAgfSk7XG5cbiAgICByZXN1bHQuc29ydChmdW5jdGlvbiAoYSwgYikge1xuICAgICAgICByZXR1cm4gYi5vcHMgLSBhLm9wcztcbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc3VpdGU7Il19

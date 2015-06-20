var profileAsync = require('./profileAsync');

function suiteAsync(config, cb) {
    var specs = config.specs;

    (function run(queue, results) {
        var spec = queue.shift();
        if (spec) {
            profileAsync(spec.fn, config, function (result) {
                results.push({
                    name: spec.name,
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
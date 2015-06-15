(function (_global, factory) {
    /* istanbul ignore next */
    if (typeof exports === 'object') {
        // CommonJS
        factory(exports, require('./index'));
    } else {
        // Browser globals
        _global.microBenchmark
            .suite = factory(_global.microBenchmark);
    }
}(this, function (microBenchmark) {

    return function suite(config) {
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

}));
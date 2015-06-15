(function (_global, factory) {
    /* istanbul ignore next */
    if (typeof exports === 'object') {
        // CommonJS
        factory(exports,
            require('./profile'),
            require('./profileAsync'));
    } else {
        // Browser globals
        factory(_global.microBenchmark = {});
    }
}(this, function (exports, profile, profileAsync) {

    exports.profile = profile.profile;
    exports.profileAsync = profileAsync.profileAsync;

}));
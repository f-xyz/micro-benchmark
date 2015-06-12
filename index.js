'use strict';

function profile(fn, config) {

    var maxOperations = config.maxOperations || 1e3;
    var duration = config.duration || 100;

    var started = Date.now();
    var operations = 0, elapsed;

    while (true) {

        fn();
        operations++;
        elapsed = Date.now() - started;

        if (elapsed > duration || operations > maxOperations) {
            break;
        }
    }

    return {
        fps: operations / elapsed * 1000,
        time: elapsed / operations
    };
};

function report (name, p) {
    var time = p.time.toFixed(2) + ' ms';
    var fps = p.fps.toFixed(2) + ' ops';
    return name + ' -> ' + time + ', ' + fps;
}

module.exports = {
    profile: profile,
    report: report
};
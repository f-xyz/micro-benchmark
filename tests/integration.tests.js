const testFn1 = (input) =>
    input
        .map((_, i, input) => [input[i-2], input[i-1], input[i]])
        .slice(2);

const testFn2 = (input) => {
    let result = [];
    for (let i = 2; i < input.length; ++i) {
        result.push([input[i-2], input[i-1], input[i]]);
    }
    return result;
};

const testFn3 = (input) => {
    let result = new Array(input.length);
    for (let i = 2; i < input.length; ++i) {
        result[i-2] = [input[i-2], input[i-1], input[i]];
    }
    return result;
};

var mb = require('../src/suite');
var profile = require('../src/profile');
var utils = require('../src/utils');

describe('report example', function () {
    it('report example', function () {

        var input = new Array(1e0).join('0123456789abcdef');
        var N = 1e4;

        mb([
            () => utils.pad(input, N),
            () => utils.pad(input, N),
            () => utils.pad(input, N),
            () => utils.padLeft(input, N),
            () => utils.padLeft(input, N),
            () => utils.padLeft(input, N)
        ], {
            limitTime: 20,
            limitIterations: 1000,
            repeatTimes: 1,
            printReport: true,
            cacheWarmUpIterations: 0,
            chartWidth: 20
        });

    });
});
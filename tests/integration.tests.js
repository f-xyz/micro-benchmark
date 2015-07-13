const makeItem = (_, i, input) =>
    [input[i-2], input[i-1], input[i]];

const testFn1 = (input) =>
    input
        .map(makeItem)
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

var mb = require('../suite');
var profile = require('../profile');
var utils = require('../utils');

describe('report example', function () {
    it('report example', function () {
        var input = new Array(1e0).join('0123456789abcdef');

        mb([
            () => utils.pad(input, 200000),
            () => utils.padLeft(input, 100000)
        ], {
            limitTime: 1,
            limitIterations: 1,
            repeatTimes: 1,
            printReport: true,
            cacheWarmUpIterations: 0,
            chartWidth: 20
        });

    });
});
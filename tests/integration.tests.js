
const makeItem = (_, i, input) => [input[i-2], input[i-1], input[i]];

const compile = (input) =>
    input
        .map(makeItem)
        .slice(2);

const compile2 = (input) => {
    let result = [];
    for (let i = 2; i < input.length; ++i) {
        result.push([input[i-2], input[i-1], input[i]]);
    }
    return result;
};

var mb = require('../suite');
var input = new Array(1000);
mb({
    warmUpOps: 1000,
    report: true,
    repeat: 10,
    limitTime: 100,
    limitOps: 1000,
    chartWidth: 20,
    specs: [
        () => compile(input),
        () => compile2(input)
    ]
});
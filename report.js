var suite = require('./suite');
var formatNumber = require('./util').formatNumber;
var util = require('./util');
var log = require('./log');

function max(list) {
    return Math.max.apply(Math, list);
}

function compose(f, g) {
    return function (x) {
        return f(g(x));
    };
}

function getColumnMaxLength(collection, key) {
    var column = util.getColumn(collection, key);
    return max(column.map(util.prop('length')));
}

var table = [{
    a: 1,
    b: 2
}, {
    a: 2,
    b: 3
}];

function repeat(str, times) {
    return Array(times + 1).join(str);
}

describe('repeat()', function () {
    it('repeats string', function () {
        repeat('x', 3).should.eq('xxx');
    });
});

describe('column() tests', function () {
    it('yields the column', function () {
        util.getColumn(table, 'a').should.eql([1, 2]);
        util.getColumn(table, 'b').should.eql([2, 3]);
    });
});


function report(result) {
    if (result.length == 0) return;

    var getMaxLen = function (key) {
        var maxHeader = headers[key].length;
        var maxColumn = getColumnMaxLength(result, key);
        return Math.max(maxHeader, maxColumn);
    };

    var getChartLength = function (x) {
        var k = parseInt(x.original.ops) / maxOps;
        return Math.round(20 * k) + 1;
    };

    // headers
    var headers = {
        name: 'Name',
        ops: 'Operation per second',
        time: 'Average time'
    };

    // max operations per second value
    var maxOps = max(result.map(util.prop('ops')));

    // formatting
    result = result.map(function (x) {
        return {
            name: x.name,
            ops: util.formatNumber(x.ops) + ' ops',
            time: util.formatNumber(x.time) + ' ms',
            lastResult: x.lastResult,
            original: x
        };
    });

    // columns' widths
    var nameMaxLength = getMaxLen('name');
    var opsMaxLength = getMaxLen('ops');
    var timeMaxLength = getMaxLen('time');

    // final processing and output
    var rowSeparator = '\n';
    var cellSeparator = '    ';

    var rows = result
        .map(function (x) {
            return [
                util.pad(x.name, nameMaxLength),
                util.pad(x.ops, opsMaxLength),
                util.padLeft(x.time, timeMaxLength),
                repeat('=', getChartLength(x)) + '>'
            ].join(cellSeparator);
        });

    headers = [
        util.pad(headers.name, nameMaxLength),
        util.pad(headers.ops, opsMaxLength),
        util.padLeft(headers.time, timeMaxLength)
    ];

    var output = [];
    output.push('\n');
    output.push(headers.join(cellSeparator));
    output.push(rows.join(rowSeparator));
    output.push('\n');

    return output.join('\n');
}

module.exports = report;
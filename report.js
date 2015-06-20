var suite = require('./suite');
var formatNumber = require('./util').formatNumber;
var util = require('./util');

function report(result) {
    if (result.length == 0) return;

    var getMaxLength = function (key) {
        var headerLength = headers[key].length;

        var column = result.map(util.prop(key));
        var columnLength = column.map(util.prop('length'));
        var maxColumnLength = util.max(columnLength);

        return Math.max(headerLength, maxColumnLength);
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
    var maxOps = util.max(result.map(util.prop('ops')));

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
    var nameMaxLength = getMaxLength('name');
    var opsMaxLength = getMaxLength('ops');
    var timeMaxLength = getMaxLength('time');

    // final processing and output
    var rowSeparator = '\n';
    var cellSeparator = '    ';

    var rows = result
        .map(function (x) {
            return [
                util.pad(x.name, nameMaxLength),
                util.pad(x.ops, opsMaxLength),
                util.padLeft(x.time, timeMaxLength),
                util.repeat('=', getChartLength(x)) + '>'
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
var suite = require('./suite');
var formatNumber = require('./util').formatNumber;
var util = require('./util');

function report(result, options) {

    var getMaxLength = function (key) {
        var headerLength = headers[key].length;

        var column = result.map(util.prop(key));
        var columnLength = column.map(util.prop('length'));
        var maxColumnLength = util.max(columnLength);

        return Math.max(headerLength, maxColumnLength);
    };

    var getChartLength = function (x, maxOps) {
        var chartWidth = config.chartWidth;
        var k = x.original.ops / maxOps;
        if (isNaN(k)) {
            return chartWidth;
        }
        return Math.round(chartWidth * k);
    };

    // init

    var config = {
        chartWidth: 30
    };

    if (typeof options == 'object' ) {
        Object.keys(options).forEach(function (key) {
            config[key] = options[key];
        });
    }

    // column headers
    var headers = {
        name: 'Name',
        ops: 'Operations per second',
        time: 'Average time, ms'
    };

    // max operations per second value
    var maxOps = util.max(result.map(util.prop('ops')));

    // formatting
    result = result.map(function (x) {
        return {
            name: x.name,
            ops: util.formatNumber(x.ops),
            time: util.formatNumber(x.time),
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
                util.pad(x.time, timeMaxLength),
                util.repeat('=', getChartLength(x, maxOps)) + '>'
            ].join(cellSeparator);
        });

    headers = [
        util.pad(headers.name, nameMaxLength),
        util.pad(headers.ops, opsMaxLength),
        util.padLeft(headers.time, timeMaxLength)
    ];

    var output = [];
    output.push(headers.join(cellSeparator));
    output.push(rows.join(rowSeparator));

    return output.join('\n');
}

module.exports = report;
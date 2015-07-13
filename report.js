var suite = require('./suite');
var formatNumber = require('./utils').formatNumber;
var utils = require('./utils');
var chalk = require('chalk');

function report(result, options) {

    var getMaxLength = function (key) {
        var headerLength = headers[key].length;

        var column = result.map(utils.prop(key));
        var columnLength = column.map(utils.prop('length'));
        var maxColumnLength = utils.max(columnLength);

        return Math.max(headerLength, maxColumnLength);
    };

    var getChartLength = function (x, maxOps) {
        var chartWidth = config.chartWidth - 1;
        var k = x.original.ops / maxOps;
        if (isNaN(k)) {
            return chartWidth;
        }
        return Math.round(chartWidth * k);
    };

    // init

    var config = {
        chartWidth: 20
    };

    if (typeof options == 'object' ) {
        Object.keys(options).forEach(function (key) {
            config[key] = options[key];
        });
    }

    // column headers
    var headers = {
        name: 'Name',
        ops: 'Iterations per second',
        time: 'Average time, ms',
        chart: 'x'
    };

    // max operations per second value
    var maxOps = utils.max(result.map(utils.prop('ops')));

    // formatting
    result = result.map(function (x) {
        return {
            name: x.name,
            ops: utils.formatNumber(x.ops),
            time: utils.formatNumber(x.time),
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
    var cellSeparator = ' | ';

    var rows = result
        .map(function (x) {
            return [
                utils.pad(x.name, nameMaxLength),
                utils.pad(x.ops, opsMaxLength),
                utils.pad(x.time, timeMaxLength),
                utils.pad(utils.repeat('=', getChartLength(x, maxOps)) + '>', config.chartWidth)
            ].join(cellSeparator);
        });

    headers = [
        utils.pad(headers.name, nameMaxLength),
        utils.pad(headers.ops, opsMaxLength),
        utils.padLeft(headers.time, timeMaxLength),
        utils.pad(headers.chart, config.chartWidth)
    ];

    var prefix = '| ';
    var suffix = ' |';

    var output = [];
    var totalWidth = rows[0].length + prefix.length + suffix.length;
    var horizontalLine = '+' + utils.repeat('-', totalWidth - 2) + '+';

    output.push(horizontalLine);
    output.push(prefix + headers.join(cellSeparator) + suffix);
    output.push(horizontalLine);
    output.push(rows.map(function (x, i) {
        var color = i == 0 && 'green'
                ||  i == 1 && 'yellow'
                ||  'reset';
        x = chalk[color](x);
        return prefix + x + suffix;
    }).join(rowSeparator));
    output.push(horizontalLine);

    return output.join('\n');
}

module.exports = report;
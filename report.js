var suite = require('./suite');
var formatNumber = require('./util').formatNumber;
var util = require('./util');
var log = require('./log');

function report(result) {

    console.log(result);

    //maxOps = result.reduce (res, x) ->
    //if res == null || x.ops > res
    //    return x.ops
    //else
    //    res
    //, null
    //console.log('\ntotals', maxOps)
    //console.log '\n\n'

    var rows = [];
    result.forEach(function (x) {
        rows.push([
            util.pad(x.name, 10),
            util.pad(util.formatNumber(x.ops) + ' ops', 10),
            util.padLeft(util.formatNumber(x.time) + ' ms', 10),
            util.padLeft(String(x.lastResult), 20)
        ].join(''))
    });
    //rows = rows.map(function (x) {
    //    return util.pad(x, 10, ' ');
    //});
    log('\n');
    log(rows.join('\n'));

}

module.exports = report;
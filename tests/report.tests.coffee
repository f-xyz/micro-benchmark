proxyquire = require 'proxyquire'
suite = require '../suite'
report = require '../report'
{ formatNumber, pad, padLeft } = require '../util'

describe 'report()', ->

  it 'returns formatted report', ->

    suiteResult = [
      { name: 'test 1', ops: 100, time: 10, lastResult: 123 },
      { name: 'test 2', ops: 10,  time: 10, lastResult: 321  }
    ]

    log = report(suiteResult);

    log.should.eq '\n\n' +
      'Name      Operation per second    Average time\n' +
      'test 1    100 ops                        10 ms    =====================>\n' +
      'test 2    10 ops                         10 ms    ===>\n\n'

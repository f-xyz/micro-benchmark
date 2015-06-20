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
    log = report(suiteResult, { chartWidth: 10 });
    log.should.eq '' +
      'Name      Operations per second    Average time, ms\n' +
      'test 1    100                      10                  ==========>\n' +
      'test 2    10                       10                  =>'

  it 'return max wide chart if ops = Infinity (and time = 0)', ->
    suiteResult = [
      { name: 'test 1', ops: Infinity, time: 0, lastResult: 123 },
      { name: 'test 2', ops: 10,  time: 10, lastResult: 321  }
    ]
    log = report(suiteResult, { chartWidth: 10 });
    log.should.eq '' +
        'Name      Operations per second    Average time, ms\n' +
        'test 1    Infinity                 0                   ==========>\n' +
        'test 2    10                       10                  >'
        'test 2    10                       10                  >'

  it 'works with no config', ->
    suiteResult = [
      { name: 'test 1', ops: Infinity, time: 0, lastResult: 123 },
      { name: 'test 2', ops: 10,  time: 10, lastResult: 321  }
    ]
    log = report(suiteResult);
    log.should.eq '' +
        'Name      Operations per second    Average time, ms\n' +
        'test 1    Infinity                 0                   ==============================>\n' +
        'test 2    10                       10                  >'
        'test 2    10                       10                  >'

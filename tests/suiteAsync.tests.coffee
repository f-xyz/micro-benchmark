proxyquire = require 'proxyquire'
suiteAsync = require '../suiteAsync'

describe 'suiteAsync() tests', ->

  it 'is a function', ->
    suiteAsync.should.be.a 'function'

  describe 'benchmarks given specs', ->

    # arrange

    test1 = (cb) -> cb()
    test2 = (cb) -> cb()

    lastConfig = null

    profileAsyncMock = (fn, config, cb) ->
      lastConfig = config
      if fn == test1
        cb({
          ops: 100
          time: 10
          lastResult: 123
        })
      else if fn == test2
        cb({
          ops: 10
          time: 100
          lastResult: 321
        })
      else
        throw new RangeError('Invalid fn!');

    suiteAsync = proxyquire '../suiteAsync', { './profileAsync': profileAsyncMock }

    # action

    config = specs: [{
      name: 'test 1'
      fn: test1
    }, {
      # no name
      fn: test2
    }]

    suiteAsync config, (result) ->

      # assert

      it 'sorts result by operation by second desc.', ->
        (x.name for x in result).should.eql ['test 1', 'suite-1']

      it 'yields result of profile()', ->
        result[0].should.eql
          name: 'test 1'
          ops: 100
          time: 10
          lastResult: 123

      it 'passes config to profile()', ->
        lastConfig.should.eql config

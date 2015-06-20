proxyquire = require 'proxyquire'
suite = require '../suite'

describe 'suite() - incomplete, TBD', ->

  it 'is a function', ->
    suite.should.be.a 'function'

  describe 'benchmarks given specs', ->

    # arrange

    test1 = ->
    test2 = ->

    lastConfig = null

    profileMock = (fn, config) ->
      lastConfig = config
      if fn == test1
        ops: 100
        time: 10
        lastResult: 123
      else if fn == test2
        ops: 10
        time: 100
        lastResult: 321
      else
        throw new RangeError('Invalid fn!');

    suite = proxyquire '../suite', { './profile': profileMock }

    # action

    config = specs: [{
      name: 'test 1'
      fn: test1
    }, {
      # no name
      fn: test2
    }]

    result = suite(config)

    # assert

    it 'sorts result by operation by second desc.', ->
      (x.name for x in result).should.eql ['test 1', 'suite-0']

    it 'yields result of profile()', ->
      result[0].should.eql
        name: 'test 1'
        ops: 100
        time: 10
        lastResult: 123

    it 'passes config to profile()', ->
      lastConfig.should.eql config

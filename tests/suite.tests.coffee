proxyquire = require 'proxyquire'
suite = require '../src/suite'

describe 'suite() tests', ->

  it 'is a function', ->
    suite.should.be.a 'function'

  describe 'benchmarks given specs', ->

    # arrange

    test1 = -> 111
    test2 = -> 222

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
        throw new RangeError('`fn` param should be function. But given: ' + fn);

    suite = proxyquire '../src/suite', { './profile': profileMock }

    # action

    specs = [test1, test2]
    config = { specs }

    result = suite [test1, test2], config

    console.log result

    # assert

    it 'sorts result by operation by second desc.', ->
      (x.name for x in result).should.eql ['111', '222']

    it 'yields result of profile()', ->
      result[0].should.eql
        name: '111'
        ops: 100
        time: 10
        lastResult: 123

    it 'passes config to profile()', ->
      lastConfig.should.eql config

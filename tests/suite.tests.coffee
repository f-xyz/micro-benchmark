proxyquire = require 'proxyquire'
suite = require '../suite'
report = require '../report'
{ formatNumber, pad, padLeft } = require '../util'

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
      else
        ops: 10
        time: 100
        lastResult: 321

    suite = proxyquire '../suite', { './profile': profileMock }

    # action

    config = specs: [{
      name: 'test 1'
      fn: test1
    }, {
      name: 'test 2'
      fn: test2
    }]

    res = suite(config)

    # assert

    it 'sorts result by operation by second desc.', ->
      (x.name for x in res).should.eql ['test 1', 'test 2']

    it 'yields result of profile()', ->
      res[0].should.eql
        name: 'test 1'
        ops: 100
        time: 10
        lastResult: 123

    it 'passes config to profile()', ->
      lastConfig.should.eql config

    ######################################################33333

    describe 'report()', ->
        it '', ->
          result = suite(config)
          report(result)

    ######################################################33333

    describe 'utils tests', ->
      describe 'pad()', ->
        it 'pads string from right by spaces', ->
          pad('abc', 5, '#').should.eq('abc##')
          pad('abc', 1, '#').should.eq('abc')
        describe 'padLeft()', ->
        it 'pads string from right by spaces', ->
          padLeft('abc', 5, '#').should.eq('##abc')

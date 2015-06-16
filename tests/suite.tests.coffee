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
      res[0].result.should.eql
        ops: 100
        time: 10
        lastResult: 123

    it 'passes config to profile()', ->
      lastConfig.should.eql config

    describe 'pad()', ->


    describe 'report()', ->
      output = ''
#      console =
#        log: (args...) -> output += args.join('')

      runSuite = (config) ->
        result = suite(config)
        console.log(result)

        maxOps = result.reduce (res, x) ->
          currentItemOps = x.result.ops
          if res == null || currentItemOps > res
            return x.result.ops
          else
            res
        , null
        console.log('\ntotals', maxOps)

        console.log '\n\n'
        result.map (x) ->
          console.log(x.name)


      it '', ->
        runSuite config
        global.console.log output


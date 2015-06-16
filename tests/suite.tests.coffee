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
      res[0].should.eql
        name: 'test 1'
        ops: 100
        time: 10
        lastResult: 123

    it 'passes config to profile()', ->
      lastConfig.should.eql config

    pad = (str, n, char) ->
      if str.length < n
        pad(str + char, n, char)
      else
        str

    describe 'padString()', ->
      it 'pads string from right by spaces', ->
        pad('abc', 5, '#').should.eq('abc##')

    describe 'report()', ->

      runSuite = (config) ->
        result = suite(config)
        console.log(result)

        maxOps = result.reduce (res, x) ->
          if res == null || x.ops > res
            return x.ops
          else
            res
        , null
        console.log('\ntotals', maxOps)

        console.log '\n\n'

        formatNumber = (n) ->
          switch
            when n < 1    then n.toFixed(2)
            when n < 1000 then n.toFixed(0)
            else               n.toExponential(2)

        result.map (x) ->
          cells = [
            x.name,
            x.ops.toExponential() + ' ops',
            formatNumber(x.time) + ' ms',
            String(x.lastResult)
          ]
          cells = cells.map (x) -> pad(x, 10, ' ')
          console.log(cells.join(''))


      it '', -> runSuite config


{ suite } = require('../index')
sinon = require('sinon')

describe 'suite() - incomplete, TBD', ->

  dateNow = Date.now

  beforeEach () ->
    dateNowCalledCount = 0
    Date.now = () -> 1000*dateNowCalledCount++

  afterEach () ->
    Date.now = dateNow

  it 'is a function', -> suite.should.be.a('function')
  describe 'benchmarks given specs', ->

    res = suite({
#      setup: () ->
#      teardown: () ->
      maxOperations: 1
      duration: 1e3
      specs: [{
        name: 'test 1'
        fn: () -> [0...10000].reduce(((res) -> res + 1), 0)
      }, {
        name: 'test 2'
        fn: () -> [0...1000].reduce(((res) -> res + 1), 0)
      }]
    })

    it 'sorts result by ', ->
      res[0].name.should.eq('test 2')
      res[1].name.should.eq('test 1')
#    it 'yields result of profile() ', -> winner

#    winner

    return
    res.should.eql([
      {
        name: 'test 1'
        result: {
          lastResult: 10000
          ops: 500
          time: 2
        }
      }
      {
        name: 'test 2 async'
        result: {
          lastResult: 1000
          ops: null
          time: 0
        }
      }
    ])

  it 'yields result', ->

utils = require '../src/utils'

describe 'utils tests', ->

  describe 'configure() tests', ->
    it 'is a function', ->
      utils.configure.should.be.instanceOf Function
    it 'ignores non-object defaults arguments', ->
      utils.configure().should.eql({})
    it 'extends config with defaults', ->
      config = {}
      defaults = { a: 1 }
      res = utils.configure(config, defaults)
      res.should.eql({ a: 1 })
    it 'does not overrides existing properties', ->
      config = { a: 2 }
      defaults = { a: 1 }
      res = utils.configure(config, defaults)
      res.should.eql({ a: 2 })

  describe 'pad() tests', ->
    it 'pads string from right', ->
      utils.pad('abc', 5, '#').should.eq('abc##')
    it 'return lesser strings unchanged', ->
      utils.pad('abc', 1, '#').should.eq('abc')

  describe 'padLeft() tests', ->
    it 'pads string from left', ->
      utils.padLeft('abc', 5, '#').should.eq('##abc')
    it 'return lesser strings unchanged', ->
      utils.padLeft('abc', 1, '#').should.eq('abc')

  describe 'crop() tests', ->
    it 'crop a string if its length is exceeding', ->
      utils.crop('', 5).should.eql('')
      utils.crop('a', 5).should.eql('a')
      utils.crop('abcdef', 5).should.eql('abc...')

  describe 'formatNumber() tests', ->
    it 'returns 0 if 0 given', ->
      utils.formatNumber(0).should.eq('0')
    it 'rounds to 2 fractional digits numbers lesser than 1', ->
      utils.formatNumber(0.1234).should.eq('0.12')
      utils.formatNumber(0.129).should.eq('0.13')
    it 'rounds to integer numbers lesser than 1000', ->
      utils.formatNumber(123.4).should.eq('123')
    it 'convert to exponential form otherwise', ->
      utils.formatNumber(1234).should.eq('1.2 x 10^3')
    it 'returns not a numbers unchanged', ->
      utils.formatNumber('asd').should.eq('asd')

    describe 'prop() tests', ->
      it 'return getter function', ->
        getFirst = utils.prop(0)
        getFirst([123, 456]).should.eq(123)
      it 'works with objects too', ->
        getName = utils.prop('name')
        getName({ name: 'Donald Duck', age: 123 }).should.eq('Donald Duck')
        
    describe 'max() tests', ->
      it 'returns maximal value from array', ->
        utils.max([1, 2, 3]).should.eq(3)

    describe 'repeat() tests', ->
      it 'repeats string N times', ->
        utils.repeat('abc ', 3).should.eq('abc abc abc ')

    describe 'uniqId() tests', ->
      it 'return unique ID', ->
        utils.uniqId.reset(0)
        utils.uniqId('abc').should.eq('abc0')
        utils.uniqId('abc').should.eq('abc1')
        utils.uniqId.reset(0)

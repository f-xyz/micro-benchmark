util = require '../util'

describe 'util tests', ->

  describe 'pad() tests', ->
    it 'pads string from right', ->
      util.pad('abc', 5, '#').should.eq('abc##')
    it 'return lesser strings unchanged', ->
      util.pad('abc', 1, '#').should.eq('abc')

  describe 'padLeft() tests', ->
    it 'pads string from left', ->
      util.padLeft('abc', 5, '#').should.eq('##abc')
    it 'return lesser strings unchanged', ->
      util.padLeft('abc', 1, '#').should.eq('abc')

  describe 'formatNumber() tests', ->
    it 'returns 0 if 0 given', ->
      util.formatNumber(0).should.eq('0')
    it 'rounds to 2 fractional digits numbers lesser than 1', ->
      util.formatNumber(0.1234).should.eq('0.12')
      util.formatNumber(0.129).should.eq('0.13')
    it 'rounds to integer numbers lesser than 1000', ->
      util.formatNumber(123.4).should.eq('123')
    it 'convert to exponential form otherwise', ->
      util.formatNumber(1234).should.eq('1.2 x 10^3')
    it 'returns not a numbers unchanged', ->
      util.formatNumber('asd').should.eq('asd')

    describe 'prop() tests', ->
      it 'return getter function', ->
        getFirst = util.prop(0)
        getFirst([123, 456]).should.eq(123)
      it 'works with objects too', ->
        getName = util.prop('name')
        getName({ name: 'Donald Duck', age: 123 }).should.eq('Donald Duck')
        
    describe 'max() tests', ->
      it 'returns maximal value from array', ->
        util.max([1, 2, 3]).should.eq(3)

    describe 'repeat() tests', ->
      it 'repeats string N times', ->
        util.repeat('abc ', 3).should.eq('abc abc abc ')

    describe 'uniqId() tests', ->
      it 'return unique ID', ->
        util.uniqId('abc').should.eq('abc0')
        util.uniqId('abc').should.eq('abc1')

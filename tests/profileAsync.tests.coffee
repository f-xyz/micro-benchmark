profileAsync = require('../profileAsync')
sinon = require('sinon')

describe 'profileAsync()', () ->

  dateNow = Date.now

  beforeEach () ->
    dateNowCalledCount = 0
    Date.now = () -> 1000*dateNowCalledCount++

  afterEach () ->
    Date.now = dateNow

  it 'is a function', () ->
    profileAsync.should.be.a('function')

  it 'throws if test function is not provided', () ->
    fnThatThrows = () -> profileAsync()
    fnThatThrows.should.throw('No function to profile!')

  it 'throws if callback function is not provided', () ->
    fnThatThrows = () -> profileAsync((() -> ), null)
    fnThatThrows.should.throw('No callback function!')

  it 'calls provided function at least once', (done) ->
    spy = sinon.spy();
    fn = (cb) -> spy() || cb()
    profileAsync(fn, { operations: 0, duration: 0 }, () ->
      spy.called.should.be.true
      done())

  it 'returns average execution time', (done) ->
    spy = sinon.spy();
    fn = (cb) -> spy() || cb()
    profileAsync(fn, null, (result) ->
      result.time.should.eq(1000)
      done())

  it 'returns operations per second', (done) ->
    spy = sinon.spy();
    fn = (cb) -> spy() || cb()
    profileAsync(fn, null, (result) ->
      result.ops.should.eq(1)
      done())

  it 'returns last result', (done) ->
    spy = sinon.spy();
    fn = (cb) -> spy() || cb(123)
    profileAsync(fn, null, (result) ->
      result.lastResult.should.eq(123)
      done())

  it 'respects maxOperations option', (done) ->
    spy = sinon.spy();
    fn = (cb) -> spy() || cb()
    profileAsync(fn, { maxOperations: 20, duration: Infinity }, () ->
      spy.callCount.should.eq(20)
      done())

  it 'respects duration option', (done) ->
    spy = sinon.spy();
    fn = (cb) -> spy() || cb()
    profileAsync(fn, { maxOperations: Infinity, duration: 20e3 }, () ->
      spy.callCount.should.eq(20)
      done())

  describe 'integration tests', () ->
    it 'profiles (cb) -> setTimeout(cb, 100)', (done) ->
      this.slow(1000)
      fn = (cb) -> setTimeout(cb, 100)
      profileAsync fn, null, () -> done()
